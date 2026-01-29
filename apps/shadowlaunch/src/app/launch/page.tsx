"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ConnectWalletButton } from "@/components/wallet/connect-button";
import { useShadowMode } from "@/hooks/use-shadow-mode";
import { usePumpFunTokens } from "@/hooks/use-pumpfun-tokens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Eye,
  EyeOff,
  Search,
  TrendingUp,
  Clock,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { PumpFunToken } from "@/lib/pumpfun/types";
import {
  formatMarketCap,
  formatTokenPrice,
  getTokenAge,
  getBondingCurveState,
} from "@/lib/pumpfun/bonding-curve";
import { truncateAddress } from "@/lib/utils/format";

export default function LaunchPage() {
  const { mode, setMode, isShadowMode } = useShadowMode();
  const {
    tokens,
    isLoading,
    error,
    refresh,
    search,
    loadTrending,
    loadNew,
    viewMode,
  } = usePumpFunTokens("trending", { limit: 50 });

  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    search(searchQuery);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-emerald-500" />
            <span className="text-xl font-bold gradient-text">ShadowLaunch</span>
          </Link>

          <div className="flex items-center gap-4">
            {/* Privacy Mode Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-900 border border-zinc-800">
              <button
                onClick={() => setMode("standard")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-all ${
                  mode === "standard"
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                Standard
              </button>
              <button
                onClick={() => setMode("shadow")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-all ${
                  mode === "shadow"
                    ? "bg-emerald-600 text-white"
                    : "text-zinc-400 hover:text-emerald-400"
                }`}
              >
                <EyeOff className="h-3.5 w-3.5" />
                Shadow
                {mode === "shadow" && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                )}
              </button>
            </div>

            <ConnectWalletButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">Browse Tokens</h1>
            <p className="text-sm text-muted-foreground">
              {isShadowMode ? (
                <span className="text-emerald-400">
                  Shadow Mode: Purchases will be private
                </span>
              ) : (
                "Select a token to purchase"
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tokens..."
                className="pl-9 w-64"
              />
            </form>

            {/* View Mode Buttons */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-900 border border-zinc-800">
              <button
                onClick={loadTrending}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm ${
                  viewMode === "trending"
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Trending
              </button>
              <button
                onClick={loadNew}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm ${
                  viewMode === "new"
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                New
              </button>
            </div>

            {/* Refresh */}
            <Button
              variant="outline"
              size="icon"
              onClick={refresh}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive mb-8">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-48 rounded-lg bg-card border border-border shimmer"
              />
            ))}
          </div>
        )}

        {/* Token Grid */}
        {!isLoading && tokens.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tokens.map((token) => (
              <TokenCard
                key={token.mint}
                token={token}
                isShadowMode={isShadowMode}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && tokens.length === 0 && !error && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No tokens found</p>
          </div>
        )}
      </main>
    </div>
  );
}

function TokenCard({
  token,
  isShadowMode,
}: {
  token: PumpFunToken;
  isShadowMode: boolean;
}) {
  const curveState = getBondingCurveState(token);

  return (
    <Link href={`/token/${token.mint}`}>
      <div
        className={`p-4 rounded-lg border card-hover cursor-pointer ${
          isShadowMode
            ? "bg-emerald-950/20 border-emerald-500/20 hover:border-emerald-500/40"
            : "bg-card border-border hover:border-zinc-600"
        }`}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          {token.image_uri ? (
            <Image
              src={token.image_uri}
              alt={token.name}
              width={48}
              height={48}
              className="rounded-lg"
              unoptimized
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center">
              <span className="text-lg font-bold">
                {token.symbol?.charAt(0) || "?"}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{token.name}</h3>
            <p className="text-sm text-muted-foreground">${token.symbol}</p>
          </div>
          {token.complete && (
            <Badge variant="outline" className="text-xs">
              Graduated
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Market Cap</p>
            <p className="font-medium">{formatMarketCap(curveState.marketCapSol)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Price</p>
            <p className="font-medium">
              {formatTokenPrice(curveState.currentPrice)} SOL
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Graduation</span>
            <span>{curveState.graduationProgress.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${curveState.graduationProgress}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            {getTokenAge(token)}
          </span>
          <span className="text-xs text-muted-foreground">
            {truncateAddress(token.creator)}
          </span>
        </div>

        {/* Shadow Mode Indicator */}
        {isShadowMode && (
          <div className="flex items-center gap-1 mt-3 text-xs text-emerald-400">
            <Shield className="h-3 w-3" />
            <span>Private purchase available</span>
          </div>
        )}
      </div>
    </Link>
  );
}
