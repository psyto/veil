"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

interface ConnectWalletButtonProps {
  className?: string;
}

export function ConnectWalletButton({ className }: ConnectWalletButtonProps) {
  const [mounted, setMounted] = useState(false);

  // Only render wallet button after mounting to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return placeholder that matches approximate size
    return (
      <Button variant="outline" className={className} disabled>
        <Wallet className="h-4 w-4 mr-2" />
        Connect Wallet
      </Button>
    );
  }

  return <WalletMultiButton className={className} />;
}

// Hook to get wallet status
export function useSolanaWallet() {
  const { connected, publicKey, connecting, disconnect, wallet, signTransaction, signAllTransactions } =
    useWallet();

  return {
    connected,
    connecting,
    publicKey,
    publicKeyString: publicKey?.toBase58() || null,
    walletName: wallet?.adapter.name || null,
    disconnect,
    signTransaction,
    signAllTransactions,
  };
}
