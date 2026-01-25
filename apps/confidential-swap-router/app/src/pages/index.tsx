import { useState, useCallback, useEffect } from 'react';
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

// Placeholder solver encryption pubkey (would be fetched from on-chain)
const SOLVER_ENCRYPTION_PUBKEY = new Uint8Array(32).fill(0);

export default function Home() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, signAllTransactions } = useWallet();

  const [inputToken, setInputToken] = useState('SOL');
  const [outputToken, setOutputToken] = useState('USDC');
  const [inputAmount, setInputAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  const wallet = {
    publicKey,
    signTransaction,
    signAllTransactions,
  };

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

  const handleSubmitOrder = useCallback(async () => {
    if (!publicKey || !signTransaction) {
      toast.error('Please connect your wallet');
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
      // This is a placeholder - in production you'd use the actual wallet secret key
      const dummySecretKey = new Uint8Array(64);
      crypto.getRandomValues(dummySecretKey);
      client.initializeEncryption(dummySecretKey);

      const inputTokenInfo = TOKENS[inputToken as keyof typeof TOKENS];
      const outputTokenInfo = TOKENS[outputToken as keyof typeof TOKENS];

      const amountBN = new BN(
        Math.floor(parseFloat(inputAmount) * 10 ** inputTokenInfo.decimals)
      );

      // Estimated min output (would be fetched from Jupiter in production)
      const estimatedOutput = amountBN.mul(new BN(98)).div(new BN(100));

      const slippageBps = Math.floor(parseFloat(slippage) * 100);
      const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

      // Generate unique order ID
      const orderId = new BN(Date.now());

      const tx = await client.submitOrder(
        orderId,
        new PublicKey(inputTokenInfo.mint),
        new PublicKey(outputTokenInfo.mint),
        amountBN,
        estimatedOutput,
        slippageBps,
        deadline,
        SOLVER_ENCRYPTION_PUBKEY
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
  }, [publicKey, signTransaction, connection, inputAmount, inputToken, outputToken, slippage]);

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
              <div className="flex-1 bg-slate-700 rounded-lg px-4 py-3 text-lg text-gray-400">
                Estimated after execution
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
            disabled={!publicKey || isSubmitting}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-lg transition-colors"
          >
            {!publicKey
              ? 'Connect Wallet'
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
