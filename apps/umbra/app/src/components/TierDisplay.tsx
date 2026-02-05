'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';

interface TierInfo {
  fairscore: number;
  tier: number;
  tierName: string;
  feeBps: number;
  mevProtection: string;
  orderTypes: string[];
}

const TIER_COLORS: Record<string, string> = {
  None: 'gray',
  Bronze: 'amber',
  Silver: 'slate',
  Gold: 'yellow',
  Diamond: 'cyan',
};

export function TierDisplay() {
  const { publicKey } = useWallet();
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTierInfo() {
      if (!publicKey) return;

      setLoading(true);
      try {
        // In production, this would fetch from FairScale API
        // For demo, we'll use mock data based on wallet address
        const mockScore = Math.abs(publicKey.toBuffer()[0]) % 100;

        let tier: number;
        let tierName: string;
        let feeBps: number;
        let mevProtection: string;
        let orderTypes: string[];

        if (mockScore >= 80) {
          tier = 4;
          tierName = 'Diamond';
          feeBps = 5;
          mevProtection = 'Priority';
          orderTypes = ['Market', 'Limit', 'TWAP', 'Iceberg', 'Dark'];
        } else if (mockScore >= 60) {
          tier = 3;
          tierName = 'Gold';
          feeBps = 8;
          mevProtection = 'Priority';
          orderTypes = ['Market', 'Limit', 'TWAP', 'Iceberg'];
        } else if (mockScore >= 40) {
          tier = 2;
          tierName = 'Silver';
          feeBps = 15;
          mevProtection = 'Full';
          orderTypes = ['Market', 'Limit', 'TWAP'];
        } else if (mockScore >= 20) {
          tier = 1;
          tierName = 'Bronze';
          feeBps = 30;
          mevProtection = 'Basic';
          orderTypes = ['Market', 'Limit'];
        } else {
          tier = 0;
          tierName = 'None';
          feeBps = 50;
          mevProtection = 'None';
          orderTypes = ['Market'];
        }

        setTierInfo({
          fairscore: mockScore,
          tier,
          tierName,
          feeBps,
          mevProtection,
          orderTypes,
        });
      } catch (error) {
        console.error('Error fetching tier info:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTierInfo();
  }, [publicKey]);

  if (loading) {
    return (
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <div className="animate-pulse">
          <div className="h-8 bg-white/10 rounded w-1/2 mb-4"></div>
          <div className="h-24 bg-white/10 rounded mb-4"></div>
          <div className="h-4 bg-white/10 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!tierInfo) return null;

  const color = TIER_COLORS[tierInfo.tierName];

  return (
    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
      <h2 className="text-lg font-semibold mb-4">Your Tier</h2>

      {/* FairScore */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">FairScore</span>
          <span className="text-2xl font-bold">{tierInfo.fairscore}</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full bg-${color}-500 transition-all duration-500`}
            style={{ width: `${tierInfo.fairscore}%` }}
          />
        </div>
      </div>

      {/* Tier Badge */}
      <div
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border tier-${tierInfo.tierName.toLowerCase()} mb-6`}
      >
        <span className="text-lg font-bold">{tierInfo.tierName}</span>
        <span className="text-sm opacity-70">Tier {tierInfo.tier}</span>
      </div>

      {/* Benefits */}
      <div className="space-y-4">
        <div className="flex justify-between">
          <span className="text-gray-400">Trading Fee</span>
          <span className="font-semibold">{tierInfo.feeBps / 100}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">MEV Protection</span>
          <span className="font-semibold">{tierInfo.mevProtection}</span>
        </div>
        <div>
          <span className="text-gray-400 block mb-2">Order Types</span>
          <div className="flex flex-wrap gap-2">
            {tierInfo.orderTypes.map((type) => (
              <span
                key={type}
                className="px-2 py-1 bg-white/10 rounded text-sm"
              >
                {type}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Upgrade hint */}
      {tierInfo.tier < 4 && (
        <div className="mt-6 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
          <p className="text-sm text-purple-300">
            Increase your FairScore to unlock lower fees and more features!
          </p>
        </div>
      )}
    </div>
  );
}
