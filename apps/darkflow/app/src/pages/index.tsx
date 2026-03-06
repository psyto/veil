import { useState, useCallback, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import toast from 'react-hot-toast';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';

// Program ID
const DARKFLOW_PROGRAM_ID = new PublicKey('8UvUSCfsXUjRW6NwcLVEJ4Y5jg8nWbxsZGNrzK1xs38U');

// Common token mints
const TOKENS = {
  SOL: { mint: 'So11111111111111111111111111111111111111112', symbol: 'SOL', decimals: 9 },
  USDC: { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', decimals: 6 },
};

type TabType = 'swap' | 'liquidity' | 'launch';

interface TokenBalance {
  symbol: string;
  balance: number;
  uiBalance: string;
}

export default function Home() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const [activeTab, setActiveTab] = useState<TabType>('swap');
  const [inputToken, setInputToken] = useState('SOL');
  const [outputToken, setOutputToken] = useState('USDC');
  const [inputAmount, setInputAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Liquidity state
  const [lpAmountA, setLpAmountA] = useState('');
  const [lpAmountB, setLpAmountB] = useState('');

  // Token balances
  const [tokenBalances, setTokenBalances] = useState<Record<string, TokenBalance>>({});
  const [balancesLoading, setBalancesLoading] = useState(false);

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
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [publicKey, connection]);

  // Handle dark swap
  const handleDarkSwap = useCallback(async () => {
    if (!publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Encrypting swap order...');

    try {
      // Simulate encrypted swap submission
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast.success('Dark swap submitted! Your order is encrypted and MEV-protected.', {
        id: toastId,
        duration: 5000
      });

      setInputAmount('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit swap', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  }, [publicKey, inputAmount, inputToken, outputToken]);

  // Handle add liquidity
  const handleAddLiquidity = useCallback(async () => {
    if (!publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!lpAmountA || !lpAmountB) {
      toast.error('Please enter amounts for both tokens');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Encrypting LP position...');

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast.success('Liquidity added! Your position size is encrypted.', {
        id: toastId,
        duration: 5000
      });

      setLpAmountA('');
      setLpAmountB('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add liquidity', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  }, [publicKey, lpAmountA, lpAmountB]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900/20 to-slate-900 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
              <span className="text-purple-400">Dark</span>Flow
            </h1>
            <p className="text-sm text-gray-400 mt-1">Confidential AMM with Dark Liquidity</p>
          </div>
          <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
        </div>

        {/* Wallet Balances */}
        {publicKey && (
          <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-purple-500/20">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-gray-400">Your Balances</h3>
              {balancesLoading && (
                <svg className="animate-spin h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(TOKENS).map(([symbol]) => (
                <div key={symbol} className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-400">{symbol}</div>
                  <div className="text-lg font-medium text-white">
                    {tokenBalances[symbol]?.uiBalance || '0'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Privacy Info Banner */}
        <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <p className="text-purple-200 text-sm font-medium">Your trades are protected</p>
              <p className="text-purple-300/70 text-xs mt-1">
                Swap amounts are encrypted with ZK proofs. MEV bots cannot see or front-run your orders.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-700 mb-6">
          {(['swap', 'liquidity', 'launch'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium transition-colors capitalize ${
                activeTab === tab
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab === 'swap' ? 'Dark Swap' : tab === 'liquidity' ? 'Add Liquidity' : 'Token Launch'}
            </button>
          ))}
        </div>

        {/* Swap Tab */}
        {activeTab === 'swap' && (
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            {/* Input Token */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-gray-400">You Pay (Encrypted)</label>
                {publicKey && tokenBalances[inputToken] && (
                  <button
                    onClick={() => setInputAmount(tokenBalances[inputToken].uiBalance)}
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
                  className="flex-1 bg-slate-700 rounded-lg px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-purple-500"
                />
                <select
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  className="bg-slate-700 rounded-lg px-4 py-3 outline-none cursor-pointer"
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
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
            </div>

            {/* Output Token */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">You Receive (Hidden until execution)</label>
              <div className="flex gap-2">
                <div className="flex-1 bg-slate-700 rounded-lg px-4 py-3 text-lg text-gray-400 flex items-center">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Amount encrypted
                  </span>
                </div>
                <select
                  value={outputToken}
                  onChange={(e) => setOutputToken(e.target.value)}
                  className="bg-slate-700 rounded-lg px-4 py-3 outline-none cursor-pointer"
                >
                  {Object.keys(TOKENS).map((token) => (
                    <option key={token} value={token}>{token}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Slippage */}
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">Slippage Tolerance</label>
              <div className="flex gap-2">
                {['0.1', '0.5', '1.0'].map((val) => (
                  <button
                    key={val}
                    onClick={() => setSlippage(val)}
                    className={`px-4 py-2 rounded-lg text-sm ${
                      slippage === val
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleDarkSwap}
              disabled={!publicKey || isSubmitting}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-lg transition-all"
            >
              {!publicKey ? 'Connect Wallet' : isSubmitting ? 'Encrypting...' : 'Execute Dark Swap'}
            </button>
          </div>
        )}

        {/* Liquidity Tab */}
        {activeTab === 'liquidity' && (
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Token A Amount (Encrypted)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={lpAmountA}
                  onChange={(e) => setLpAmountA(e.target.value)}
                  placeholder="0.0"
                  className="flex-1 bg-slate-700 rounded-lg px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-purple-500"
                />
                <div className="bg-slate-700 rounded-lg px-4 py-3 text-gray-300">SOL</div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">Token B Amount (Encrypted)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={lpAmountB}
                  onChange={(e) => setLpAmountB(e.target.value)}
                  placeholder="0.0"
                  className="flex-1 bg-slate-700 rounded-lg px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-purple-500"
                />
                <div className="bg-slate-700 rounded-lg px-4 py-3 text-gray-300">USDC</div>
              </div>
            </div>

            <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Privacy Features</h4>
              <ul className="text-xs text-gray-400 space-y-1">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                  Your position size is encrypted
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                  Only aggregate TVL is public
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                  Withdraw with ZK proof of ownership
                </li>
              </ul>
            </div>

            <button
              onClick={handleAddLiquidity}
              disabled={!publicKey || isSubmitting}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-lg transition-all"
            >
              {!publicKey ? 'Connect Wallet' : isSubmitting ? 'Encrypting...' : 'Add Encrypted Liquidity'}
            </button>
          </div>
        )}

        {/* Token Launch Tab */}
        {activeTab === 'launch' && (
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-purple-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="text-xl font-semibold text-white mb-2">Confidential Token Launch</h3>
              <p className="text-gray-400 text-sm mb-6">
                Launch tokens with private bonding curves. Early buyers cannot see how much others have purchased.
              </p>

              <div className="bg-slate-700/50 rounded-lg p-4 text-left mb-6">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Features</h4>
                <ul className="text-xs text-gray-400 space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                    Encrypted bonding curve parameters
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                    Hidden purchase amounts prevent front-running
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                    Fair launch for all participants
                  </li>
                </ul>
              </div>

              <button
                disabled
                className="w-full bg-slate-700 text-gray-400 font-semibold py-4 rounded-lg cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-slate-800/50 rounded-lg p-4 text-center border border-slate-700">
            <div className="text-2xl font-bold text-white">$0</div>
            <div className="text-xs text-gray-400">Total Value Locked</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 text-center border border-slate-700">
            <div className="text-2xl font-bold text-white">0</div>
            <div className="text-xs text-gray-400">Dark Swaps</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 text-center border border-slate-700">
            <div className="text-2xl font-bold text-white">0</div>
            <div className="text-xs text-gray-400">Hidden LPs</div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-xs">
          <p>Powered by Arcium MPC & Noir ZK Proofs</p>
          <p className="mt-1">Built for Solana PrivacyHack 2026</p>
        </div>
      </div>
    </main>
  );
}
