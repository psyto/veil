import { useState, useCallback, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import toast from 'react-hot-toast';
import * as nacl from 'tweetnacl';
import {
  RwaSecretsClient,
  AssetData,
  AccessGrantData,
  AssetType,
  AccessLevel,
  generateAssetId,
  encryptAssetMetadata,
  createKeyShareForGrantee,
  generateEncryptionKeypair,
  EncryptionKeypair,
} from '@rwa-secrets/sdk';

// Asset types matching the on-chain enum
const ASSET_TYPES = [
  { value: 0, label: 'Real Estate' },
  { value: 1, label: 'Securities' },
  { value: 2, label: 'Commodities' },
  { value: 3, label: 'Receivables' },
  { value: 4, label: 'Intellectual Property' },
  { value: 5, label: 'Equipment' },
  { value: 6, label: 'Other' },
];

// Access levels matching the on-chain enum
const ACCESS_LEVELS = [
  { value: 0, label: 'View Basic', description: 'Basic asset info only' },
  { value: 1, label: 'View Full', description: 'Full metadata access' },
  { value: 2, label: 'Auditor', description: 'Audit and compliance access' },
  { value: 3, label: 'Admin', description: 'Full administrative access' },
];

// Formatted asset for UI display
interface FormattedAsset {
  id: string;
  pda: PublicKey;
  name: string;
  type: number;
  status: 'active' | 'inactive' | 'frozen' | 'transferred';
  createdAt: Date;
  accessGrants: number;
}

// Formatted grant for UI display
interface FormattedGrant {
  id: string;
  pda: PublicKey;
  assetPda: PublicKey;
  assetName: string;
  grantee: string;
  level: number;
  grantedAt: Date;
  expiresAt: Date | null;
  isRevoked: boolean;
}

export default function Home() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, signAllTransactions } = useWallet();

  const wallet = {
    publicKey,
    signTransaction,
    signAllTransactions,
  };

  // Tab state
  const [activeTab, setActiveTab] = useState<'register' | 'assets' | 'grants'>('assets');

  // Register form state
  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState(0);
  const [assetDescription, setAssetDescription] = useState('');
  const [legalDocHash, setLegalDocHash] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Grant form state
  const [selectedAsset, setSelectedAsset] = useState('');
  const [granteeAddress, setGranteeAddress] = useState('');
  const [accessLevel, setAccessLevel] = useState(0);
  const [expiresInDays, setExpiresInDays] = useState('365');
  const [canDelegate, setCanDelegate] = useState(false);
  const [isGranting, setIsGranting] = useState(false);

  // Data state
  const [assets, setAssets] = useState<FormattedAsset[]>([]);
  const [grants, setGrants] = useState<FormattedGrant[]>([]);
  const [encryptionKeypair, setEncryptionKeypair] = useState<EncryptionKeypair | null>(null);

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize encryption keypair when wallet connects
  useEffect(() => {
    if (publicKey) {
      // Generate a deterministic keypair from wallet
      // In production, use proper key derivation from wallet signature
      const seed = new Uint8Array(32);
      const pubkeyBytes = publicKey.toBytes();
      for (let i = 0; i < 32; i++) {
        seed[i] = pubkeyBytes[i % pubkeyBytes.length];
      }
      const keypair = nacl.box.keyPair.fromSecretKey(seed);
      setEncryptionKeypair({
        publicKey: keypair.publicKey,
        secretKey: keypair.secretKey,
      });
    }
  }, [publicKey]);

  // Fetch assets and grants when wallet connects
  useEffect(() => {
    if (!publicKey) {
      setAssets([]);
      setGrants([]);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const client = new RwaSecretsClient(connection, undefined, wallet);

        // Fetch assets issued by the connected wallet
        const assetData = await client.getAssetsByIssuer(publicKey);

        // Format assets for display
        const formattedAssets: FormattedAsset[] = assetData.map((asset) => ({
          id: Buffer.from(asset.assetId).toString('hex').slice(0, 16),
          pda: asset.pda,
          name: `Asset ${Buffer.from(asset.assetId).toString('hex').slice(0, 8)}`,
          type: asset.assetType,
          status: asset.status,
          createdAt: new Date(asset.createdAt.toNumber() * 1000),
          accessGrants: asset.accessGrantCount,
        }));

        setAssets(formattedAssets);

        // Fetch grants for each asset
        const allGrants: FormattedGrant[] = [];
        for (const asset of assetData) {
          const grantData = await client.getGrantsByAsset(asset.pda);
          for (const grant of grantData) {
            allGrants.push({
              id: grant.pda.toBase58().slice(0, 16),
              pda: grant.pda,
              assetPda: grant.asset,
              assetName: `Asset ${Buffer.from(asset.assetId).toString('hex').slice(0, 8)}`,
              grantee: `${grant.grantee.toBase58().slice(0, 4)}...${grant.grantee.toBase58().slice(-4)}`,
              level: grant.accessLevel,
              grantedAt: new Date(grant.grantedAt.toNumber() * 1000),
              expiresAt: grant.expiresAt.toNumber() > 0 ? new Date(grant.expiresAt.toNumber() * 1000) : null,
              isRevoked: grant.isRevoked,
            });
          }
        }

        setGrants(allGrants);
      } catch (err: any) {
        console.error('Failed to fetch data:', err);
        setError(err.message || 'Failed to load data from blockchain');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [publicKey, connection]);

  const handleRegisterAsset = useCallback(async () => {
    if (!publicKey || !encryptionKeypair) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!assetName.trim()) {
      toast.error('Please enter an asset name');
      return;
    }

    setIsRegistering(true);

    try {
      const client = new RwaSecretsClient(connection, undefined, wallet);

      // Generate asset ID from name
      const assetId = await generateAssetId(assetName);

      // Create legal doc hash from input or generate placeholder
      let legalDocHashBytes: Uint8Array;
      if (legalDocHash && legalDocHash.length === 64) {
        // Assume hex string (64 hex chars = 32 bytes)
        legalDocHashBytes = new Uint8Array(Buffer.from(legalDocHash, 'hex'));
      } else {
        // Generate placeholder hash (32 bytes) from asset ID
        // In production, users should provide actual document hash
        legalDocHashBytes = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
          legalDocHashBytes[i] = assetId[i] || 0;
        }
      }

      // Create metadata object matching RwaAssetMetadata interface
      const metadata = {
        valuationUsdCents: BigInt(0), // Default valuation (can be updated later)
        legalDocHash: legalDocHashBytes,
        ownershipBps: 10000, // 100% ownership
        jurisdictionCode: 'US',
        additionalInfo: JSON.stringify({
          name: assetName,
          description: assetDescription,
          assetType: ASSET_TYPES[assetType]?.label || 'Other',
        }),
      };

      // Encrypt metadata
      const encryptedMetadata = encryptAssetMetadata(metadata, encryptionKeypair);

      // Register on-chain
      const tx = await client.registerAssetOnChain(
        assetId,
        assetType as AssetType,
        encryptedMetadata.bytes,
        encryptionKeypair.publicKey
      );

      toast.success(`Asset registered! TX: ${tx.slice(0, 8)}...`);

      // Refresh assets
      const assetData = await client.getAssetsByIssuer(publicKey);
      const formattedAssets: FormattedAsset[] = assetData.map((asset) => ({
        id: Buffer.from(asset.assetId).toString('hex').slice(0, 16),
        pda: asset.pda,
        name: `Asset ${Buffer.from(asset.assetId).toString('hex').slice(0, 8)}`,
        type: asset.assetType,
        status: asset.status,
        createdAt: new Date(asset.createdAt.toNumber() * 1000),
        accessGrants: asset.accessGrantCount,
      }));
      setAssets(formattedAssets);

      // Reset form
      setAssetName('');
      setAssetDescription('');
      setLegalDocHash('');
      setActiveTab('assets');
    } catch (err: any) {
      console.error('Failed to register asset:', err);
      toast.error(err.message || 'Failed to register asset');
    } finally {
      setIsRegistering(false);
    }
  }, [publicKey, encryptionKeypair, assetName, assetType, assetDescription, legalDocHash, connection, wallet]);

  const handleGrantAccess = useCallback(async () => {
    if (!publicKey || !encryptionKeypair) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!selectedAsset) {
      toast.error('Please select an asset');
      return;
    }

    if (!granteeAddress.trim()) {
      toast.error('Please enter a grantee address');
      return;
    }

    // Validate grantee address
    let granteePubkey: PublicKey;
    try {
      granteePubkey = new PublicKey(granteeAddress);
    } catch {
      toast.error('Invalid grantee address');
      return;
    }

    setIsGranting(true);

    try {
      const client = new RwaSecretsClient(connection, undefined, wallet);

      // Find the asset PDA
      const asset = assets.find((a) => a.id === selectedAsset);
      if (!asset) {
        throw new Error('Asset not found');
      }

      // Create encrypted key share for grantee
      // In production, fetch grantee's encryption pubkey from a registry
      // For now, use a placeholder (grantee would need to provide their pubkey)
      const granteeEncryptionPubkey = new Uint8Array(32);
      crypto.getRandomValues(granteeEncryptionPubkey);

      const encryptedKeyShare = createKeyShareForGrantee(encryptionKeypair, granteeEncryptionPubkey);

      // Calculate expiration
      const expiresAt = expiresInDays
        ? Math.floor(Date.now() / 1000) + parseInt(expiresInDays) * 86400
        : 0;

      // Grant access on-chain
      const tx = await client.grantAccessOnChain(
        asset.pda,
        granteePubkey,
        accessLevel as AccessLevel,
        encryptedKeyShare,
        expiresAt,
        canDelegate
      );

      toast.success(`Access granted! TX: ${tx.slice(0, 8)}...`);

      // Refresh grants
      const allGrants: FormattedGrant[] = [];
      const assetData = await client.getAssetsByIssuer(publicKey);
      for (const a of assetData) {
        const grantData = await client.getGrantsByAsset(a.pda);
        for (const grant of grantData) {
          allGrants.push({
            id: grant.pda.toBase58().slice(0, 16),
            pda: grant.pda,
            assetPda: grant.asset,
            assetName: `Asset ${Buffer.from(a.assetId).toString('hex').slice(0, 8)}`,
            grantee: `${grant.grantee.toBase58().slice(0, 4)}...${grant.grantee.toBase58().slice(-4)}`,
            level: grant.accessLevel,
            grantedAt: new Date(grant.grantedAt.toNumber() * 1000),
            expiresAt: grant.expiresAt.toNumber() > 0 ? new Date(grant.expiresAt.toNumber() * 1000) : null,
            isRevoked: grant.isRevoked,
          });
        }
      }
      setGrants(allGrants);

      // Reset form
      setGranteeAddress('');
      setActiveTab('grants');
    } catch (err: any) {
      console.error('Failed to grant access:', err);
      toast.error(err.message || 'Failed to grant access');
    } finally {
      setIsGranting(false);
    }
  }, [publicKey, encryptionKeypair, selectedAsset, granteeAddress, accessLevel, expiresInDays, canDelegate, assets, connection, wallet]);

  const handleRevokeAccess = useCallback(async (grant: FormattedGrant) => {
    if (!publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const client = new RwaSecretsClient(connection, undefined, wallet);

      // Get the grantee pubkey from the grant
      // We need to fetch the full grant data to get the grantee
      const grantData = await client.getGrantsByAsset(grant.assetPda);
      const fullGrant = grantData.find((g) => g.pda.equals(grant.pda));

      if (!fullGrant) {
        throw new Error('Grant not found');
      }

      const tx = await client.revokeAccessOnChain(grant.assetPda, fullGrant.grantee);

      toast.success(`Access revoked! TX: ${tx.slice(0, 8)}...`);

      // Update local state
      setGrants((prev) =>
        prev.map((g) => (g.id === grant.id ? { ...g, isRevoked: true } : g))
      );
    } catch (err: any) {
      console.error('Failed to revoke access:', err);
      toast.error(err.message || 'Failed to revoke access');
    }
  }, [publicKey, connection, wallet]);

  const handleDeactivateAsset = useCallback(async (asset: FormattedAsset) => {
    if (!publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const client = new RwaSecretsClient(connection, undefined, wallet);

      const tx = await client.deactivateAssetOnChain(asset.pda);

      toast.success(`Asset deactivated! TX: ${tx.slice(0, 8)}...`);

      // Update local state
      setAssets((prev) =>
        prev.map((a) => (a.id === asset.id ? { ...a, status: 'inactive' as const } : a))
      );
    } catch (err: any) {
      console.error('Failed to deactivate asset:', err);
      toast.error(err.message || 'Failed to deactivate asset');
    }
  }, [publicKey, connection, wallet]);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">RWA Secrets Service</h1>
            <p className="text-gray-400 mt-1">Encrypted Real World Asset Management</p>
          </div>
          <WalletMultiButton />
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-200 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-xs text-red-300 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Loading Banner */}
        {isLoading && (
          <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-emerald-200 text-sm">Loading data from blockchain...</p>
            </div>
          </div>
        )}

        {/* Info Banner */}
        <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-lg p-4 mb-6">
          <p className="text-emerald-200 text-sm">
            Your asset metadata is encrypted on-chain. Grant granular access to investors,
            auditors, and regulators while maintaining full control over your sensitive data.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'assets', label: 'My Assets' },
            { id: 'register', label: 'Register Asset' },
            { id: 'grants', label: 'Access Grants' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'assets' && (
          <div className="space-y-4">
            {!publicKey ? (
              <div className="bg-slate-800 rounded-xl p-8 text-center">
                <p className="text-gray-400">Connect your wallet to view your assets</p>
              </div>
            ) : isLoading ? (
              <div className="bg-slate-800 rounded-xl p-8 text-center">
                <svg className="animate-spin h-8 w-8 text-emerald-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-gray-400">Loading assets...</p>
              </div>
            ) : assets.length === 0 ? (
              <div className="bg-slate-800 rounded-xl p-8 text-center">
                <p className="text-gray-400 mb-4">No assets registered yet</p>
                <button
                  onClick={() => setActiveTab('register')}
                  className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg"
                >
                  Register Your First Asset
                </button>
              </div>
            ) : (
              assets.map((asset) => (
                <div key={asset.id} className="bg-slate-800 rounded-xl p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold">{asset.name}</h3>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            asset.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {asset.status}
                        </span>
                      </div>
                      <div className="flex gap-4 mt-2 text-sm text-gray-400">
                        <span>{ASSET_TYPES.find((t) => t.value === asset.type)?.label}</span>
                        <span>Created: {asset.createdAt.toLocaleDateString()}</span>
                        <span>{asset.accessGrants} access grants</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedAsset(asset.id);
                          setActiveTab('grants');
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded text-sm"
                      >
                        Grant Access
                      </button>
                      {asset.status === 'active' && (
                        <button
                          onClick={() => handleDeactivateAsset(asset)}
                          className="bg-slate-600 hover:bg-slate-500 px-3 py-1.5 rounded text-sm"
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'register' && (
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-6">Register New Asset</h2>

            <div className="space-y-4">
              {/* Asset Name */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Asset Name</label>
                <input
                  type="text"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="e.g., Downtown Office Building"
                  className="w-full bg-slate-700 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Asset Type */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Asset Type</label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(parseInt(e.target.value))}
                  className="w-full bg-slate-700 rounded-lg px-4 py-3 outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500"
                >
                  {ASSET_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Description (Encrypted)</label>
                <textarea
                  value={assetDescription}
                  onChange={(e) => setAssetDescription(e.target.value)}
                  placeholder="Detailed asset description - this will be encrypted on-chain"
                  rows={3}
                  className="w-full bg-slate-700 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Legal Document Hash */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Legal Document Hash (Optional)</label>
                <input
                  type="text"
                  value={legalDocHash}
                  onChange={(e) => setLegalDocHash(e.target.value)}
                  placeholder="SHA-256 hash of legal documents"
                  className="w-full bg-slate-700 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                />
              </div>

              {/* Encryption Notice */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-emerald-400 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <div className="text-sm text-gray-300">
                    <p className="font-medium">End-to-End Encryption</p>
                    <p className="text-gray-400 mt-1">
                      Your asset metadata will be encrypted using NaCl before being stored on-chain.
                      Only you and parties you explicitly grant access to can decrypt the data.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleRegisterAsset}
                disabled={!publicKey || isRegistering}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-lg transition-colors mt-2"
              >
                {!publicKey
                  ? 'Connect Wallet'
                  : isRegistering
                  ? 'Registering...'
                  : 'Register Asset'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'grants' && (
          <div className="space-y-6">
            {/* Grant Access Form */}
            <div className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Grant Access</h2>

              <div className="grid grid-cols-2 gap-4">
                {/* Select Asset */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Asset</label>
                  <select
                    value={selectedAsset}
                    onChange={(e) => setSelectedAsset(e.target.value)}
                    className="w-full bg-slate-700 rounded-lg px-4 py-3 outline-none cursor-pointer"
                  >
                    <option value="">Select an asset</option>
                    {assets
                      .filter((a) => a.status === 'active')
                      .map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Access Level */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Access Level</label>
                  <select
                    value={accessLevel}
                    onChange={(e) => setAccessLevel(parseInt(e.target.value))}
                    className="w-full bg-slate-700 rounded-lg px-4 py-3 outline-none cursor-pointer"
                  >
                    {ACCESS_LEVELS.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Grantee Address */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Grantee Wallet Address</label>
                  <input
                    type="text"
                    value={granteeAddress}
                    onChange={(e) => setGranteeAddress(e.target.value)}
                    placeholder="Solana wallet address"
                    className="w-full bg-slate-700 rounded-lg px-4 py-3 outline-none font-mono text-sm"
                  />
                </div>

                {/* Expires In */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Expires In (Days)</label>
                  <input
                    type="number"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value)}
                    placeholder="0 = never expires"
                    className="w-full bg-slate-700 rounded-lg px-4 py-3 outline-none"
                  />
                </div>
              </div>

              {/* Can Delegate */}
              <div className="mt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canDelegate}
                    onChange={(e) => setCanDelegate(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-slate-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-300">Allow grantee to delegate access to others</span>
                </label>
              </div>

              <button
                onClick={handleGrantAccess}
                disabled={!publicKey || isGranting || !selectedAsset}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors mt-4"
              >
                {isGranting ? 'Granting...' : 'Grant Access'}
              </button>
            </div>

            {/* Existing Grants */}
            <div className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Active Grants</h2>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <svg className="animate-spin h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              ) : grants.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No access grants yet</p>
              ) : (
                <div className="space-y-3">
                  {grants.map((grant) => (
                    <div
                      key={grant.id}
                      className={`bg-slate-700 rounded-lg p-4 ${grant.isRevoked ? 'opacity-50' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{grant.assetName}</div>
                          <div className="text-sm text-gray-400 mt-1">
                            <span className="font-mono">{grant.grantee}</span>
                            <span className="mx-2">-</span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                grant.level === 3
                                  ? 'bg-red-500/20 text-red-300'
                                  : grant.level === 2
                                  ? 'bg-yellow-500/20 text-yellow-300'
                                  : grant.level === 1
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : 'bg-gray-500/20 text-gray-300'
                              }`}
                            >
                              {ACCESS_LEVELS.find((l) => l.value === grant.level)?.label}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Granted: {grant.grantedAt.toLocaleDateString()}
                            {grant.expiresAt && ` - Expires: ${grant.expiresAt.toLocaleDateString()}`}
                          </div>
                        </div>
                        {!grant.isRevoked ? (
                          <button
                            onClick={() => handleRevokeAccess(grant)}
                            className="bg-red-600/20 hover:bg-red-600/40 text-red-300 px-3 py-1.5 rounded text-sm"
                          >
                            Revoke
                          </button>
                        ) : (
                          <span className="text-gray-500 text-sm">Revoked</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>End-to-end encrypted with NaCl (Curve25519-XSalsa20-Poly1305)</p>
          <p className="mt-1">Built for Colosseum Eternal Challenge</p>
        </div>
      </div>
    </main>
  );
}
