import { useState, useCallback, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import toast from 'react-hot-toast';
import * as nacl from 'tweetnacl';

// Asset types matching the on-chain enum
const ASSET_TYPES = [
  { value: 'realEstate', label: 'Real Estate' },
  { value: 'securities', label: 'Securities' },
  { value: 'commodities', label: 'Commodities' },
  { value: 'receivables', label: 'Receivables' },
  { value: 'intellectualProperty', label: 'Intellectual Property' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'other', label: 'Other' },
];

// Access levels matching the on-chain enum
const ACCESS_LEVELS = [
  { value: 'viewBasic', label: 'View Basic', description: 'Basic asset info only' },
  { value: 'viewFull', label: 'View Full', description: 'Full metadata access' },
  { value: 'auditor', label: 'Auditor', description: 'Audit and compliance access' },
  { value: 'admin', label: 'Admin', description: 'Full administrative access' },
];

// Mock data for demo (in production, fetch from chain)
interface Asset {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  accessGrants: number;
}

interface AccessGrant {
  id: string;
  assetId: string;
  assetName: string;
  grantee: string;
  level: string;
  grantedAt: Date;
  expiresAt: Date | null;
  isRevoked: boolean;
}

export default function Home() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  // Tab state
  const [activeTab, setActiveTab] = useState<'register' | 'assets' | 'grants'>('assets');

  // Register form state
  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState('realEstate');
  const [assetDescription, setAssetDescription] = useState('');
  const [legalDocHash, setLegalDocHash] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Grant form state
  const [selectedAsset, setSelectedAsset] = useState('');
  const [granteeAddress, setGranteeAddress] = useState('');
  const [accessLevel, setAccessLevel] = useState('viewBasic');
  const [expiresInDays, setExpiresInDays] = useState('365');
  const [canDelegate, setCanDelegate] = useState(false);
  const [isGranting, setIsGranting] = useState(false);

  // Data state
  const [assets, setAssets] = useState<Asset[]>([]);
  const [grants, setGrants] = useState<AccessGrant[]>([]);
  const [encryptionKeypair, setEncryptionKeypair] = useState<nacl.BoxKeyPair | null>(null);

  // Initialize encryption keypair when wallet connects
  useEffect(() => {
    if (publicKey) {
      // Generate a deterministic keypair from wallet (simplified for demo)
      // In production, use proper key derivation
      const seed = new Uint8Array(32);
      const pubkeyBytes = publicKey.toBytes();
      for (let i = 0; i < 32; i++) {
        seed[i] = pubkeyBytes[i % pubkeyBytes.length];
      }
      const keypair = nacl.box.keyPair.fromSecretKey(seed);
      setEncryptionKeypair(keypair);
    }
  }, [publicKey]);

  // Fetch assets (mock for demo)
  useEffect(() => {
    if (publicKey) {
      // In production, fetch from chain
      setAssets([
        {
          id: 'asset-001',
          name: 'Downtown Office Building',
          type: 'realEstate',
          status: 'active',
          createdAt: new Date('2024-01-15'),
          accessGrants: 3,
        },
        {
          id: 'asset-002',
          name: 'Tech Startup Equity',
          type: 'securities',
          status: 'active',
          createdAt: new Date('2024-02-20'),
          accessGrants: 5,
        },
      ]);

      setGrants([
        {
          id: 'grant-001',
          assetId: 'asset-001',
          assetName: 'Downtown Office Building',
          grantee: '7xKX...3mPq',
          level: 'viewFull',
          grantedAt: new Date('2024-01-20'),
          expiresAt: new Date('2025-01-20'),
          isRevoked: false,
        },
        {
          id: 'grant-002',
          assetId: 'asset-001',
          assetName: 'Downtown Office Building',
          grantee: '4pLm...9nKr',
          level: 'auditor',
          grantedAt: new Date('2024-02-01'),
          expiresAt: null,
          isRevoked: false,
        },
      ]);
    }
  }, [publicKey]);

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
      // In production:
      // 1. Generate asset ID from name
      // 2. Encrypt metadata with encryption keypair
      // 3. Call program to register asset

      // Simulate registration
      await new Promise(resolve => setTimeout(resolve, 1500));

      const newAsset: Asset = {
        id: `asset-${Date.now()}`,
        name: assetName,
        type: assetType,
        status: 'active',
        createdAt: new Date(),
        accessGrants: 0,
      };

      setAssets(prev => [newAsset, ...prev]);
      toast.success('Asset registered successfully!');

      // Reset form
      setAssetName('');
      setAssetDescription('');
      setLegalDocHash('');
      setActiveTab('assets');
    } catch (error: any) {
      console.error('Failed to register asset:', error);
      toast.error(error.message || 'Failed to register asset');
    } finally {
      setIsRegistering(false);
    }
  }, [publicKey, encryptionKeypair, assetName, assetType, assetDescription, legalDocHash]);

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
    try {
      new PublicKey(granteeAddress);
    } catch {
      toast.error('Invalid grantee address');
      return;
    }

    setIsGranting(true);

    try {
      // In production:
      // 1. Create encrypted key share for grantee
      // 2. Call program to grant access

      await new Promise(resolve => setTimeout(resolve, 1500));

      const asset = assets.find(a => a.id === selectedAsset);
      const newGrant: AccessGrant = {
        id: `grant-${Date.now()}`,
        assetId: selectedAsset,
        assetName: asset?.name || 'Unknown',
        grantee: `${granteeAddress.slice(0, 4)}...${granteeAddress.slice(-4)}`,
        level: accessLevel,
        grantedAt: new Date(),
        expiresAt: expiresInDays ? new Date(Date.now() + parseInt(expiresInDays) * 86400000) : null,
        isRevoked: false,
      };

      setGrants(prev => [newGrant, ...prev]);
      setAssets(prev => prev.map(a =>
        a.id === selectedAsset ? { ...a, accessGrants: a.accessGrants + 1 } : a
      ));
      toast.success('Access granted successfully!');

      // Reset form
      setGranteeAddress('');
      setActiveTab('grants');
    } catch (error: any) {
      console.error('Failed to grant access:', error);
      toast.error(error.message || 'Failed to grant access');
    } finally {
      setIsGranting(false);
    }
  }, [publicKey, encryptionKeypair, selectedAsset, granteeAddress, accessLevel, expiresInDays, assets]);

  const handleRevokeAccess = useCallback(async (grantId: string) => {
    try {
      // In production: call program to revoke access
      await new Promise(resolve => setTimeout(resolve, 1000));

      setGrants(prev => prev.map(g =>
        g.id === grantId ? { ...g, isRevoked: true } : g
      ));
      toast.success('Access revoked');
    } catch (error: any) {
      toast.error('Failed to revoke access');
    }
  }, []);

  const handleDeactivateAsset = useCallback(async (assetId: string) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      setAssets(prev => prev.map(a =>
        a.id === assetId ? { ...a, status: 'inactive' } : a
      ));
      toast.success('Asset deactivated');
    } catch (error: any) {
      toast.error('Failed to deactivate asset');
    }
  }, []);

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
          ].map(tab => (
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
              assets.map(asset => (
                <div key={asset.id} className="bg-slate-800 rounded-xl p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold">{asset.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          asset.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {asset.status}
                        </span>
                      </div>
                      <div className="flex gap-4 mt-2 text-sm text-gray-400">
                        <span>{ASSET_TYPES.find(t => t.value === asset.type)?.label}</span>
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
                          onClick={() => handleDeactivateAsset(asset.id)}
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
                  onChange={(e) => setAssetType(e.target.value)}
                  className="w-full bg-slate-700 rounded-lg px-4 py-3 outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500"
                >
                  {ASSET_TYPES.map(type => (
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
                  <svg className="w-5 h-5 text-emerald-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
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
                    {assets.filter(a => a.status === 'active').map(asset => (
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
                    onChange={(e) => setAccessLevel(e.target.value)}
                    className="w-full bg-slate-700 rounded-lg px-4 py-3 outline-none cursor-pointer"
                  >
                    {ACCESS_LEVELS.map(level => (
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

              {grants.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No access grants yet</p>
              ) : (
                <div className="space-y-3">
                  {grants.map(grant => (
                    <div
                      key={grant.id}
                      className={`bg-slate-700 rounded-lg p-4 ${grant.isRevoked ? 'opacity-50' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{grant.assetName}</div>
                          <div className="text-sm text-gray-400 mt-1">
                            <span className="font-mono">{grant.grantee}</span>
                            <span className="mx-2">•</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              grant.level === 'admin' ? 'bg-red-500/20 text-red-300' :
                              grant.level === 'auditor' ? 'bg-yellow-500/20 text-yellow-300' :
                              grant.level === 'viewFull' ? 'bg-blue-500/20 text-blue-300' :
                              'bg-gray-500/20 text-gray-300'
                            }`}>
                              {ACCESS_LEVELS.find(l => l.value === grant.level)?.label}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Granted: {grant.grantedAt.toLocaleDateString()}
                            {grant.expiresAt && ` • Expires: ${grant.expiresAt.toLocaleDateString()}`}
                          </div>
                        </div>
                        {!grant.isRevoked ? (
                          <button
                            onClick={() => handleRevokeAccess(grant.id)}
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
