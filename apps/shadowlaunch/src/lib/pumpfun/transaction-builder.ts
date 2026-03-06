/**
 * Transaction Builder for Pump.fun purchases
 *
 * Builds transactions that can be signed by wallet adapter
 * (without requiring the actual keypair)
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";
import {
  PUMP_PROGRAM_ID,
  PUMP_GLOBAL_STATE,
  PUMP_FEE_RECIPIENT,
  PUMP_EVENT_AUTHORITY,
  deriveBondingCurvePDA,
  deriveAssociatedBondingCurve,
  getToken,
} from "./client";
import { calculatePurchaseAmount, calculateMinTokensOut } from "./bonding-curve";

// Instruction discriminators
const BUY_DISCRIMINATOR = Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]);
const SELL_DISCRIMINATOR = Buffer.from([51, 230, 133, 164, 1, 127, 131, 173]);

/**
 * Build a purchase transaction that can be signed by wallet adapter
 */
export async function buildPurchaseTransaction(
  connection: Connection,
  buyer: PublicKey,
  tokenMint: PublicKey,
  amountLamports: bigint,
  slippageBps: number = 500
): Promise<Transaction> {
  // Fetch current token state
  const token = await getToken(tokenMint.toBase58());

  if (token.complete) {
    throw new Error("Token has graduated to Raydium. Use Raydium to trade.");
  }

  // Calculate expected tokens
  const amountSol = Number(amountLamports) / LAMPORTS_PER_SOL;
  const calculation = calculatePurchaseAmount(token, amountSol);

  // Apply slippage
  const minTokensOut = calculateMinTokensOut(calculation.tokenAmount, slippageBps);

  console.log(`[Pump.fun] Building buy tx for ~${calculation.tokenAmount} tokens`);
  console.log(`[Pump.fun] Price impact: ${calculation.priceImpact.toFixed(2)}%`);
  console.log(`[Pump.fun] Min tokens out (${slippageBps / 100}% slippage): ${minTokensOut}`);

  // Derive PDAs
  const [bondingCurve] = deriveBondingCurvePDA(tokenMint);
  const associatedBondingCurve = await deriveAssociatedBondingCurve(
    tokenMint,
    bondingCurve
  );
  const userTokenAccount = await getAssociatedTokenAddress(tokenMint, buyer);

  // Build transaction
  const transaction = new Transaction();

  // Add compute budget for complex transaction
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 })
  );

  // Check if user has token account, if not create it
  try {
    await getAccount(connection, userTokenAccount);
  } catch {
    // Account doesn't exist, create it
    transaction.add(
      createAssociatedTokenAccountInstruction(
        buyer,
        userTokenAccount,
        buyer,
        tokenMint
      )
    );
  }

  // Build the buy instruction
  const buyInstruction = buildBuyInstruction(
    buyer,
    tokenMint,
    bondingCurve,
    associatedBondingCurve,
    userTokenAccount,
    amountLamports,
    minTokensOut
  );

  transaction.add(buyInstruction);

  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = buyer;

  return transaction;
}

/**
 * Build a sell transaction that can be signed by wallet adapter
 */
export async function buildSellTransaction(
  connection: Connection,
  seller: PublicKey,
  tokenMint: PublicKey,
  tokenAmount: bigint,
  slippageBps: number = 500
): Promise<Transaction> {
  // Fetch current token state
  const token = await getToken(tokenMint.toBase58());

  if (token.complete) {
    throw new Error("Token has graduated to Raydium. Use Raydium to trade.");
  }

  // Derive PDAs
  const [bondingCurve] = deriveBondingCurvePDA(tokenMint);
  const associatedBondingCurve = await deriveAssociatedBondingCurve(
    tokenMint,
    bondingCurve
  );
  const userTokenAccount = await getAssociatedTokenAddress(tokenMint, seller);

  // Calculate expected SOL
  const { virtual_sol_reserves: x, virtual_token_reserves: y } = token;
  const k = x * y;
  const newY = y + Number(tokenAmount);
  const newX = k / newY;
  const expectedSol = BigInt(Math.floor((x - newX) * LAMPORTS_PER_SOL));

  // Apply slippage for min SOL out
  const minSolOut = (expectedSol * BigInt(10000 - slippageBps)) / BigInt(10000);

  console.log(
    `[Pump.fun] Building sell tx for ${tokenAmount} tokens for ~${Number(expectedSol) / LAMPORTS_PER_SOL} SOL`
  );

  // Build the sell instruction
  const sellInstruction = buildSellInstruction(
    seller,
    tokenMint,
    bondingCurve,
    associatedBondingCurve,
    userTokenAccount,
    tokenAmount,
    minSolOut
  );

  // Build transaction
  const transaction = new Transaction();

  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 })
  );

  transaction.add(sellInstruction);

  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = seller;

  return transaction;
}

/**
 * Build the Pump.fun buy instruction
 */
function buildBuyInstruction(
  buyer: PublicKey,
  tokenMint: PublicKey,
  bondingCurve: PublicKey,
  associatedBondingCurve: PublicKey,
  userTokenAccount: PublicKey,
  maxSolCost: bigint,
  minTokensOut: bigint
): TransactionInstruction {
  // Instruction data layout:
  // [8 bytes] discriminator
  // [8 bytes] amount (tokens to buy)
  // [8 bytes] max_sol_cost
  const data = Buffer.alloc(24);
  BUY_DISCRIMINATOR.copy(data, 0);

  // Write min tokens out as u64
  writeBigUInt64LE(data, minTokensOut, 8);

  // Write max SOL cost as u64
  writeBigUInt64LE(data, maxSolCost, 16);

  return new TransactionInstruction({
    programId: PUMP_PROGRAM_ID,
    keys: [
      { pubkey: PUMP_GLOBAL_STATE, isSigner: false, isWritable: false },
      { pubkey: PUMP_FEE_RECIPIENT, isSigner: false, isWritable: true },
      { pubkey: tokenMint, isSigner: false, isWritable: false },
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: PUMP_EVENT_AUTHORITY, isSigner: false, isWritable: false },
      { pubkey: PUMP_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Build the Pump.fun sell instruction
 */
function buildSellInstruction(
  seller: PublicKey,
  tokenMint: PublicKey,
  bondingCurve: PublicKey,
  associatedBondingCurve: PublicKey,
  userTokenAccount: PublicKey,
  tokenAmount: bigint,
  minSolOut: bigint
): TransactionInstruction {
  // Instruction data layout:
  // [8 bytes] discriminator
  // [8 bytes] amount (tokens to sell)
  // [8 bytes] min_sol_output
  const data = Buffer.alloc(24);
  SELL_DISCRIMINATOR.copy(data, 0);

  // Write token amount as u64
  writeBigUInt64LE(data, tokenAmount, 8);

  // Write min SOL out as u64
  writeBigUInt64LE(data, minSolOut, 16);

  return new TransactionInstruction({
    programId: PUMP_PROGRAM_ID,
    keys: [
      { pubkey: PUMP_GLOBAL_STATE, isSigner: false, isWritable: false },
      { pubkey: PUMP_FEE_RECIPIENT, isSigner: false, isWritable: true },
      { pubkey: tokenMint, isSigner: false, isWritable: false },
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: seller, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: PUMP_EVENT_AUTHORITY, isSigner: false, isWritable: false },
      { pubkey: PUMP_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Write a BigInt as little-endian u64 to a buffer
 */
function writeBigUInt64LE(buffer: Buffer, value: bigint, offset: number): void {
  const low = Number(value & BigInt(0xffffffff));
  const high = Number((value >> BigInt(32)) & BigInt(0xffffffff));
  buffer.writeUInt32LE(low, offset);
  buffer.writeUInt32LE(high, offset + 4);
}
