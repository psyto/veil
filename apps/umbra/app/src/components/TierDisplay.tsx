'use client';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import {
  SovereignIdentity,
  fetchSovereignIdentity,
  createSovereignIdentity,
  getTierName,
  getTierColor,
  getFeeBps,
  getMevProtection,
  getOrderTypes,
  getMaxOrderSize,
} from '@/lib/sovereign';

interface TierInfo {
  compositeScore: number;
  tradingScore: number;
  civicScore: number;
  developerScore: number;
  infraScore: number;
  tier: number;
  tierName: string;
  tierColor: string;
  feeBps: number;
  mevProtection: string;
  orderTypes: string[];
  maxOrderSize: number;
}

const TIER_COLORS: Record<number, { bg: string; border: string; text: string }> = {
  0: { bg: 'bg-gray-500/20', border: 'border-gray-500/50', text: 'text-gray-400' },
  1: { bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-400' },
  2: { bg: 'bg-slate-300/20', border: 'border-slate-300/50', text: 'text-slate-300' },
  3: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400' },
  4: { bg: 'bg-slate-200/20', border: 'border-slate-200/50', text: 'text-slate-200' },
  5: { bg: 'bg-cyan-400/20', border: 'border-cyan-400/50', text: 'text-cyan-400' },
};

export function TierDisplay() {
  const wallet = useWallet();
  const { publicKey } = wallet;
  const { connection } = useConnection();
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasSovereignId, setHasSovereignId] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTierInfo() {
      if (!publicKey) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch from SOVEREIGN on-chain
        const identity = await fetchSovereignIdentity(connection, publicKey);

        if (identity) {
          setHasSovereignId(true);
          setTierInfo({
            compositeScore: identity.compositeScore,
            tradingScore: identity.tradingScore,
            civicScore: identity.civicScore,
            developerScore: identity.developerScore,
            infraScore: identity.infraScore,
            tier: identity.tier,
            tierName: getTierName(identity.tier),
            tierColor: getTierColor(identity.tier),
            feeBps: getFeeBps(identity.tier),
            mevProtection: getMevProtection(identity.tier),
            orderTypes: getOrderTypes(identity.tier),
            maxOrderSize: getMaxOrderSize(identity.tier),
          });
        } else {
          // No SOVEREIGN identity found - use default tier
          setHasSovereignId(false);
          setTierInfo({
            compositeScore: 0,
            tradingScore: 0,
            civicScore: 0,
            developerScore: 0,
            infraScore: 0,
            tier: 0,
            tierName: 'None',
            tierColor: '#666666',
            feeBps: getFeeBps(0),
            mevProtection: getMevProtection(0),
            orderTypes: getOrderTypes(0),
            maxOrderSize: getMaxOrderSize(0),
          });
        }
      } catch (error) {
        console.error('Error fetching SOVEREIGN identity:', error);
        // Fallback to no tier
        setHasSovereignId(false);
        setTierInfo({
          compositeScore: 0,
          tradingScore: 0,
          civicScore: 0,
          developerScore: 0,
          infraScore: 0,
          tier: 0,
          tierName: 'None',
          tierColor: '#666666',
          feeBps: getFeeBps(0),
          mevProtection: getMevProtection(0),
          orderTypes: getOrderTypes(0),
          maxOrderSize: getMaxOrderSize(0),
        });
      } finally {
        setLoading(false);
      }
    }

    fetchTierInfo();
  }, [publicKey, connection]);

  const handleCreateIdentity = async () => {
    if (!publicKey) return;

    setCreating(true);
    setCreateError(null);

    try {
      const txId = await createSovereignIdentity(connection, wallet);
      console.log('SOVEREIGN identity created:', txId);

      // Refetch the identity
      const identity = await fetchSovereignIdentity(connection, publicKey);
      if (identity) {
        setHasSovereignId(true);
        setTierInfo({
          compositeScore: identity.compositeScore,
          tradingScore: identity.tradingScore,
          civicScore: identity.civicScore,
          developerScore: identity.developerScore,
          infraScore: identity.infraScore,
          tier: identity.tier,
          tierName: getTierName(identity.tier),
          tierColor: getTierColor(identity.tier),
          feeBps: getFeeBps(identity.tier),
          mevProtection: getMevProtection(identity.tier),
          orderTypes: getOrderTypes(identity.tier),
          maxOrderSize: getMaxOrderSize(identity.tier),
        });
      }
    } catch (error) {
      console.error('Error creating SOVEREIGN identity:', error);
      setCreateError(error instanceof Error ? error.message : 'Failed to create identity');
    } finally {
      setCreating(false);
    }
  };

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

  const colors = TIER_COLORS[tierInfo.tier] || TIER_COLORS[0];
  const scorePercent = Math.min((tierInfo.compositeScore / 10000) * 100, 100);

  return (
    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">SOVEREIGN Tier</h2>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001z"
              clipRule="evenodd"
            />
          </svg>
          <span>Universal Identity</span>
        </div>
      </div>

      {/* Composite Score */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">Composite Score</span>
          <span className="text-2xl font-bold">{tierInfo.compositeScore.toLocaleString()}</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full ${colors.bg.replace('/20', '')} transition-all duration-500`}
            style={{ width: `${scorePercent}%` }}
          />
        </div>
      </div>

      {/* Tier Badge */}
      <div
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${colors.bg} ${colors.border} mb-6`}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001z"
            clipRule="evenodd"
          />
        </svg>
        <span className={`text-lg font-bold ${colors.text}`}>{tierInfo.tierName}</span>
        {tierInfo.tier > 0 && (
          <span className="text-sm opacity-70">Tier {tierInfo.tier}</span>
        )}
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-purple-400">{tierInfo.tradingScore.toLocaleString()}</div>
          <div className="text-xs text-gray-500">Trading</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-green-400">{tierInfo.civicScore.toLocaleString()}</div>
          <div className="text-xs text-gray-500">Civic</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-blue-400">{tierInfo.developerScore.toLocaleString()}</div>
          <div className="text-xs text-gray-500">Developer</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-orange-400">{tierInfo.infraScore.toLocaleString()}</div>
          <div className="text-xs text-gray-500">Infra</div>
        </div>
      </div>

      {/* Benefits */}
      <div className="space-y-4">
        <div className="flex justify-between">
          <span className="text-gray-400">Trading Fee</span>
          <span className="font-semibold text-green-400">{tierInfo.feeBps / 100}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">MEV Protection</span>
          <span className="font-semibold text-cyan-400">{tierInfo.mevProtection}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Max Order</span>
          <span className="font-semibold">
            {tierInfo.maxOrderSize === Infinity
              ? 'Unlimited'
              : `$${tierInfo.maxOrderSize.toLocaleString()}`}
          </span>
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

      {/* No SOVEREIGN ID Notice */}
      {!hasSovereignId && publicKey && (
        <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
          <p className="text-sm text-purple-300 mb-3">
            Create a SOVEREIGN identity to unlock lower fees and better features!
          </p>
          {createError && (
            <p className="text-sm text-red-400 mb-3">{createError}</p>
          )}
          <button
            onClick={handleCreateIdentity}
            disabled={creating}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
          >
            {creating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Creating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001z"
                    clipRule="evenodd"
                  />
                </svg>
                Create SOVEREIGN Identity
              </>
            )}
          </button>
        </div>
      )}

      {/* Upgrade hint for existing users */}
      {hasSovereignId && tierInfo.tier < 5 && (
        <div className="mt-6 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
          <p className="text-sm text-cyan-300">
            Build your reputation across the ecosystem to level up your SOVEREIGN tier!
          </p>
        </div>
      )}
    </div>
  );
}
