'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { TierDisplay } from '@/components/TierDisplay';
import { SwapInterface } from '@/components/SwapInterface';
import { Stats } from '@/components/Stats';

export default function Home() {
  const { connected } = useWallet();

  return (
    <main className="min-h-screen p-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500" />
          <h1 className="text-2xl font-bold">Umbra</h1>
        </div>
        <WalletMultiButton />
      </header>

      {/* Hero */}
      {!connected && (
        <div className="text-center py-20">
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Reputation-Gated Privacy DeFi
          </h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Stop losing money to MEV bots. Earn privacy and lower fees through your on-chain reputation.
          </p>
          <div className="flex justify-center gap-4">
            <WalletMultiButton />
          </div>

          {/* Tier Preview */}
          <div className="mt-16 grid grid-cols-5 gap-4 max-w-4xl mx-auto">
            {[
              { name: 'None', fee: '0.50%', color: 'gray' },
              { name: 'Bronze', fee: '0.30%', color: 'amber' },
              { name: 'Silver', fee: '0.15%', color: 'slate' },
              { name: 'Gold', fee: '0.08%', color: 'yellow' },
              { name: 'Diamond', fee: '0.05%', color: 'cyan' },
            ].map((tier) => (
              <div
                key={tier.name}
                className={`p-4 rounded-lg border border-${tier.color}-500/30 bg-${tier.color}-500/10`}
              >
                <div className={`text-${tier.color}-400 font-semibold`}>{tier.name}</div>
                <div className="text-2xl font-bold mt-1">{tier.fee}</div>
                <div className="text-xs text-gray-500 mt-1">trading fee</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connected View */}
      {connected && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Tier Display */}
          <div className="lg:col-span-1">
            <TierDisplay />
          </div>

          {/* Center: Swap Interface */}
          <div className="lg:col-span-1">
            <SwapInterface />
          </div>

          {/* Right: Stats */}
          <div className="lg:col-span-1">
            <Stats />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-20 text-center text-gray-500 text-sm">
        <p>Powered by FairScale FairScore</p>
        <p className="mt-2">Built for the FairScale Hackathon 2026</p>
      </footer>
    </main>
  );
}
