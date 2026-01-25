import { useState, useCallback, useEffect, useRef } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import toast from 'react-hot-toast';
import {
  ConfidentialSwapClient,
  deriveEncryptionKeypair,
} from '@confidential-swap/sdk';

// Common token mints (devnet)
const TOKENS = {
  SOL: { mint: 'So11111111111111111111111111111111111111112', symbol: 'SOL', decimals: 9 },
  USDC: { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', decimals: 6 },
  USDT: { mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', symbol: 'USDT', decimals: 6 },
};

// Solver API URL (configurable via env)
const SOLVER_API_URL = process.env.NEXT_PUBLIC_SOLVER_API_URL || 'http://localhost:3001';

// Jupiter API URL
const JUPITER_QUOTE_URL = 'https://quote-api.jup.ag/v6/quote';

interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: string;
}

export default function Home() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, signAllTransactions } = useWallet();

  const [inputToken, setInputToken] = useState('SOL');
  const [outputToken, setOutputToken] = useState('USDC');
  const [inputAmount, setInputAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  // New state for solver pubkey and Jupiter quotes
  const [solverEncryptionPubkey, setSolverEncryptionPubkey] = useState<Uint8Array | null>(null);
  const [solverPubkeyLoading, setSolverPubkeyLoading] = useState(true);
  const [solverPubkeyError, setSolverPubkeyError] = useState<string | null>(null);

  const [jupiterQuote, setJupiterQuote] = useState<JupiterQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const wallet = {
    publicKey,
    signTransaction,
    signAllTransactions,
  };

  // Fetch solver encryption pubkey on mount
  useEffect(() => {
    const fetchSolverPubkey = async () => {
      setSolverPubkeyLoading(true);
      setSolverPubkeyError(null);

      try {
        const response = await fetch(`${SOLVER_API_URL}/api/solver-pubkey`);
        const data = await response.json();

        if (!data.success || !data.encryptionPubkey) {
          throw new Error(data.error || 'Failed to fetch solver pubkey');
        }

        // Parse hex string to Uint8Array
        const pubkeyBytes = new Uint8Array(Buffer.from(data.encryptionPubkey, 'hex'));
        setSolverEncryptionPubkey(pubkeyBytes);
        console.log('Solver encryption pubkey loaded:', data.encryptionPubkey);
      } catch (error: any) {
        console.error('Failed to fetch solver pubkey:', error);
        setSolverPubkeyError(error.message || 'Failed to connect to solver');
      } finally {
        setSolverPubkeyLoading(false);
      }
    };

    fetchSolverPubkey();
  }, []);

  // Fetch Jupiter quote when input changes (debounced)
  useEffect(() => {
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const inputAmountNum = parseFloat(inputAmount);
    if (!inputAmount || isNaN(inputAmountNum) || inputAmountNum <= 0) {
      setJupiterQuote(null);
      setQuoteError(null);
      return;
    }

    if (inputToken === outputToken) {
      setJupiterQuote(null);
      setQuoteError('Input and output tokens must be different');
      return;
    }

    // Debounce the API call by 500ms
    debounceRef.current = setTimeout(async () => {
      setQuoteLoading(true);
      setQuoteError(null);

      try {
        const inputTokenInfo = TOKENS[inputToken as keyof typeof TOKENS];
        const outputTokenInfo = TOKENS[outputToken as keyof typeof TOKENS];

        const inputAmountRaw = Math.floor(inputAmountNum * 10 ** inputTokenInfo.decimals);

        const params = new URLSearchParams({
          inputMint: inputTokenInfo.mint,
          outputMint: outputTokenInfo.mint,
          amount: inputAmountRaw.toString(),
          slippageBps: Math.floor(parseFloat(slippage) * 100).toString(),
        });

        const response = await fetch(`${JUPITER_QUOTE_URL}?${params}`);
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        setJupiterQuote({
          inputMint: data.inputMint,
          outputMint: data.outputMint,
          inAmount: data.inAmount,
          outAmount: data.outAmount,
          priceImpactPct: data.priceImpactPct,
        });
      } catch (error: any) {
        console.error('Failed to fetch Jupiter quote:', error);
        setQuoteError(error.message || 'Failed to fetch quote');
        setJupiterQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [inputAmount, inputToken, outputToken, slippage]);

  // Fetch user's orders
  useEffect(() => {
    if (!publicKey) return;

    const fetchOrders = async () => {
      try {
        const client = new ConfidentialSwapClient(connection, wallet);
        const userOrders = await client.getOrdersByOwner(publicKey);
        setOrders(userOrders);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      }
    };

    fetchOrders();
  }, [publicKey, connection]);

  // Format output amount for display
  const formatOutputAmount = (): string => {
    if (quoteLoading) return 'Loading...';
    if (quoteError) return 'Quote unavailable';
    if (!jupiterQuote) return 'Enter amount';

    const outputTokenInfo = TOKENS[outputToken as keyof typeof TOKENS];
    const outputAmount = parseInt(jupiterQuote.outAmount) / 10 ** outputTokenInfo.decimals;
    return `~${outputAmount.toFixed(6)} ${outputToken}`;
  };

  const handleSubmitOrder = useCallback(async () => {
    if (!publicKey || !signTransaction) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!solverEncryptionPubkey) {
      toast.error('Solver not available. Please wait or try again.');
      return;
    }

    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);

    try {
      const client = new ConfidentialSwapClient(connection, wallet);

      // Derive encryption keypair from wallet (simplified - in production use secure key derivation)
      const dummySecretKey = new Uint8Array(64);
      crypto.getRandomValues(dummySecretKey);
      client.initializeEncryption(dummySecretKey);

      // Register user's encryption pubkey with the solver
      const userEncryptionPubkey = client.getEncryptionPublicKey();
      await fetch(`${SOLVER_API_URL}/api/register-encryption-pubkey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: publicKey.toBase58(),
          encryptionPubkey: Buffer.from(userEncryptionPubkey).toString('hex'),
        }),
      });

      const inputTokenInfo = TOKENS[inputToken as keyof typeof TOKENS];
      const outputTokenInfo = TOKENS[outputToken as keyof typeof TOKENS];

      const amountBN = new BN(
        Math.floor(parseFloat(inputAmount) * 10 ** inputTokenInfo.decimals)
      );

      // Use Jupiter quote for min output, or fallback to 98% estimate
      let minOutput: BN;
      if (jupiterQuote) {
        const slippageMultiplier = 1 - parseFloat(slippage) / 100;
        minOutput = new BN(Math.floor(parseInt(jupiterQuote.outAmount) * slippageMultiplier));
      } else {
        minOutput = amountBN.mul(new BN(98)).div(new BN(100));
      }

      const slippageBps = Math.floor(parseFloat(slippage) * 100);
      const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

      // Generate unique order ID
      const orderId = new BN(Date.now());

      const tx = await client.submitOrder(
        orderId,
        new PublicKey(inputTokenInfo.mint),
        new PublicKey(outputTokenInfo.mint),
        amountBN,
        minOutput,
        slippageBps,
        deadline,
        solverEncryptionPubkey
      );

      toast.success(`Order submitted! TX: ${tx.slice(0, 8)}...`);
      setInputAmount('');

      // Refresh orders
      const userOrders = await client.getOrdersByOwner(publicKey);
      setOrders(userOrders);
    } catch (error: any) {
      console.error('Failed to submit order:', error);
      toast.error(error.message || 'Failed to submit order');
    } finally {
      setIsSubmitting(false);
    }
  }, [publicKey, signTransaction, connection, inputAmount, inputToken, outputToken, slippage, solverEncryptionPubkey, jupiterQuote]);

  const handleCancelOrder = useCallback(
    async (orderId: BN, inputMint: PublicKey) => {
      if (!publicKey) return;

      try {
        const client = new ConfidentialSwapClient(connection, wallet);
        const tx = await client.cancelOrder(orderId, inputMint);
        toast.success(`Order cancelled! TX: ${tx.slice(0, 8)}...`);

        // Refresh orders
        const userOrders = await client.getOrdersByOwner(publicKey);
        setOrders(userOrders);
      } catch (error: any) {
        toast.error(error.message || 'Failed to cancel order');
      }
    },
    [publicKey, connection]
  );

  // Determine if submit button should be disabled
  const isSubmitDisabled = !publicKey || isSubmitting || solverPubkeyLoading || !solverEncryptionPubkey;

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            Confidential Swap Router
          </h1>
          <WalletMultiButton />
        </div>

        {/* Solver Status Banner */}
        {solverPubkeyLoading && (
          <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-yellow-200 text-sm">Connecting to solver...</p>
            </div>
          </div>
        )}

        {solverPubkeyError && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-200 text-sm">
              Solver unavailable: {solverPubkeyError}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-xs text-red-300 underline"
            >
              Retry connection
            </button>
          </div>
        )}

        {/* Info Banner */}
        <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4 mb-6">
          <p className="text-purple-200 text-sm">
            Your swap details are encrypted before being sent on-chain. Only the
            solver can decrypt and execute your order, protecting you from MEV
            attacks.
          </p>
        </div>

        {/* Swap Card */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">New Swap Order</h2>

          {/* Input Token */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">You Pay</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={inputAmount}
                onChange={(e) => setInputAmount(e.target.value)}
                placeholder="0.0"
                className="flex-1 bg-slate-700 rounded-lg px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-purple-500"
              />
              <select
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                className="bg-slate-700 rounded-lg px-4 py-3 outline-none cursor-pointer"
              >
                {Object.keys(TOKENS).map((token) => (
                  <option key={token} value={token}>
                    {token}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Swap Arrow */}
          <div className="flex justify-center my-2">
            <div className="bg-slate-700 rounded-full p-2">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </div>
          </div>

          {/* Output Token */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">You Receive</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-700 rounded-lg px-4 py-3 text-lg text-gray-300 flex items-center">
                {quoteLoading ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-gray-400">Fetching quote...</span>
                  </div>
                ) : (
                  <span className={quoteError ? 'text-red-400' : ''}>{formatOutputAmount()}</span>
                )}
              </div>
              <select
                value={outputToken}
                onChange={(e) => setOutputToken(e.target.value)}
                className="bg-slate-700 rounded-lg px-4 py-3 outline-none cursor-pointer"
              >
                {Object.keys(TOKENS).map((token) => (
                  <option key={token} value={token}>
                    {token}
                  </option>
                ))}
              </select>
            </div>
            {jupiterQuote && (
              <div className="mt-2 text-xs text-gray-500">
                Price impact: {parseFloat(jupiterQuote.priceImpactPct).toFixed(4)}%
              </div>
            )}
          </div>

          {/* Slippage */}
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">
              Slippage Tolerance
            </label>
            <div className="flex gap-2">
              {['0.1', '0.5', '1.0'].map((val) => (
                <button
                  key={val}
                  onClick={() => setSlippage(val)}
                  className={`px-4 py-2 rounded-lg ${
                    slippage === val
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  {val}%
                </button>
              ))}
              <input
                type="number"
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
                className="w-20 bg-slate-700 rounded-lg px-3 py-2 text-center outline-none"
                step="0.1"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmitOrder}
            disabled={isSubmitDisabled}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-lg transition-colors"
          >
            {!publicKey
              ? 'Connect Wallet'
              : solverPubkeyLoading
              ? 'Connecting to Solver...'
              : !solverEncryptionPubkey
              ? 'Solver Unavailable'
              : isSubmitting
              ? 'Submitting...'
              : 'Submit Encrypted Order'}
          </button>
        </div>

        {/* Orders List */}
        {publicKey && orders.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Your Orders</h2>
            <div className="space-y-3">
              {orders.map((order, i) => (
                <div
                  key={i}
                  className="bg-slate-700 rounded-lg p-4 flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium">
                      Order #{order.orderId.toString()}
                    </div>
                    <div className="text-sm text-gray-400">
                      Status: {order.status}
                    </div>
                    <div className="text-sm text-gray-400">
                      Amount: {order.inputAmount.toString()}
                    </div>
                  </div>
                  {order.status === 'pending' && (
                    <button
                      onClick={() =>
                        handleCancelOrder(order.orderId, order.inputMint)
                      }
                      className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm"
                    >
                      Cancel
                    </button>
                  )}
                  {order.status === 'completed' && (
                    <span className="text-green-400">Completed</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Powered by NaCl encryption & Jupiter aggregator</p>
          <p className="mt-1">Built for Colosseum Eternal Challenge</p>
        </div>
      </div>
    </main>
  );
}
