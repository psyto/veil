"use client";

import { useState, useCallback, useEffect } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import {
  EphemeralWallet,
  createEphemeralWallet,
  getEphemeralBalance,
  ephemeralManager,
} from "@/lib/shadow/ephemeral";

interface UseEphemeralWalletReturn {
  /** Current ephemeral wallet (if any) */
  wallet: EphemeralWallet | null;
  /** Create a new ephemeral wallet */
  createWallet: (label?: string) => EphemeralWallet;
  /** Clear current wallet (WARNING: funds will be lost!) */
  clearWallet: () => void;
  /** SOL balance of current wallet */
  balance: number;
  /** Whether balance is loading */
  isLoadingBalance: boolean;
  /** Refresh balance */
  refreshBalance: () => Promise<void>;
  /** All tracked ephemeral wallets */
  allWallets: EphemeralWallet[];
  /** Select a different wallet */
  selectWallet: (publicKey: string) => void;
}

export function useEphemeralWallet(): UseEphemeralWalletReturn {
  const { connection } = useConnection();
  const [wallet, setWallet] = useState<EphemeralWallet | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [allWallets, setAllWallets] = useState<EphemeralWallet[]>([]);

  // Refresh balance for current wallet
  const refreshBalance = useCallback(async () => {
    if (!wallet) {
      setBalance(0);
      return;
    }

    setIsLoadingBalance(true);
    try {
      const bal = await getEphemeralBalance(connection, wallet);
      setBalance(bal);
    } catch (error) {
      console.error("Failed to fetch ephemeral balance:", error);
      setBalance(0);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [connection, wallet]);

  // Create a new ephemeral wallet
  const createWallet = useCallback((label?: string): EphemeralWallet => {
    const newWallet = ephemeralManager.create(label);
    setWallet(newWallet);
    setAllWallets(ephemeralManager.list());
    setBalance(0);
    return newWallet;
  }, []);

  // Clear current wallet
  const clearWallet = useCallback(() => {
    if (wallet) {
      ephemeralManager.remove(wallet.publicKey.toBase58());
    }
    setWallet(null);
    setBalance(0);
    setAllWallets(ephemeralManager.list());
  }, [wallet]);

  // Select a different wallet
  const selectWallet = useCallback((publicKey: string) => {
    const selected = ephemeralManager.get(publicKey);
    if (selected) {
      setWallet(selected);
    }
  }, []);

  // Auto-refresh balance periodically
  useEffect(() => {
    if (!wallet) return;

    refreshBalance();

    const interval = setInterval(refreshBalance, 10000); // Every 10 seconds
    return () => clearInterval(interval);
  }, [wallet, refreshBalance]);

  // Initialize allWallets on mount
  useEffect(() => {
    setAllWallets(ephemeralManager.list());
  }, []);

  return {
    wallet,
    createWallet,
    clearWallet,
    balance,
    isLoadingBalance,
    refreshBalance,
    allWallets,
    selectWallet,
  };
}
