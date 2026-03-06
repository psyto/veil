"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useWallet } from "@solana/wallet-adapter-react";
import { ConnectWalletButton } from "@/components/wallet/connect-button";
import { useShadowMode } from "@/hooks/use-shadow-mode";
import { useEphemeralWallet } from "@/hooks/use-ephemeral-wallet";
import { usePumpFunToken } from "@/hooks/use-pumpfun-tokens";
import { useShadowPurchase, PurchaseStep } from "@/hooks/use-shadow-purchase";
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
  Copy,
  Wallet,
} from "lucide-react";
import {
  formatMarketCap,
  formatTokenPrice,
  getTokenAge,
  getBondingCurveState,
  calculatePurchaseAmount,
} from "@/lib/pumpfun/bonding-curve";
import { truncateAddress, formatSol } from "@/lib/utils/format";
import { estimatePurchaseCosts } from "@/lib/shadow/shadow-purchase";

// Step display labels
const stepLabels: Record<PurchaseStep, string> = {
  idle: "",
  preparing: "Preparing transaction...",
  funding_ephemeral: "Creating ephemeral wallet...",
  awaiting_confirmation: "Please confirm in your wallet...",
  purchasing: "Executing purchase...",
  complete: "Purchase complete!",
  error: "Purchase failed",
};

export default function TokenPage() {
  const params = useParams();
  const mint = params.mint as string;

  const { publicKey } = useWallet();
  const { mode, setMode, isShadowMode, setIsShielding } = useShadowMode();
  const { wallet: ephemeralWallet } = useEphemeralWallet();
  const { token, isLoading, error, refresh } = usePumpFunToken(mint);
  const { state: purchaseState, purchase, reset: resetPurchase } = useShadowPurchase();

  const [amount, setAmount] = useState("0.1");
  const [copiedAddress, setCopiedAddress] = useState(false);

  const amountNum = parseFloat(amount) || 0;
  const calculation = token ? calculatePurchaseAmount(token, amountNum) : null;
  const costs = estimatePurchaseCosts(amountNum);
  const curveState = token ? getBondingCurveState(token) : null;

  // Update shielding state based on purchase state
  useEffect(() => {
    if (purchaseState.step === "funding_ephemeral" || purchaseState.step === "purchasing") {
      setIsShielding(true);
    } else {
      setIsShielding(false);
    }
  }, [purchaseState.step, setIsShielding]);

  const handlePurchase = async () => {
    if (!token || !publicKey || amountNum <= 0) return;

    resetPurchase();
    await purchase(mint, amountNum, isShadowMode ? "shadow" : "standard");
  };

  const handleCopyEphemeralAddress = () => {
    if (purchaseState.result?.ephemeralWallet) {
      navigator.clipboard.writeText(
        purchaseState.result.ephemeralWallet.publicKey.toBase58()
      );
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
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
                {isShadowMode && purchaseState.step === "idle" && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm">
                    <p className="text-emerald-300">
                      Your purchase will be routed through the privacy pool.
                      Tokens will arrive in an ephemeral wallet with no link to
                      your main address.
                    </p>
                  </div>
                )}

                {/* Purchase Progress */}
                {purchaseState.isLoading && (
                  <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 text-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                      <span>{stepLabels[purchaseState.step]}</span>
                    </div>
                  </div>
                )}

                {/* Purchase Result */}
                {purchaseState.step === "complete" && purchaseState.result && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm space-y-3">
                    <div className="flex items-center gap-2 text-emerald-300">
                      <CheckCircle className="h-4 w-4" />
                      <span>Purchase successful!</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Tokens received:</span>
                        <span className="text-white font-mono">
                          {Number(purchaseState.result.tokenAmount).toLocaleString()}
                        </span>
                      </div>
                      {purchaseState.result.ephemeralWallet && (
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-400">Ephemeral wallet:</span>
                            <button
                              onClick={handleCopyEphemeralAddress}
                              className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
                            >
                              <span className="font-mono">
                                {truncateAddress(
                                  purchaseState.result.ephemeralWallet.publicKey.toBase58()
                                )}
                              </span>
                              {copiedAddress ? (
                                <CheckCircle className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                          <p className="text-zinc-500 text-xs">
                            Tokens are in this wallet with no link to your main address.
                          </p>
                        </div>
                      )}
                      <a
                        href={`https://solscan.io/tx/${purchaseState.result.signature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-emerald-400 hover:underline"
                      >
                        View transaction
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Purchase Error */}
                {purchaseState.step === "error" && purchaseState.error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{purchaseState.error}</span>
                    </div>
                  </div>
                )}

                {/* Purchase Button */}
                {publicKey ? (
                  <Button
                    onClick={handlePurchase}
                    disabled={purchaseState.isLoading || amountNum <= 0}
                    className="w-full"
                    size="lg"
                  >
                    {purchaseState.isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {stepLabels[purchaseState.step]}
                      </>
                    ) : purchaseState.step === "complete" ? (
                      <>
                        <Wallet className="h-4 w-4 mr-2" />
                        Buy Again
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
