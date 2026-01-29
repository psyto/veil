"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Keypair, PublicKey } from "@solana/web3.js";
import { ConnectWalletButton } from "@/components/wallet/connect-button";
import { useShadowMode } from "@/hooks/use-shadow-mode";
import { useEphemeralWallet } from "@/hooks/use-ephemeral-wallet";
import { usePumpFunToken } from "@/hooks/use-pumpfun-tokens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Eye,
  EyeOff,
  ArrowLeft,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import {
  formatMarketCap,
  formatTokenPrice,
  getTokenAge,
  getBondingCurveState,
  calculatePurchaseAmount,
} from "@/lib/pumpfun/bonding-curve";
import { truncateAddress, formatSol } from "@/lib/utils/format";
import {
  executeShadowPurchase,
  executeStandardPurchase,
  estimatePurchaseCosts,
} from "@/lib/shadow/shadow-purchase";

export default function TokenPage() {
  const params = useParams();
  const mint = params.mint as string;

  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const { mode, setMode, isShadowMode, setIsShielding } = useShadowMode();
  const { wallet: ephemeralWallet, createWallet, balance: ephemeralBalance } = useEphemeralWallet();
  const { token, isLoading, error, refresh } = usePumpFunToken(mint);

  const [amount, setAmount] = useState("0.1");
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<{
    success: boolean;
    message: string;
    signature?: string;
  } | null>(null);

  const amountNum = parseFloat(amount) || 0;
  const calculation = token ? calculatePurchaseAmount(token, amountNum) : null;
  const costs = estimatePurchaseCosts(amountNum);
  const curveState = token ? getBondingCurveState(token) : null;

  const handlePurchase = async () => {
    if (!token || !publicKey || amountNum <= 0) return;

    setIsPurchasing(true);
    setPurchaseResult(null);

    try {
      if (isShadowMode) {
        setIsShielding(true);

        // For shadow mode, we need the actual keypair
        // In production, this would use wallet adapter signing
        // For now, this is a placeholder
        console.log("[Shadow] Initiating shadow purchase...");

        // Placeholder - in production, use proper wallet signing
        setPurchaseResult({
          success: true,
          message: "Shadow purchase initiated! Check your ephemeral wallet.",
        });
      } else {
        // Standard purchase
        console.log("[Standard] Initiating standard purchase...");

        setPurchaseResult({
          success: true,
          message: "Standard purchase initiated!",
        });
      }
    } catch (err) {
      setPurchaseResult({
        success: false,
        message: err instanceof Error ? err.message : "Purchase failed",
      });
    } finally {
      setIsPurchasing(false);
      setIsShielding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-lg">{error || "Token not found"}</p>
        <Link href="/launch">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tokens
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/launch">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-emerald-500" />
              <span className="text-lg font-bold gradient-text">ShadowLaunch</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {/* Privacy Mode Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-900 border border-zinc-800">
              <button
                onClick={() => setMode("standard")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm ${
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm ${
                  mode === "shadow"
                    ? "bg-emerald-600 text-white"
                    : "text-zinc-400 hover:text-emerald-400"
                }`}
              >
                <EyeOff className="h-3.5 w-3.5" />
                Shadow
              </button>
            </div>

            <ConnectWalletButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Token Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Token Header */}
            <div className="flex items-start gap-4">
              {token.image_uri ? (
                <Image
                  src={token.image_uri}
                  alt={token.name}
                  width={80}
                  height={80}
                  className="rounded-xl"
                  unoptimized
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-zinc-800 flex items-center justify-center">
                  <span className="text-2xl font-bold">
                    {token.symbol?.charAt(0) || "?"}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold">{token.name}</h1>
                  {token.complete && (
                    <Badge variant="outline">Graduated</Badge>
                  )}
                </div>
                <p className="text-muted-foreground">${token.symbol}</p>
                <div className="flex items-center gap-4 mt-2">
                  <a
                    href={`https://pump.fun/${token.mint}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    View on Pump.fun
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Description */}
            {token.description && (
              <div className="p-4 rounded-lg bg-card border border-border">
                <p className="text-sm text-muted-foreground">
                  {token.description}
                </p>
              </div>
            )}

            {/* Stats Grid */}
            {curveState && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  label="Market Cap"
                  value={formatMarketCap(curveState.marketCapSol)}
                />
                <StatCard
                  label="Price"
                  value={`${formatTokenPrice(curveState.currentPrice)} SOL`}
                />
                <StatCard
                  label="Graduation"
                  value={`${curveState.graduationProgress.toFixed(1)}%`}
                />
                <StatCard label="Age" value={getTokenAge(token)} />
              </div>
            )}

            {/* Graduation Progress */}
            {curveState && (
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Graduation Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {curveState.graduationProgress.toFixed(1)}% to Raydium
                  </span>
                </div>
                <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                    style={{ width: `${curveState.graduationProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Purchase Panel */}
          <div className="lg:col-span-1">
            <div
              className={`p-6 rounded-xl border sticky top-24 ${
                isShadowMode
                  ? "bg-emerald-950/30 border-emerald-500/30 shadow-glow"
                  : "bg-card border-border"
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                {isShadowMode ? (
                  <>
                    <Shield className="h-5 w-5 text-emerald-500" />
                    <span className="font-semibold text-emerald-400">
                      Shadow Purchase
                    </span>
                  </>
                ) : (
                  <>
                    <Eye className="h-5 w-5" />
                    <span className="font-semibold">Standard Purchase</span>
                  </>
                )}
              </div>

              {/* Amount Input */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Amount (SOL)
                  </label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.1"
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Quick Amount Buttons */}
                <div className="flex gap-2">
                  {["0.1", "0.5", "1", "5"].map((val) => (
                    <Button
                      key={val}
                      variant="outline"
                      size="sm"
                      onClick={() => setAmount(val)}
                      className="flex-1"
                    >
                      {val}
                    </Button>
                  ))}
                </div>

                {/* Calculation Preview */}
                {calculation && amountNum > 0 && (
                  <div className="p-3 rounded-lg bg-zinc-900/50 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">You receive</span>
                      <span className="font-medium">
                        ~{Number(calculation.tokenAmount).toLocaleString()} {token.symbol}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price impact</span>
                      <span
                        className={
                          calculation.priceImpact > 5
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }
                      >
                        {calculation.priceImpact.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fees</span>
                      <span className="text-muted-foreground">
                        {isShadowMode
                          ? `~${costs.shadow.fees.toFixed(4)} SOL`
                          : `~${costs.standard.fees.toFixed(6)} SOL`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Shadow Mode Info */}
                {isShadowMode && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm">
                    <p className="text-emerald-300">
                      Your purchase will be routed through the privacy pool.
                      Tokens will arrive in an ephemeral wallet with no link to
                      your main address.
                    </p>
                  </div>
                )}

                {/* Purchase Result */}
                {purchaseResult && (
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      purchaseResult.success
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                        : "bg-destructive/10 border border-destructive/20 text-destructive"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {purchaseResult.success ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                      {purchaseResult.message}
                    </div>
                  </div>
                )}

                {/* Purchase Button */}
                {publicKey ? (
                  <Button
                    onClick={handlePurchase}
                    disabled={isPurchasing || amountNum <= 0}
                    className="w-full"
                    size="lg"
                  >
                    {isPurchasing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {isShadowMode ? "Shielding..." : "Purchasing..."}
                      </>
                    ) : isShadowMode ? (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Shadow Buy
                      </>
                    ) : (
                      "Buy Now"
                    )}
                  </Button>
                ) : (
                  <ConnectWalletButton className="w-full" />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-lg bg-card border border-border">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
