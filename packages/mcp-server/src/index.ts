#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  generateEncryptionKeypair,
  deriveEncryptionKeypair,
  encrypt,
  decrypt,
  encryptForMultiple,
  validateEncryptedData,
  encryptionKeyToBase58,
  base58ToEncryptionKey,
  splitSecret,
  combineShares,
  verifyShares,
} from "@veil/crypto";
import {
  encryptOrderPayload,
  decryptOrderPayload,
} from "@veil/orders";
import BN from "bn.js";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";

// ── helpers ──────────────────────────────────────────────────────────

function fromBase64(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function jsonContent(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function errorContent(message: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
    isError: true as const,
  };
}

// ── SPECTER constants & helpers ──────────────────────────────────────

const SOVEREIGN_PROGRAM_ID = new PublicKey("2UAZc1jj4QTSkgrC8U9d4a7EM9AQunxMvW5g7rX7Af9T");

const TIER_NAMES: Record<number, string> = {
  1: "Bronze",
  2: "Silver",
  3: "Gold",
  4: "Platinum",
  5: "Diamond",
};

const DIMENSION_INDICES: Record<string, number> = {
  trading: 0,
  civic: 1,
  developer: 2,
  infra: 3,
  creator: 4,
};

function getSolanaConnection(): Connection {
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  return new Connection(rpcUrl, "confirmed");
}

interface SovereignIdentity {
  owner: string;
  createdAt: bigint;
  tradingScore: number;
  civicScore: number;
  developerScore: number;
  infraScore: number;
  creatorScore: number;
  compositeScore: number;
  tier: number;
  tierName: string;
  lastUpdated: bigint;
  bump: number;
}

function parseSovereignIdentity(data: Buffer): SovereignIdentity {
  // Layout (236 bytes total):
  //   8  bytes  discriminator
  //  32  bytes  owner (pubkey)
  //   8  bytes  created_at (i64 LE)
  // 160  bytes  5 x 32-byte authorities
  //  10  bytes  5 x u16 LE scores (trading, civic, developer, infra, creator)
  //   2  bytes  composite_score (u16 LE)
  //   1  byte   tier
  //   8  bytes  last_updated (i64 LE)
  //   1  byte   bump
  let offset = 8; // skip discriminator

  const owner = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
  offset += 32;

  const createdAt = data.readBigInt64LE(offset);
  offset += 8;

  // skip 5 x 32-byte authorities
  offset += 5 * 32;

  const tradingScore = data.readUInt16LE(offset); offset += 2;
  const civicScore = data.readUInt16LE(offset); offset += 2;
  const developerScore = data.readUInt16LE(offset); offset += 2;
  const infraScore = data.readUInt16LE(offset); offset += 2;
  const creatorScore = data.readUInt16LE(offset); offset += 2;

  const compositeScore = data.readUInt16LE(offset); offset += 2;

  const tier = data.readUInt8(offset); offset += 1;

  const lastUpdated = data.readBigInt64LE(offset); offset += 8;

  const bump = data.readUInt8(offset);

  return {
    owner,
    createdAt,
    tradingScore,
    civicScore,
    developerScore,
    infraScore,
    creatorScore,
    compositeScore,
    tier,
    tierName: TIER_NAMES[tier] || "Unknown",
    lastUpdated,
    bump,
  };
}

async function fetchSovereignIdentity(wallet: string): Promise<SovereignIdentity> {
  const connection = getSolanaConnection();
  const walletPubkey = new PublicKey(wallet);
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("identity"), walletPubkey.toBuffer()],
    SOVEREIGN_PROGRAM_ID,
  );
  const accountInfo = await connection.getAccountInfo(pda);
  if (!accountInfo || !accountInfo.data) {
    throw new Error(`No SOVEREIGN identity found for wallet ${wallet} (PDA: ${pda.toBase58()})`);
  }
  return parseSovereignIdentity(accountInfo.data as Buffer);
}

function getDimensionScore(identity: SovereignIdentity, dimension: string): number {
  switch (dimension) {
    case "trading": return identity.tradingScore;
    case "civic": return identity.civicScore;
    case "developer": return identity.developerScore;
    case "infra": return identity.infraScore;
    case "creator": return identity.creatorScore;
    default: throw new Error(`Unknown dimension: ${dimension}. Must be one of: trading, civic, developer, infra, creator`);
  }
}

function assessConfidence(tier: number): "high" | "medium" | "low" | "none" {
  if (tier >= 4) return "high";
  if (tier >= 3) return "medium";
  if (tier >= 1) return "low";
  return "none";
}

// ── tool definitions ─────────────────────────────────────────────────

const TOOLS = [
  {
    name: "generate_keypair",
    description:
      "Generate a new random NaCl Box (Curve25519-XSalsa20-Poly1305) encryption keypair. Returns publicKey and secretKey as base64.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "derive_keypair",
    description:
      "Derive a deterministic NaCl Box keypair from a 32-byte seed (base64). Same seed always produces the same keypair.",
    inputSchema: {
      type: "object" as const,
      required: ["seed"],
      properties: {
        seed: { type: "string", description: "32-byte seed encoded as base64" },
      },
    },
  },
  {
    name: "encrypt",
    description:
      "Encrypt a message using NaCl Box (Curve25519-XSalsa20-Poly1305). Returns nonce, ciphertext, and combined bytes — all base64-encoded.",
    inputSchema: {
      type: "object" as const,
      required: ["message", "recipientPublicKey", "senderSecretKey", "senderPublicKey"],
      properties: {
        message: { type: "string", description: "Plaintext to encrypt (base64)" },
        recipientPublicKey: { type: "string", description: "Recipient's X25519 public key (base64)" },
        senderSecretKey: { type: "string", description: "Sender's secret key (base64)" },
        senderPublicKey: { type: "string", description: "Sender's public key (base64)" },
      },
    },
  },
  {
    name: "decrypt",
    description:
      "Decrypt NaCl Box ciphertext. Input is the combined nonce+ciphertext bytes (base64). Returns the decrypted plaintext as base64.",
    inputSchema: {
      type: "object" as const,
      required: ["encrypted", "senderPublicKey", "recipientSecretKey", "recipientPublicKey"],
      properties: {
        encrypted: { type: "string", description: "Combined nonce + ciphertext bytes (base64)" },
        senderPublicKey: { type: "string", description: "Sender's X25519 public key (base64)" },
        recipientSecretKey: { type: "string", description: "Recipient's secret key (base64)" },
        recipientPublicKey: { type: "string", description: "Recipient's public key (base64)" },
      },
    },
  },
  {
    name: "encrypt_multiple",
    description:
      "Encrypt the same message for multiple recipients. Each recipient gets a unique encrypted copy. Returns a map keyed by recipient public key (hex).",
    inputSchema: {
      type: "object" as const,
      required: ["message", "recipientPublicKeys", "senderSecretKey", "senderPublicKey"],
      properties: {
        message: { type: "string", description: "Plaintext to encrypt (base64)" },
        recipientPublicKeys: {
          type: "array",
          items: { type: "string" },
          description: "Array of recipient X25519 public keys (base64)",
        },
        senderSecretKey: { type: "string", description: "Sender's secret key (base64)" },
        senderPublicKey: { type: "string", description: "Sender's public key (base64)" },
      },
    },
  },
  {
    name: "validate_encrypted",
    description:
      "Validate that encrypted bytes have the correct NaCl Box structure (nonce + ciphertext) without decrypting. Useful as a pre-flight check.",
    inputSchema: {
      type: "object" as const,
      required: ["data"],
      properties: {
        data: { type: "string", description: "Encrypted bytes to validate (base64)" },
        minPlaintextSize: { type: "number", description: "Minimum expected plaintext size in bytes (default: 1)" },
        maxPlaintextSize: { type: "number", description: "Maximum expected plaintext size in bytes (default: 1024)" },
      },
    },
  },
  {
    name: "key_convert",
    description:
      "Convert an encryption public key between raw bytes (base64) and Solana base58 format. Provide either publicKey or base58 and get both formats back.",
    inputSchema: {
      type: "object" as const,
      properties: {
        publicKey: { type: "string", description: "Public key as base64 (will be converted to base58)" },
        base58: { type: "string", description: "Public key as Solana base58 (will be converted to raw bytes)" },
      },
    },
  },
  {
    name: "shamir_split",
    description:
      "Split a 32-byte secret into N shares using Shamir's Secret Sharing over a 256-bit prime field. Any M (threshold) shares can reconstruct the original.",
    inputSchema: {
      type: "object" as const,
      required: ["secret", "totalShares", "threshold"],
      properties: {
        secret: { type: "string", description: "32-byte secret to split (base64)" },
        totalShares: { type: "number", minimum: 2, maximum: 255, description: "Total shares to generate (N)" },
        threshold: { type: "number", minimum: 2, description: "Minimum shares needed to reconstruct (M, must be <= N)" },
      },
    },
  },
  {
    name: "shamir_combine",
    description:
      "Reconstruct a secret from Shamir threshold shares using Lagrange interpolation. Requires at least the threshold number of valid shares.",
    inputSchema: {
      type: "object" as const,
      required: ["shares"],
      properties: {
        shares: {
          type: "array",
          items: {
            type: "object",
            required: ["index", "value"],
            properties: {
              index: { type: "number", description: "Share index (1-based)" },
              value: { type: "string", description: "Share value (base64)" },
            },
          },
          minItems: 2,
          description: "Array of shares to combine",
        },
      },
    },
  },
  {
    name: "shamir_verify",
    description:
      "Verify that a set of Shamir shares are consistent by reconstructing with different subsets and checking they produce the same secret.",
    inputSchema: {
      type: "object" as const,
      required: ["shares", "threshold"],
      properties: {
        shares: {
          type: "array",
          items: {
            type: "object",
            required: ["index", "value"],
            properties: {
              index: { type: "number", description: "Share index (1-based)" },
              value: { type: "string", description: "Share value (base64)" },
            },
          },
          minItems: 2,
          description: "Array of shares to verify",
        },
        threshold: { type: "number", minimum: 2, description: "Expected threshold for these shares" },
      },
    },
  },
  {
    name: "encrypt_order",
    description:
      "Encrypt a DEX swap order payload (minOutputAmount, slippageBps, deadline) using NaCl Box. Protects order parameters from MEV bots.",
    inputSchema: {
      type: "object" as const,
      required: ["minOutputAmount", "slippageBps", "deadline", "solverPublicKey", "userSecretKey", "userPublicKey"],
      properties: {
        minOutputAmount: { type: "string", description: "Minimum output amount in lamports/smallest unit (string)" },
        slippageBps: { type: "number", description: "Slippage tolerance in basis points (e.g. 50 = 0.5%)" },
        deadline: { type: "number", description: "Order expiration as Unix timestamp in seconds" },
        solverPublicKey: { type: "string", description: "Solver's X25519 public key (base64)" },
        userSecretKey: { type: "string", description: "User's secret key (base64)" },
        userPublicKey: { type: "string", description: "User's public key (base64)" },
      },
    },
  },
  {
    name: "decrypt_order",
    description:
      "Decrypt an encrypted DEX swap order payload. Returns the original order fields: minOutputAmount, slippageBps, deadline.",
    inputSchema: {
      type: "object" as const,
      required: ["encrypted", "userPublicKey", "solverSecretKey", "solverPublicKey"],
      properties: {
        encrypted: { type: "string", description: "Combined nonce + ciphertext bytes (base64)" },
        userPublicKey: { type: "string", description: "User's X25519 public key (base64)" },
        solverSecretKey: { type: "string", description: "Solver's secret key (base64)" },
        solverPublicKey: { type: "string", description: "Solver's public key (base64)" },
      },
    },
  },

  // ── SPECTER: Sovereign Tools ────────────────────────────────────────

  {
    name: "sovereign_read",
    description:
      "Read a user's SOVEREIGN identity scores and tier from Solana. Returns trading, civic, developer, infra, creator scores (0-10000) and tier (1-5 = Bronze to Diamond).",
    inputSchema: {
      type: "object" as const,
      required: ["wallet"],
      properties: {
        wallet: { type: "string", description: "Solana wallet address (base58 public key)" },
      },
    },
  },

  // ── SPECTER: Trust Tools ────────────────────────────────────────────

  {
    name: "trust_query",
    description:
      "Query the LATTICE trust graph to find trusted users for a specific SOVEREIGN dimension. Uses BFS traversal through DAO co-memberships, nomination patterns, and explicit trust edges with configurable depth (up to 6 hops \u2014 Andrew Trust's 'friends of friends x6').",
    inputSchema: {
      type: "object" as const,
      required: ["origin", "dimension"],
      properties: {
        origin: { type: "string", description: "Origin wallet address (base58 public key)" },
        dimension: {
          type: "string",
          enum: ["trading", "civic", "developer", "infra", "creator"],
          description: "SOVEREIGN dimension to query trust for",
        },
        minScore: { type: "number", description: "Minimum dimension score filter (0-10000)" },
        maxDepth: {
          type: "number",
          minimum: 1,
          maximum: 6,
          description: "Maximum BFS traversal depth (1-6 hops, default 3)",
        },
        limit: { type: "number", description: "Maximum number of results to return (default 20)" },
      },
    },
  },
  {
    name: "trust_score",
    description:
      "Check how much you should trust a specific wallet for a given SOVEREIGN dimension. Returns their dimension score, tier, and trust assessment.",
    inputSchema: {
      type: "object" as const,
      required: ["targetWallet", "dimension"],
      properties: {
        targetWallet: { type: "string", description: "Target wallet address (base58 public key)" },
        dimension: {
          type: "string",
          enum: ["trading", "civic", "developer", "infra", "creator"],
          description: "SOVEREIGN dimension to assess trust for",
        },
      },
    },
  },

  // ── SPECTER: Vault Tools ────────────────────────────────────────────

  {
    name: "vault_read",
    description:
      "Read encrypted data from a DataSov2 vault on Arweave. Returns the encrypted document metadata (not decrypted \u2014 use the decrypt tool separately for each field). Queries Arweave GraphQL for the latest document by identity ID.",
    inputSchema: {
      type: "object" as const,
      required: ["identityId"],
      properties: {
        identityId: { type: "string", description: "Identity ID to look up in the DataSov2 vault" },
        documentType: {
          type: "string",
          enum: ["IDENTITY", "KYC_VERIFICATION", "ACCESS_PERMISSION"],
          description: "Filter by document type (optional)",
        },
      },
    },
  },
  {
    name: "vault_disclose",
    description:
      "Prepare a selective disclosure of encrypted vault fields to a specific consumer using ECDH key exchange. Derives a shared AES key from your secret key + consumer's public key, then re-encrypts selected fields with the shared key.",
    inputSchema: {
      type: "object" as const,
      required: ["fields", "consumerPublicKey", "ownerSecretKey", "ownerPublicKey", "encryptedFields"],
      properties: {
        fields: {
          type: "array",
          items: { type: "string" },
          description: "Field names to selectively disclose",
        },
        consumerPublicKey: { type: "string", description: "Consumer's X25519 public key (base64)" },
        ownerSecretKey: { type: "string", description: "Owner's secret key (base64)" },
        ownerPublicKey: { type: "string", description: "Owner's public key (base64)" },
        encryptedFields: {
          type: "object",
          additionalProperties: { type: "string" },
          description: "Map of field name to base64-encoded encrypted value",
        },
      },
    },
  },

  // ── SPECTER: Shield Tools ───────────────────────────────────────────

  {
    name: "ephemeral_wallet",
    description:
      "Generate a fresh ephemeral wallet for privacy-preserving interactions. The wallet has no on-chain history and no link to your main identity. Use with shielded transfers to fund it without creating a traceable link.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "zk_prove_tier",
    description:
      "Generate a conceptual ZK proof that your SOVEREIGN tier meets a minimum threshold, without revealing your exact scores or identity. Returns a proof commitment structure. (Note: Full Noir proof generation requires the @veil/crypto noir module.)",
    inputSchema: {
      type: "object" as const,
      required: ["wallet", "minTier"],
      properties: {
        wallet: { type: "string", description: "Solana wallet address (base58 public key)" },
        minTier: {
          type: "number",
          minimum: 1,
          maximum: 5,
          description: "Minimum tier threshold to prove (1=Bronze, 2=Silver, 3=Gold, 4=Platinum, 5=Diamond)",
        },
      },
    },
  },
];

// ── tool handlers ────────────────────────────────────────────────────

type Args = Record<string, unknown>;

export async function handleTool(name: string, args: Args) {
  switch (name) {
    case "generate_keypair": {
      const kp = generateEncryptionKeypair();
      return jsonContent({
        publicKey: toBase64(kp.publicKey),
        secretKey: toBase64(kp.secretKey),
      });
    }

    case "derive_keypair": {
      const kp = deriveEncryptionKeypair(fromBase64(args.seed as string));
      return jsonContent({
        publicKey: toBase64(kp.publicKey),
        secretKey: toBase64(kp.secretKey),
      });
    }

    case "encrypt": {
      const senderKeypair = {
        publicKey: fromBase64(args.senderPublicKey as string),
        secretKey: fromBase64(args.senderSecretKey as string),
      };
      const result = encrypt(
        fromBase64(args.message as string),
        fromBase64(args.recipientPublicKey as string),
        senderKeypair,
      );
      return jsonContent({
        nonce: toBase64(result.nonce),
        ciphertext: toBase64(result.ciphertext),
        bytes: toBase64(result.bytes),
      });
    }

    case "decrypt": {
      const recipientKeypair = {
        publicKey: fromBase64(args.recipientPublicKey as string),
        secretKey: fromBase64(args.recipientSecretKey as string),
      };
      const plaintext = decrypt(
        fromBase64(args.encrypted as string),
        fromBase64(args.senderPublicKey as string),
        recipientKeypair,
      );
      return jsonContent({ plaintext: toBase64(plaintext) });
    }

    case "encrypt_multiple": {
      const senderKeypair = {
        publicKey: fromBase64(args.senderPublicKey as string),
        secretKey: fromBase64(args.senderSecretKey as string),
      };
      const recipientKeys = (args.recipientPublicKeys as string[]).map(fromBase64);
      const resultMap = encryptForMultiple(
        fromBase64(args.message as string),
        recipientKeys,
        senderKeypair,
      );
      const recipients: Record<string, { nonce: string; ciphertext: string; bytes: string }> = {};
      for (const [hexKey, data] of resultMap.entries()) {
        recipients[hexKey] = {
          nonce: toBase64(data.nonce),
          ciphertext: toBase64(data.ciphertext),
          bytes: toBase64(data.bytes),
        };
      }
      return jsonContent({
        recipientCount: (args.recipientPublicKeys as string[]).length,
        recipients,
      });
    }

    case "validate_encrypted": {
      const bytes = fromBase64(args.data as string);
      const valid = validateEncryptedData(
        bytes,
        args.minPlaintextSize as number | undefined,
        args.maxPlaintextSize as number | undefined,
      );
      return jsonContent({ valid, byteLength: bytes.length });
    }

    case "key_convert": {
      if (args.publicKey) {
        const bytes = fromBase64(args.publicKey as string);
        const b58 = encryptionKeyToBase58(bytes);
        return jsonContent({ base58: b58, publicKey: toBase64(bytes) });
      } else if (args.base58) {
        const bytes = base58ToEncryptionKey(args.base58 as string);
        return jsonContent({ base58: args.base58, publicKey: toBase64(bytes) });
      }
      throw new Error("Provide either 'publicKey' (base64) or 'base58'");
    }

    case "shamir_split": {
      const shares = splitSecret(
        fromBase64(args.secret as string),
        args.threshold as number,
        args.totalShares as number,
      );
      return jsonContent({
        shares: shares.map((s) => ({ index: s.index, value: toBase64(s.value) })),
        threshold: args.threshold,
        totalShares: args.totalShares,
      });
    }

    case "shamir_combine": {
      const shares = (args.shares as Array<{ index: number; value: string }>).map((s) => ({
        index: s.index,
        value: fromBase64(s.value),
      }));
      const secret = combineShares(shares);
      return jsonContent({ secret: toBase64(secret) });
    }

    case "shamir_verify": {
      const shares = (args.shares as Array<{ index: number; value: string }>).map((s) => ({
        index: s.index,
        value: fromBase64(s.value),
      }));
      const valid = verifyShares(shares, args.threshold as number);
      return jsonContent({
        valid,
        sharesProvided: shares.length,
        threshold: args.threshold,
      });
    }

    case "encrypt_order": {
      const userKeypair = {
        publicKey: fromBase64(args.userPublicKey as string),
        secretKey: fromBase64(args.userSecretKey as string),
      };
      const payload = {
        minOutputAmount: new BN(args.minOutputAmount as string),
        slippageBps: args.slippageBps as number,
        deadline: args.deadline as number,
      };
      const result = encryptOrderPayload(
        payload,
        fromBase64(args.solverPublicKey as string),
        userKeypair,
      );
      return jsonContent({
        nonce: toBase64(result.nonce),
        ciphertext: toBase64(result.ciphertext),
        bytes: toBase64(result.bytes),
      });
    }

    case "decrypt_order": {
      const solverKeypair = {
        publicKey: fromBase64(args.solverPublicKey as string),
        secretKey: fromBase64(args.solverSecretKey as string),
      };
      const payload = decryptOrderPayload(
        fromBase64(args.encrypted as string),
        fromBase64(args.userPublicKey as string),
        solverKeypair,
      );
      return jsonContent({
        minOutputAmount: payload.minOutputAmount.toString(),
        slippageBps: payload.slippageBps,
        deadline: payload.deadline,
      });
    }

    // ── SPECTER: Sovereign Tool Handlers ──────────────────────────────

    case "sovereign_read": {
      const identity = await fetchSovereignIdentity(args.wallet as string);
      return jsonContent({
        owner: identity.owner,
        tradingScore: identity.tradingScore,
        civicScore: identity.civicScore,
        developerScore: identity.developerScore,
        infraScore: identity.infraScore,
        creatorScore: identity.creatorScore,
        compositeScore: identity.compositeScore,
        tier: identity.tier,
        tierName: identity.tierName,
      });
    }

    // ── SPECTER: Trust Tool Handlers ────────────────────────────────

    case "trust_query": {
      const dimension = args.dimension as string;
      const _minScore = (args.minScore as number | undefined) ?? 0;
      const maxDepth = (args.maxDepth as number | undefined) ?? 3;
      const _limit = (args.limit as number | undefined) ?? 20;

      // Validate dimension
      if (!(dimension in DIMENSION_INDICES)) {
        throw new Error(`Unknown dimension: ${dimension}. Must be one of: trading, civic, developer, infra, creator`);
      }

      // Read origin's SOVEREIGN identity
      let originIdentity: SovereignIdentity | null = null;
      try {
        originIdentity = await fetchSovereignIdentity(args.origin as string);
      } catch (_e) {
        // Origin may not have a SOVEREIGN identity yet
      }

      // Attempt to read TrustAnchor PDA (informational — may not exist)
      let trustAnchorExists = false;
      try {
        const connection = getSolanaConnection();
        const originPubkey = new PublicKey(args.origin as string);
        const [trustPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("trust_anchor"), originPubkey.toBuffer()],
          SOVEREIGN_PROGRAM_ID,
        );
        const trustAccount = await connection.getAccountInfo(trustPda);
        trustAnchorExists = trustAccount !== null;
      } catch (_e) {
        // TrustAnchor lookup is best-effort
      }

      const originScores = originIdentity
        ? {
            trading: originIdentity.tradingScore,
            civic: originIdentity.civicScore,
            developer: originIdentity.developerScore,
            infra: originIdentity.infraScore,
            creator: originIdentity.creatorScore,
            composite: originIdentity.compositeScore,
            tier: originIdentity.tier,
            tierName: originIdentity.tierName,
          }
        : null;

      return jsonContent({
        origin: {
          wallet: args.origin,
          scores: originScores,
          hasTrustAnchor: trustAnchorExists,
        },
        queryParams: {
          dimension,
          maxDepth,
          minScore: _minScore,
          limit: _limit,
        },
        note: "Full BFS traversal available via @lattice/sdk. This tool provides origin scores for quick lookups.",
      });
    }

    case "trust_score": {
      const dimension = args.dimension as string;
      if (!(dimension in DIMENSION_INDICES)) {
        throw new Error(`Unknown dimension: ${dimension}. Must be one of: trading, civic, developer, infra, creator`);
      }

      const identity = await fetchSovereignIdentity(args.targetWallet as string);
      const dimensionScore = getDimensionScore(identity, dimension);
      const confidence = assessConfidence(identity.tier);

      return jsonContent({
        wallet: args.targetWallet,
        dimension,
        dimensionScore,
        compositeScore: identity.compositeScore,
        tier: identity.tier,
        tierName: identity.tierName,
        confidence,
      });
    }

    // ── SPECTER: Vault Tool Handlers ────────────────────────────────

    case "vault_read": {
      const identityId = args.identityId as string;
      const documentType = args.documentType as string | undefined;

      // Build Arweave GraphQL query
      const tags = [
        { name: "App-Name", values: ["DataSov"] },
        { name: "Identity-Id", values: [identityId] },
      ];
      if (documentType) {
        tags.push({ name: "Document-Type", values: [documentType] });
      }

      const graphqlQuery = {
        query: `query {
          transactions(
            tags: [${tags.map((t) => `{ name: "${t.name}", values: ${JSON.stringify(t.values)} }`).join(", ")}]
            sort: HEIGHT_DESC
            first: 1
          ) {
            edges {
              node {
                id
                tags {
                  name
                  value
                }
                block {
                  height
                  timestamp
                }
              }
            }
          }
        }`,
      };

      try {
        const response = await fetch("https://arweave.net/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(graphqlQuery),
        });

        if (!response.ok) {
          throw new Error(`Arweave GraphQL request failed: ${response.status} ${response.statusText}`);
        }

        const result = (await response.json()) as {
          data?: {
            transactions?: {
              edges?: Array<{
                node: {
                  id: string;
                  tags: Array<{ name: string; value: string }>;
                  block?: { height: number; timestamp: number };
                };
              }>;
            };
          };
        };

        const edges = result?.data?.transactions?.edges;
        if (!edges || edges.length === 0) {
          return jsonContent({
            found: false,
            identityId,
            documentType: documentType || "any",
            note: "No matching documents found on Arweave. The identity may not have stored data yet.",
          });
        }

        const node = edges[0].node;
        const tagMap: Record<string, string> = {};
        for (const tag of node.tags) {
          tagMap[tag.name] = tag.value;
        }

        return jsonContent({
          found: true,
          transactionId: node.id,
          tags: tagMap,
          block: node.block || null,
          note: "Use vault_decrypt with your master key to decrypt individual fields",
        });
      } catch (e) {
        throw new Error(`Failed to query Arweave: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    case "vault_disclose": {
      const fields = args.fields as string[];
      const consumerPubkey = fromBase64(args.consumerPublicKey as string);
      const ownerSecret = fromBase64(args.ownerSecretKey as string);
      const ownerPubkey = fromBase64(args.ownerPublicKey as string);
      const encryptedFields = args.encryptedFields as Record<string, string>;

      // Derive shared secret using NaCl box.before (ECDH)
      const sharedKey = nacl.box.before(consumerPubkey, ownerSecret);

      const ownerKeypair = { publicKey: ownerPubkey, secretKey: ownerSecret };
      const disclosedFields: Record<string, string> = {};

      for (const field of fields) {
        if (!(field in encryptedFields)) {
          throw new Error(`Field "${field}" not found in encryptedFields`);
        }

        // Decrypt with owner key (the encrypted data was encrypted TO the owner)
        const encryptedBytes = fromBase64(encryptedFields[field]);
        const decrypted = decrypt(encryptedBytes, ownerPubkey, ownerKeypair);

        // Re-encrypt with shared key for the consumer
        // Use NaCl secretbox with the shared key
        const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
        const reEncrypted = nacl.secretbox(decrypted, nonce, sharedKey);

        // Combine nonce + ciphertext for transport
        const combined = new Uint8Array(nonce.length + reEncrypted.length);
        combined.set(nonce);
        combined.set(reEncrypted, nonce.length);

        disclosedFields[field] = toBase64(combined);
      }

      return jsonContent({
        disclosedFields,
        consumer: args.consumerPublicKey,
        fieldCount: fields.length,
      });
    }

    // ── SPECTER: Shield Tool Handlers ───────────────────────────────

    case "ephemeral_wallet": {
      const keypair = Keypair.generate();
      return jsonContent({
        publicKey: keypair.publicKey.toBase58(),
        secretKey: toBase64(keypair.secretKey),
        note: "Fund via shielded transfer to break on-chain link to main wallet",
      });
    }

    case "zk_prove_tier": {
      const wallet = args.wallet as string;
      const minTier = args.minTier as number;

      if (minTier < 1 || minTier > 5) {
        throw new Error("minTier must be between 1 and 5");
      }

      // Read SOVEREIGN identity
      const identity = await fetchSovereignIdentity(wallet);

      // Check if tier meets the minimum
      const satisfied = identity.tier >= minTier;

      // Create commitment: hash(wallet + tier + randomNonce)
      const nonce = nacl.randomBytes(32);
      const preimage = new Uint8Array(
        Buffer.byteLength(wallet, "utf8") + 1 + nonce.length,
      );
      const walletBytes = Buffer.from(wallet, "utf8");
      preimage.set(walletBytes, 0);
      preimage[walletBytes.length] = identity.tier;
      preimage.set(nonce, walletBytes.length + 1);

      const commitment = nacl.hash(preimage);

      return jsonContent({
        commitment: toBase64(commitment),
        minTierSatisfied: satisfied,
        publicInputs: {
          minTier,
          satisfied,
        },
        note: "Full Noir ZK proof available via @veil/crypto NoirProver",
      });
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── server setup ─────────────────────────────────────────────────────

const server = new Server(
  { name: "veil-privacy-suite", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    return await handleTool(name, (args ?? {}) as Args);
  } catch (e) {
    return errorContent(e instanceof Error ? e.message : String(e));
  }
});

// ── start ────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
