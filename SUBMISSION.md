# Solana PrivacyHack 2026 - Submission

## Project: Veil

**Track:** Open Track (Confidential Swap Router) + Privacy Tooling (RWA Secrets Service)

**Repository:** https://github.com/psyto/veil

---

## Philosophy

> **"MEV bots can't frontrun what they can't read."**

> **"Not about hiding from regulators. It's about not exposing everything to everyone."**

Public blockchains created a paradox: systems designed for financial freedom became the most surveilled financial infrastructure in history. Every transaction is permanent. Every intention is broadcast. Every strategy is exposed.

**Veil addresses two consequences of this transparency:**

1. **MEV Extraction** — When trading intentions are public, sophisticated actors extract value through frontrunning and sandwich attacks. The Confidential Swap Router encrypts orders so MEV bots see only ciphertext.

2. **Business Confidentiality** — Tokenized assets need sensitive metadata on-chain, but total transparency destroys competitive advantage. The RWA Secrets Service implements selective disclosure — encrypted by default, disclosed by choice.

Read our full philosophy: [PHILOSOPHY.md](./PHILOSOPHY.md)

---

## Overview

Veil is a collection of privacy-preserving protocols for Solana featuring:

1. **Confidential Swap Router** - MEV-protected token swaps with encrypted order payloads
2. **RWA Secrets Service** - Encrypted metadata management for tokenized real-world assets

Both applications share a common cryptographic library (`@veil/crypto`) that provides:
- NaCl box encryption (Curve25519-XSalsa20-Poly1305)
- Shamir's Secret Sharing for threshold decryption
- ZK compression via Light Protocol
- Shielded transfers via Privacy Cash SDK
- RPC provider configuration (Helius, Quicknode)

---

## Deployed Programs (Devnet)

| Program | Program ID | Explorer |
|---------|-----------|----------|
| Confidential Swap Router | `v7th9XoyXeonxKLPsKdcgaNsSMLR44HDY7hadD7CCRM` | [View](https://explorer.solana.com/address/v7th9XoyXeonxKLPsKdcgaNsSMLR44HDY7hadD7CCRM?cluster=devnet) |
| RWA Secrets Service | `DWgiBrRNa3JM3XWkPXGXwo7jJ59PvXVr3bVeyKbGySam` | [View](https://explorer.solana.com/address/DWgiBrRNa3JM3XWkPXGXwo7jJ59PvXVr3bVeyKbGySam?cluster=devnet) |

---

## Bounty Eligibility

### Light Protocol (ZK Compression)
- **Integration:** ZK compression for encrypted order payloads and asset metadata
- **Files:** `packages/crypto/src/zk-compression.ts`
- **Benefits:** ~99% on-chain storage reduction

### Privacy Cash SDK (Shielded Transfers)
- **Integration:** Shielded settlement for swap outputs
- **Files:** `packages/crypto/src/shielded.ts`
- **Benefits:** Private token transfers with ZK proofs

### Helius RPC ($5,000 bounty)
- **Integration:** RPC provider with ZK compression support
- **Files:** `packages/crypto/src/rpc-providers.ts`
- **Configuration:** `NEXT_PUBLIC_HELIUS_API_KEY` / `HELIUS_API_KEY`

### Quicknode RPC ($3,000 bounty)
- **Integration:** RPC provider support
- **Files:** `packages/crypto/src/rpc-providers.ts`
- **Configuration:** `NEXT_PUBLIC_QUICKNODE_ENDPOINT` / `QUICKNODE_ENDPOINT`

---

## Technical Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          Veil                               │
├────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────┐    ┌─────────────────────────────┐       │
│  │  Confidential Swap Router   │    │    RWA Secrets Service      │       │
│  │         (Open Track)        │    │    (Privacy Tooling)        │       │
│  │                             │    │                             │       │
│  │  • MEV Protection           │    │  • Encrypted Metadata       │       │
│  │  • Jupiter Integration      │    │  • Access Control           │       │
│  │  • Encrypted Orders         │    │  • Audit Logging            │       │
│  │  • Shielded Settlement      │    │  • ZK Access Proofs         │       │
│  └─────────────────────────────┘    └─────────────────────────────┘       │
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │                    @veil/crypto                           │   │
│  │                                                                     │   │
│  │  NaCl Box  •  Shamir's  •  ZK Compression  •  Shielded Transfers  │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │                       RPC Providers                                 │   │
│  │           Helius (ZK support)  •  Quicknode  •  Custom              │   │
│  └────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Confidential Swap Router

### Problem
Traditional DEX swaps expose order details in the mempool, enabling MEV extraction through frontrunning and sandwich attacks.

### Solution
Users encrypt order parameters using the solver's public key. Only the authorized solver can decrypt and execute orders via Jupiter aggregator.

### Key Features
- **MEV Protection:** Order details encrypted until execution
- **Jupiter Integration:** Real-time quotes and optimal routing
- **Non-custodial:** Users retain control; can cancel pending orders
- **ZK Compression:** ~99% on-chain storage reduction (Light Protocol)
- **Shielded Settlement:** Private output delivery (Privacy Cash)

### Flow
```
1. User fetches solver's encryption pubkey via API
2. User encrypts swap order (amount, slippage, deadline)
3. Order submitted on-chain with input tokens locked
4. Solver decrypts and executes via Jupiter
5. User claims output tokens (optionally shielded)
```

---

## RWA Secrets Service

### Problem
Tokenized real-world assets require confidential metadata that should only be accessible to authorized parties.

### Solution
Asset metadata is encrypted on-chain with selective disclosure through encrypted key shares. Supports role-based access control.

### Key Features
- **End-to-End Encryption:** NaCl box encryption
- **Granular Access Control:** Four access levels
- **Access Delegation:** Optional delegation rights
- **Expiration Support:** Time-limited access grants
- **ZK Access Proofs:** Privacy-preserving verification
- **Compressed Storage:** ~99% cost reduction

### Access Levels
| Level | Description |
|-------|-------------|
| ViewBasic | Basic asset information |
| ViewFull | Complete encrypted metadata |
| Auditor | Audit and compliance verification |
| Admin | Full access including transfers |

---

## Quick Start

### Prerequisites
- Node.js 18+
- Yarn
- Solana CLI 1.18+

### Installation
```bash
git clone https://github.com/psyto/veil.git
cd veil
yarn install
```

### Configuration
```bash
# Copy environment files
cp apps/confidential-swap-router/app/.env.example apps/confidential-swap-router/app/.env.local
cp apps/confidential-swap-router/solver/.env.example apps/confidential-swap-router/solver/.env
cp apps/rwa-secrets-service/app/.env.example apps/rwa-secrets-service/app/.env.local

# Add your Helius API key (recommended) or Quicknode endpoint
```

### Run Confidential Swap Router
```bash
# Terminal 1: Start solver
cd apps/confidential-swap-router/solver
yarn dev

# Terminal 2: Start frontend
cd apps/confidential-swap-router/app
yarn dev
```
Open http://localhost:3000

### Run RWA Secrets Service
```bash
cd apps/rwa-secrets-service/app
yarn dev
```
Open http://localhost:3001

### Verify Deployment
```bash
npx ts-node --esm scripts/verify-deployment.ts
```

---

## Code Examples

### Encrypt Swap Order
```typescript
import { createEncryptedOrder, generateEncryptionKeypair } from '@confidential-swap/sdk';

const userKeypair = generateEncryptionKeypair();
const encrypted = createEncryptedOrder(
  { minOutputAmount: 1000000n, slippageBps: 50, deadline: Date.now() + 3600000 },
  solverPublicKey,
  userKeypair
);
```

### Encrypt RWA Metadata
```typescript
import { encryptAssetMetadata, generateEncryptionKeypair } from '@rwa-secrets/sdk';

const keypair = generateEncryptionKeypair();
const encrypted = encryptAssetMetadata({
  valuationUsdCents: 100000000n,
  jurisdictionCode: 'US',
  additionalInfo: JSON.stringify({ name: 'Office Building' })
}, keypair);
```

### ZK Compression
```typescript
import { createHeliusRpc, compressData } from '@veil/crypto';

const { zkRpc } = createHeliusRpc('YOUR_HELIUS_API_KEY', 'devnet');
const compressed = await compressData(zkRpc, data, payer);
// ~99% storage reduction
```

### Shielded Transfer
```typescript
import { PrivacyCashClient } from '@veil/crypto';

const client = new PrivacyCashClient(connection, wallet, 'SOL');
await client.deposit(1000000n);  // Shield tokens
await client.withdraw(500000n, recipient);  // Unshield
```

---

## Project Structure

```
veil/
├── packages/
│   └── crypto/                     # Shared encryption library
│       ├── src/
│       │   ├── nacl-box.ts        # NaCl box encryption
│       │   ├── threshold.ts       # Shamir's Secret Sharing
│       │   ├── zk-compression.ts  # Light Protocol integration
│       │   ├── shielded.ts        # Privacy Cash integration
│       │   └── rpc-providers.ts   # Helius/Quicknode config
├── apps/
│   ├── confidential-swap-router/
│   │   ├── programs/              # Anchor program
│   │   ├── sdk/                   # TypeScript SDK
│   │   ├── solver/                # Jupiter solver + API
│   │   └── app/                   # Next.js frontend
│   └── rwa-secrets-service/
│       ├── programs/              # Anchor program
│       ├── sdk/                   # TypeScript SDK
│       └── app/                   # Next.js frontend
├── scripts/                       # Test scripts
└── SUBMISSION.md                  # This file
```

---

## Testing

All tests pass on devnet:

```
✓ Network Connectivity
✓ Wallet Configuration
✓ Confidential Swap Router Program (deployed & executable)
✓ RWA Secrets Service Program (deployed & executable)
✓ Swap Router PDA Derivation
✓ RWA Secrets PDA Derivation
✓ Encryption Functions
✓ Threshold Secret Sharing
```

Run tests:
```bash
npx ts-node --esm scripts/verify-deployment.ts
```

---

## Security Considerations

- **Key Management:** Dedicated encryption keypairs recommended for production
- **Solver Trust:** Users must trust solver operators to execute orders fairly
- **Access Expiration:** Always set reasonable expiration times for access grants
- **HSM Support:** Consider hardware security modules for key storage

---

## Tech Stack

- **Blockchain:** Solana
- **Smart Contracts:** Anchor 0.30
- **Frontend:** Next.js 14, React 18, TailwindCSS
- **Encryption:** TweetNaCl
- **ZK Compression:** Light Protocol
- **Shielded Transfers:** Privacy Cash SDK
- **DEX Aggregation:** Jupiter API
- **RPC Providers:** Helius, Quicknode

---

## Philosophy

We believe financial privacy is a fundamental human right—as essential as freedom of speech and assembly.

> "Privacy is not about having something to hide. Privacy is about having something to protect."

Read our full philosophical background: [PHILOSOPHY.md](./PHILOSOPHY.md)

**Key principles:**
- Privacy by default
- User sovereignty over data
- Selective disclosure for compliance
- Open source for trust through verification

---

## Team

**psyto** - Solo developer

---

## Links

- **GitHub:** https://github.com/psyto/veil
- **Swap Router Program:** https://explorer.solana.com/address/v7th9XoyXeonxKLPsKdcgaNsSMLR44HDY7hadD7CCRM?cluster=devnet
- **RWA Secrets Program:** https://explorer.solana.com/address/DWgiBrRNa3JM3XWkPXGXwo7jJ59PvXVr3bVeyKbGySam?cluster=devnet

---

## Acknowledgments

- [Light Protocol](https://lightprotocol.com/) - ZK compression
- [Privacy Cash](https://privacycash.io/) - Shielded transfers
- [Jupiter](https://jup.ag/) - DEX aggregation
- [Helius](https://helius.dev/) - RPC infrastructure
- [Quicknode](https://www.quicknode.com/) - RPC infrastructure
- [Anchor](https://www.anchor-lang.com/) - Solana framework
