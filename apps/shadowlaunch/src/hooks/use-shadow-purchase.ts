"use client";

import { useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair,
} from "@solana/web3.js";
import {
  executeShadowPurchase,
  executeStandardPurchase,
  estimatePurchaseCosts,
  ShadowPurchaseResult,
  StandardPurchaseResult,
} from "@/lib/shadow/shadow-purchase";
import { purchaseToken } from "@/lib/pumpfun/client";
import { createEphemeralWallet, EphemeralWallet } from "@/lib/shadow/ephemeral";

export type PurchaseMode = "standard" | "shadow";

export interface PurchaseState {
  isLoading: boolean;
  step: PurchaseStep;
  error: string | null;
  result: PurchaseResultData | null;
}

export type PurchaseStep =
  | "idle"
  | "preparing"
  | "funding_ephemeral"
  | "awaiting_confirmation"
  | "purchasing"
  | "complete"
  | "error";

export interface PurchaseResultData {
  success: boolean;
  signature: string;
  tokenAmount: bigint;
  ephemeralWallet?: EphemeralWallet;
  mode: PurchaseMode;
  simulationMode?: boolean;
}

interface UseShadowPurchaseReturn {
  /** Current purchase state */
  state: PurchaseState;
  /** Execute a purchase */
  purchase: (tokenMint: string, amountSol: number, mode: PurchaseMode) => Promise<PurchaseResultData | null>;
  /** Reset state */
  reset: () => void;
  /** Estimate costs for both modes */
  estimateCosts: (amountSol: number) => ReturnType<typeof estimatePurchaseCosts>;
}

const initialState: PurchaseState = {
  isLoading: false,
  step: "idle",
  error: null,
  result: null,
};

export function useShadowPurchase(): UseShadowPurchaseReturn {
  const { connection } = useConnection();
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const [state, setState] = useState<PurchaseState>(initialState);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const purchase = useCallback(
    async (
      tokenMint: string,
      amountSol: number,
      mode: PurchaseMode
    ): Promise<PurchaseResultData | null> => {
      if (!publicKey || !signTransaction) {
        setState((prev) => ({
          ...prev,
          error: "Wallet not connected",
          step: "error",
        }));
        return null;
      }

      setState({
        isLoading: true,
        step: "preparing",
        error: null,
        result: null,
      });

      try {
        const mintPubkey = new PublicKey(tokenMint);
        const amountLamports = BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL));

        if (mode === "shadow") {
          // Shadow purchase flow:
          // 1. Create ephemeral wallet
          // 2. Transfer SOL from main wallet to ephemeral (user signs)
          // 3. Ephemeral buys token (we control ephemeral keypair)

          setState((prev) => ({ ...prev, step: "funding_ephemeral" }));

          // Create ephemeral wallet for this purchase
          const ephemeral = createEphemeralWallet(
            `purchase-${tokenMint.slice(0, 8)}`
          );

          console.log(
            `[Shadow] Created ephemeral wallet: ${ephemeral.publicKey.toBase58()}`
          );

          // Add buffer for transaction fees
          const feeBuffer = BigInt(10_000_000); // 0.01 SOL for fees
          const totalAmount = amountLamports + feeBuffer;

          // Create transfer transaction from user's wallet to ephemeral
          const transferTx = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: publicKey,
              toPubkey: ephemeral.publicKey,
              lamports: totalAmount,
            })
          );

          // Get recent blockhash
          const { blockhash, lastValidBlockHeight } =
            await connection.getLatestBlockhash();
          transferTx.recentBlockhash = blockhash;
          transferTx.feePayer = publicKey;

          setState((prev) => ({ ...prev, step: "awaiting_confirmation" }));

          // User signs the transfer
          const signedTx = await signTransaction(transferTx);
          const transferSig = await connection.sendRawTransaction(
            signedTx.serialize()
          );

          // Wait for confirmation
          await connection.confirmTransaction({
            signature: transferSig,
            blockhash,
            lastValidBlockHeight,
          });

          console.log(`[Shadow] Funded ephemeral wallet: ${transferSig}`);

          // Now use ephemeral to purchase
          setState((prev) => ({ ...prev, step: "purchasing" }));

          const purchaseResult = await purchaseToken(
            connection,
            ephemeral.keypair,
            mintPubkey,
            amountLamports,
            500 // 5% slippage
          );

          console.log(`[Shadow] Purchase complete: ${purchaseResult.signature}`);

          const result: PurchaseResultData = {
            success: true,
            signature: purchaseResult.signature,
            tokenAmount: purchaseResult.tokenAmount,
            ephemeralWallet: ephemeral,
            mode: "shadow",
            simulationMode: true, // Using simulation mode (direct transfer)
          };

          setState({
            isLoading: false,
            step: "complete",
            error: null,
            result,
          });

          return result;
        } else {
          // Standard purchase flow:
          // User signs the purchase transaction directly
          // Note: This creates a direct on-chain link

          setState((prev) => ({ ...prev, step: "purchasing" }));

          // For standard purchases, we need to build the transaction
          // and have the user sign it
          // The purchaseToken function expects a keypair, so we need
          // to build the transaction ourselves for wallet adapter

          const { buildPurchaseTransaction } = await import(
            "@/lib/pumpfun/transaction-builder"
          );

          const transaction = await buildPurchaseTransaction(
            connection,
            publicKey,
            mintPubkey,
            amountLamports,
            500 // 5% slippage
          );

          setState((prev) => ({ ...prev, step: "awaiting_confirmation" }));

          // Send transaction using wallet adapter
          const signature = await sendTransaction(transaction, connection);

          // Wait for confirmation
          const { blockhash, lastValidBlockHeight } =
            await connection.getLatestBlockhash();
          await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight,
          });

          console.log(`[Standard] Purchase complete: ${signature}`);

          // Get expected token amount from calculation
          const { getToken } = await import("@/lib/pumpfun/client");
          const { calculatePurchaseAmount } = await import(
            "@/lib/pumpfun/bonding-curve"
          );
          const token = await getToken(tokenMint);
          const calculation = calculatePurchaseAmount(token, amountSol);

          const result: PurchaseResultData = {
            success: true,
            signature,
            tokenAmount: calculation.tokenAmount,
            mode: "standard",
          };

          setState({
            isLoading: false,
            step: "complete",
            error: null,
            result,
          });

          return result;
        }
      } catch (error) {
        console.error("[Purchase] Error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Purchase failed";

        setState({
          isLoading: false,
          step: "error",
          error: errorMessage,
          result: null,
        });

        return null;
      }
    },
    [connection, publicKey, signTransaction, sendTransaction]
  );

  const estimateCosts = useCallback((amountSol: number) => {
    return estimatePurchaseCosts(amountSol);
  }, []);

  return {
    state,
    purchase,
    reset,
    estimateCosts,
  };
}
