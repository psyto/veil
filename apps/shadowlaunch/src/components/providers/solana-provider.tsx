"use client";

import { useMemo, ReactNode } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
  CoinbaseWalletAdapter,
} from "@solana/wallet-adapter-wallets";

// Import wallet adapter styles
import "@solana/wallet-adapter-react-ui/styles.css";

interface SolanaProviderProps {
  children: ReactNode;
}

/**
 * RPC Endpoint Configuration
 *
 * Supported providers (in priority order):
 * 1. QuickNode - High-performance Solana RPC (recommended)
 * 2. Helius - Solana RPC with enhanced APIs
 * 3. Custom RPC - Any Solana RPC endpoint
 * 4. Public devnet - Fallback for development
 *
 * Get your QuickNode endpoint at: https://quicknode.com
 * Get your Helius API key at: https://helius.dev
 */
const SOLANA_RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_QUICKNODE_RPC_URL ||
  process.env.NEXT_PUBLIC_HELIUS_RPC_URL ||
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  "https://api.devnet.solana.com";

/**
 * Get the current RPC provider name for attribution
 */
export function getRpcProvider(): string {
  if (process.env.NEXT_PUBLIC_QUICKNODE_RPC_URL) return "QuickNode";
  if (process.env.NEXT_PUBLIC_HELIUS_RPC_URL) return "Helius";
  if (process.env.NEXT_PUBLIC_SOLANA_RPC_URL) return "Custom RPC";
  return "Solana Devnet";
}

export function SolanaProvider({ children }: SolanaProviderProps) {
  // Initialize wallet adapters
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
      new CoinbaseWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={SOLANA_RPC_ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
