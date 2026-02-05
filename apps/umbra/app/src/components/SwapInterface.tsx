'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

const TOKENS = [
  { symbol: 'SOL', name: 'Solana', icon: 'S' },
  { symbol: 'USDC', name: 'USD Coin', icon: '$' },
  { symbol: 'USDT', name: 'Tether', icon: 'T' },
  { symbol: 'RAY', name: 'Raydium', icon: 'R' },
];

export function SwapInterface() {
  const { connected } = useWallet();
  const [inputToken, setInputToken] = useState(TOKENS[1]); // USDC
  const [outputToken, setOutputToken] = useState(TOKENS[0]); // SOL
  const [inputAmount, setInputAmount] = useState('');
  const [outputAmount, setOutputAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');

  // Mock fee based on tier
  const feeBps = 15; // Silver tier
  const feePercent = feeBps / 100;

  const handleSwap = async () => {
    if (!connected) return;
    console.log('Swap:', {
      input: inputToken.symbol,
      output: outputToken.symbol,
      amount: inputAmount,
    });
    // In production, this would call the UmbraClient
  };

  return (
    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Swap</h2>
        <button className="text-gray-400 hover:text-white text-sm">
          Settings
        </button>
      </div>

      {/* Input Token */}
      <div className="bg-white/5 rounded-xl p-4 mb-2">
        <div className="flex justify-between mb-2">
          <span className="text-gray-400 text-sm">You pay</span>
          <span className="text-gray-400 text-sm">Balance: 0.00</span>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="number"
            value={inputAmount}
            onChange={(e) => setInputAmount(e.target.value)}
            placeholder="0.00"
            className="flex-1 bg-transparent text-2xl font-semibold outline-none"
          />
          <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg">
            <span className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-sm">
              {inputToken.icon}
            </span>
            <span>{inputToken.symbol}</span>
          </button>
        </div>
      </div>

      {/* Swap Arrow */}
      <div className="flex justify-center -my-2 relative z-10">
        <button
          onClick={() => {
            setInputToken(outputToken);
            setOutputToken(inputToken);
          }}
          className="w-10 h-10 bg-purple-500 hover:bg-purple-600 rounded-full flex items-center justify-center"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
        </button>
      </div>

      {/* Output Token */}
      <div className="bg-white/5 rounded-xl p-4 mt-2">
        <div className="flex justify-between mb-2">
          <span className="text-gray-400 text-sm">You receive</span>
          <span className="text-gray-400 text-sm">Balance: 0.00</span>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="number"
            value={outputAmount}
            readOnly
            placeholder="0.00"
            className="flex-1 bg-transparent text-2xl font-semibold outline-none"
          />
          <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg">
            <span className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-sm">
              {outputToken.icon}
            </span>
            <span>{outputToken.symbol}</span>
          </button>
        </div>
      </div>

      {/* Swap Details */}
      <div className="mt-4 p-3 bg-white/5 rounded-lg space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Your Fee (Silver)</span>
          <span className="text-green-400">{feePercent}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">MEV Protection</span>
          <span className="text-cyan-400">Full</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Slippage</span>
          <span>{slippage}%</span>
        </div>
      </div>

      {/* Swap Button */}
      <button
        onClick={handleSwap}
        disabled={!connected || !inputAmount}
        className="w-full mt-6 py-4 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-all"
      >
        {!connected ? 'Connect Wallet' : 'Swap'}
      </button>

      {/* MEV Protection Notice */}
      <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
        <svg className="w-4 h-4 text-cyan-500" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <span>Your order is encrypted and MEV-protected</span>
      </div>
    </div>
  );
}
