import { useState, useCallback, useEffect, useRef } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import toast from 'react-hot-toast';
import {
  ConfidentialSwapClient,
  deriveEncryptionKeypair,
} from '@confidential-swap/sdk';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';

// Common token mints (devnet)
const TOKENS = {
  SOL: { mint: 'So11111111111111111111111111111111111111112', symbol: 'SOL', decimals: 9, icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png' },
  USDC: { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', decimals: 6, icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png' },
  USDT: { mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', symbol: 'USDT', decimals: 6, icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg' },
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

interface TokenBalance {
  symbol: string;
  balance: number;
  uiBalance: string;
}

interface TransactionRecord {
  signature: string;
  type: 'submit' | 'cancel' | 'claim';
  timestamp: Date;
  status: 'success' | 'error';
  details: string;
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

  // Token balances
  const [tokenBalances, setTokenBalances] = useState<Record<string, TokenBalance>>({});
  const [balancesLoading, setBalancesLoading] = useState(false);

  // Transaction history
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Solver pubkey and Jupiter quotes
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

  // Fetch token balances
  useEffect(() => {
    if (!publicKey) {
      setTokenBalances({});
      return;
    }

    const fetchBalances = async () => {
      setBalancesLoading(true);
      const balances: Record<string, TokenBalance> = {};

      try {
        // Fetch SOL balance
        const solBalance = await connection.getBalance(publicKey);
        balances['SOL'] = {
          symbol: 'SOL',
          balance: solBalance,
          uiBalance: (solBalance / LAMPORTS_PER_SOL).toFixed(4),
        };

        // Fetch SPL token balances
        for (const [symbol, tokenInfo] of Object.entries(TOKENS)) {
          if (symbol === 'SOL') continue;

          try {
            const tokenMint = new PublicKey(tokenInfo.mint);
            const ata = await getAssociatedTokenAddress(tokenMint, publicKey);
            const accountInfo = await getAccount(connection, ata);
            const balance = Number(accountInfo.amount);
            balances[symbol] = {
              symbol,
              balance,
              uiBalance: (balance / 10 ** tokenInfo.decimals).toFixed(4),
            };
          } catch {
            // Token account doesn't exist
            balances[symbol] = {
              symbol,
              balance: 0,
              uiBalance: '0',
            };
          }
        }

        setTokenBalances(balances);
      } catch (error) {
        console.error('Failed to fetch balances:', error);
      } finally {
        setBalancesLoading(false);
      }
    };

    fetchBalances();

    // Refresh balances every 30 seconds
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [publicKey, connection]);

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

        const pubkeyBytes = new Uint8Array(Buffer.from(data.encryptionPubkey, 'hex'));
        setSolverEncryptionPubkey(pubkeyBytes);
        toast.success('Connected to solver', { duration: 2000 });
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

  // Add transaction to history
  const addTransaction = (tx: Omit<TransactionRecord, 'timestamp'>) => {
    setTransactions((prev) => [{ ...tx, timestamp: new Date() }, ...prev].slice(0, 20));
  };

  // Set max balance
  const handleSetMax = () => {
    const balance = tokenBalances[inputToken];
    if (balance) {
      // Leave some SOL for fees
      if (inputToken === 'SOL') {
        const maxSol = Math.max(0, parseFloat(balance.uiBalance) - 0.01);
        setInputAmount(maxSol.toFixed(4));
      } else {
        setInputAmount(balance.uiBalance);
      }
    }
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

    // Check balance
    const balance = tokenBalances[inputToken];
    if (balance && parseFloat(inputAmount) > parseFloat(balance.uiBalance)) {
      toast.error(`Insufficient ${inputToken} balance`);
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Submitting order...');

    try {
      const client = new ConfidentialSwapClient(connection, wallet);

      const dummySecretKey = new Uint8Array(64);
      crypto.getRandomValues(dummySecretKey);
      client.initializeEncryption(dummySecretKey);

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

      let minOutput: BN;
      if (jupiterQuote) {
        const slippageMultiplier = 1 - parseFloat(slippage) / 100;
        minOutput = new BN(Math.floor(parseInt(jupiterQuote.outAmount) * slippageMultiplier));
      } else {
        minOutput = amountBN.mul(new BN(98)).div(new BN(100));
      }

      const slippageBps = Math.floor(parseFloat(slippage) * 100);
      const deadline = Math.floor(Date.now() / 1000) + 300;
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

      toast.success(`Order submitted successfully!`, { id: toastId, duration: 5000 });

      addTransaction({
        signature: tx,
        type: 'submit',
        status: 'success',
        details: `Swap ${inputAmount} ${inputToken} for ${outputToken}`,
      });

      setInputAmount('');

      const userOrders = await client.getOrdersByOwner(publicKey);
      setOrders(userOrders);
    } catch (error: any) {
      console.error('Failed to submit order:', error);
      toast.error(error.message || 'Failed to submit order', { id: toastId });

      addTransaction({
        signature: '',
        type: 'submit',
        status: 'error',
        details: error.message || 'Failed to submit order',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [publicKey, signTransaction, connection, inputAmount, inputToken, outputToken, slippage, solverEncryptionPubkey, jupiterQuote, tokenBalances]);

  const handleCancelOrder = useCallback(
    async (orderId: BN, inputMint: PublicKey) => {
      if (!publicKey) return;

      const toastId = toast.loading('Cancelling order...');

      try {
        const client = new ConfidentialSwapClient(connection, wallet);
        const tx = await client.cancelOrder(orderId, inputMint);

        toast.success('Order cancelled!', { id: toastId });

        addTransaction({
          signature: tx,
          type: 'cancel',
          status: 'success',
          details: `Cancelled order #${orderId.toString()}`,
        });

        const userOrders = await client.getOrdersByOwner(publicKey);
        setOrders(userOrders);
      } catch (error: any) {
        toast.error(error.message || 'Failed to cancel order', { id: toastId });
      }
    },
    [publicKey, connection]
  );

  const isSubmitDisabled = !publicKey || isSubmitting || solverPubkeyLoading || !solverEncryptionPubkey;

  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Confidential Swap
            </h1>
            <p className="text-sm text-gray-400 mt-1">MEV-protected swaps on Solana</p>
          </div>
          <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
        </div>

        {/* Wallet Balances */}
        {publicKey && (
          <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-gray-400">Your Balances</h3>
              {balancesLoading && (
                <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {Object.entries(TOKENS).map(([symbol, token]) => (
                <div key={symbol} className="bg-slate-700/50 rounded-lg p-2 sm:p-3 text-center">
                  <div className="text-xs text-gray-400">{symbol}</div>
                  <div className="text-sm sm:text-base font-medium text-white truncate">
                    {tokenBalances[symbol]?.uiBalance || '0'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Banners */}
        {solverPubkeyLoading && (
          <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-3 sm:p-4 mb-4">
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-yellow-200 text-xs sm:text-sm">Connecting to solver...</p>
            </div>
          </div>
        )}

        {solverPubkeyError && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 sm:p-4 mb-4">
            <p className="text-red-200 text-xs sm:text-sm">Solver unavailable: {solverPubkeyError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-xs text-red-300 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Info Banner */}
        <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-3 sm:p-4 mb-6">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-purple-200 text-xs sm:text-sm">
              Your swap details are encrypted. Only the solver can decrypt and execute your order, protecting you from MEV attacks.
            </p>
          </div>
        </div>

        {/* Swap Card */}
        <div className="bg-slate-800 rounded-xl p-4 sm:p-6 mb-6">
          {/* Input Token */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs sm:text-sm text-gray-400">You Pay</label>
              {publicKey && tokenBalances[inputToken] && (
                <button
                  onClick={handleSetMax}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  Max: {tokenBalances[inputToken].uiBalance}
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={inputAmount}
                onChange={(e) => setInputAmount(e.target.value)}
                placeholder="0.0"
                className="flex-1 bg-slate-700 rounded-lg px-3 sm:px-4 py-3 text-base sm:text-lg outline-none focus:ring-2 focus:ring-purple-500 min-w-0"
              />
              <select
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                className="bg-slate-700 rounded-lg px-2 sm:px-4 py-3 outline-none cursor-pointer text-sm sm:text-base"
              >
                {Object.keys(TOKENS).map((token) => (
                  <option key={token} value={token}>{token}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Swap Arrow */}
          <div className="flex justify-center my-2">
            <button
              onClick={() => {
                const temp = inputToken;
                setInputToken(outputToken);
                setOutputToken(temp);
              }}
              className="bg-slate-700 rounded-full p-2 hover:bg-slate-600 transition-colors"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>

          {/* Output Token */}
          <div className="mb-4">
            <label className="block text-xs sm:text-sm text-gray-400 mb-2">You Receive</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-700 rounded-lg px-3 sm:px-4 py-3 text-base sm:text-lg text-gray-300 flex items-center min-w-0">
                {quoteLoading ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-gray-400 text-sm">Fetching...</span>
                  </div>
                ) : (
                  <span className={`truncate ${quoteError ? 'text-red-400 text-sm' : ''}`}>
                    {formatOutputAmount()}
                  </span>
                )}
              </div>
              <select
                value={outputToken}
                onChange={(e) => setOutputToken(e.target.value)}
                className="bg-slate-700 rounded-lg px-2 sm:px-4 py-3 outline-none cursor-pointer text-sm sm:text-base"
              >
                {Object.keys(TOKENS).map((token) => (
                  <option key={token} value={token}>{token}</option>
                ))}
              </select>
            </div>
            {jupiterQuote && (
              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>Price impact: {parseFloat(jupiterQuote.priceImpactPct).toFixed(4)}%</span>
                <span>via Jupiter</span>
              </div>
            )}
          </div>

          {/* Slippage */}
          <div className="mb-6">
            <label className="block text-xs sm:text-sm text-gray-400 mb-2">Slippage Tolerance</label>
            <div className="flex flex-wrap gap-2">
              {['0.1', '0.5', '1.0'].map((val) => (
                <button
                  key={val}
                  onClick={() => setSlippage(val)}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-sm ${
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
                className="w-16 sm:w-20 bg-slate-700 rounded-lg px-2 sm:px-3 py-2 text-center outline-none text-sm"
                step="0.1"
                placeholder="%"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmitOrder}
            disabled={isSubmitDisabled}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 sm:py-4 rounded-lg transition-colors text-sm sm:text-base"
          >
            {!publicKey
              ? 'Connect Wallet'
              : solverPubkeyLoading
              ? 'Connecting...'
              : !solverEncryptionPubkey
              ? 'Solver Unavailable'
              : isSubmitting
              ? 'Submitting...'
              : 'Submit Encrypted Order'}
          </button>
        </div>

        {/* Orders & History Tabs */}
        {publicKey && (orders.length > 0 || transactions.length > 0) && (
          <div className="bg-slate-800 rounded-xl overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-700">
              <button
                onClick={() => setShowHistory(false)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  !showHistory ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Orders ({orders.length})
              </button>
              <button
                onClick={() => setShowHistory(true)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  showHistory ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                History ({transactions.length})
              </button>
            </div>

            <div className="p-4 sm:p-6">
              {!showHistory ? (
                /* Orders List */
                <div className="space-y-3">
                  {orders.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-4">No active orders</p>
                  ) : (
                    orders.map((order, i) => (
                      <div key={i} className="bg-slate-700 rounded-lg p-3 sm:p-4">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm sm:text-base truncate">
                              Order #{order.orderId.toString().slice(-8)}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-400">
                              Status:{' '}
                              <span className={
                                order.status === 'pending' ? 'text-yellow-400' :
                                order.status === 'completed' ? 'text-green-400' :
                                'text-red-400'
                              }>
                                {order.status}
                              </span>
                            </div>
                          </div>
                          {order.status === 'pending' && (
                            <button
                              onClick={() => handleCancelOrder(order.orderId, order.inputMint)}
                              className="bg-red-600/20 hover:bg-red-600/40 text-red-400 px-3 py-1.5 rounded text-xs sm:text-sm whitespace-nowrap"
                            >
                              Cancel
                            </button>
                          )}
                          {order.status === 'completed' && (
                            <span className="text-green-400 text-xs sm:text-sm">Completed</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                /* Transaction History */
                <div className="space-y-3">
                  {transactions.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-4">No transaction history</p>
                  ) : (
                    transactions.map((tx, i) => (
                      <div key={i} className="bg-slate-700 rounded-lg p-3 sm:p-4">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`inline-block w-2 h-2 rounded-full ${
                                tx.status === 'success' ? 'bg-green-400' : 'bg-red-400'
                              }`} />
                              <span className="font-medium text-sm capitalize">{tx.type}</span>
                            </div>
                            <div className="text-xs text-gray-400 mt-1 truncate">{tx.details}</div>
                          </div>
                          <div className="text-xs text-gray-500 whitespace-nowrap ml-2">
                            {tx.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                        {tx.signature && (
                          <a
                            href={`https://solscan.io/tx/${tx.signature}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-purple-400 hover:text-purple-300 mt-2 inline-block"
                          >
                            View on Solscan
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-xs sm:text-sm">
          <p>Powered by NaCl encryption & Jupiter aggregator</p>
          <p className="mt-1">Built for Colosseum Eternal Challenge</p>
        </div>
      </div>
    </main>
  );
}
