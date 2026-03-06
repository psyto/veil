"use client";

import { useState } from "react";
import Link from "next/link";
import { ConnectWalletButton } from "@/components/wallet/connect-button";
import { useShadowMode } from "@/hooks/use-shadow-mode";
import { Button } from "@/components/ui/button";
import { Shield, Eye, EyeOff, Zap, Lock, ArrowRight } from "lucide-react";

export default function HomePage() {
  const { mode, setMode, isShadowMode } = useShadowMode();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-emerald-500" />
            <span className="text-xl font-bold gradient-text">ShadowLaunch</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/launch">
              <Button variant="outline">Browse Tokens</Button>
            </Link>
            <ConnectWalletButton />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Shadow Mode Toggle */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 mb-8">
            <button
              onClick={() => setMode("standard")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                mode === "standard"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Eye className="h-4 w-4" />
              Standard
            </button>
            <button
              onClick={() => setMode("shadow")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                mode === "shadow"
                  ? "bg-emerald-600 text-white shadow-glow"
                  : "text-zinc-400 hover:text-emerald-400"
              }`}
            >
              <EyeOff className="h-4 w-4" />
              Shadow Mode
              {mode === "shadow" && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
            </button>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            Buy tokens.{" "}
            <span className="gradient-text">Leave no trace.</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            ShadowLaunch breaks the on-chain link between your wallet and your
            Pump.fun purchases. Accumulate without being tracked. Trade without
            being front-run.
          </p>

          {/* CTA Buttons */}
          <div className="flex items-center justify-center gap-4 mb-16">
            <Link href="/launch">
              <Button size="lg" className="gap-2">
                Start Trading
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline">
                Learn More
              </Button>
            </a>
          </div>

          {/* Feature Cards */}
          <div id="features" className="grid md:grid-cols-3 gap-6 mt-16 scroll-mt-8">
            <FeatureCard
              icon={<EyeOff className="h-8 w-8 text-emerald-500" />}
              title="Ephemeral Addresses"
              description="Each purchase uses a fresh wallet. No history, no pattern, no trace back to you."
            />
            <FeatureCard
              icon={<Lock className="h-8 w-8 text-emerald-500" />}
              title="Privacy Pool"
              description="Funds route through a shielded pool, breaking the on-chain link between source and destination."
            />
            <FeatureCard
              icon={<Zap className="h-8 w-8 text-emerald-500" />}
              title="Same Speed"
              description="Privacy doesn't mean slow. Transactions confirm in seconds, just like standard purchases."
            />
          </div>

          {/* How It Works */}
          <div className="mt-24">
            <h2 className="text-3xl font-bold mb-12">How Shadow Mode Works</h2>
            <div className="grid md:grid-cols-4 gap-4">
              <StepCard
                number={1}
                title="Connect Wallet"
                description="Connect your main Phantom or Solflare wallet"
              />
              <StepCard
                number={2}
                title="Shield Funds"
                description="SOL moves to privacy pool, breaking the link"
              />
              <StepCard
                number={3}
                title="Ephemeral Purchase"
                description="Fresh wallet buys tokens from Pump.fun"
              />
              <StepCard
                number={4}
                title="Unlinked Tokens"
                description="Tokens in ephemeral wallet, no trace to you"
              />
            </div>
          </div>

          {/* Privacy Indicator */}
          {isShadowMode && (
            <div className="mt-16 p-6 rounded-xl bg-emerald-950/30 border border-emerald-500/20 shadow-glow">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Shield className="h-6 w-6 text-emerald-500" />
                <span className="text-lg font-semibold text-emerald-400">
                  Shadow Mode Active
                </span>
              </div>
              <p className="text-sm text-emerald-300/70">
                Your purchases will be private. No on-chain link to your main wallet.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-24">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-500" />
              <span className="font-semibold">ShadowLaunch</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built for Pump.fun Hackathon 2026
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-xl bg-card border border-border card-hover">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="relative p-4 rounded-lg bg-card border border-border">
      <div className="absolute -top-3 left-4 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold">
        {number}
      </div>
      <h4 className="font-semibold mt-2 mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
