"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

interface ConnectWalletButtonProps {
  className?: string;
}

export function ConnectWalletButton({ className }: ConnectWalletButtonProps) {
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
