# Veil

> "MEV bots can't frontrun what they can't read."

Privacy-focused DeFi infrastructure for Solana, featuring encrypted swap orders, confidential RWA metadata management, reputation-gated privacy, dark liquidity pools, and privacy-first token purchases.

## Overview

This monorepo contains five privacy-preserving applications built on Solana:

1. **Confidential Swap Router** - MEV-protected token swaps with encrypted order payloads
2. **RWA Secrets Service** - Encrypted metadata management for tokenized real-world assets
3. **Umbra** - Reputation-gated privacy DEX aggregator with SOVEREIGN identity integration
4. **DarkFlow** - Confidential AMM with dark liquidity pools and ZK-verified swaps
5. **ShadowLaunch** - Privacy-first token purchases on Pump.fun with ephemeral wallets

All applications share a common encryption library (`@privacy-suite/crypto`) that provides:
- NaCl box encryption (Curve25519-XSalsa20-Poly1305)
- Shamir's Secret Sharing for threshold decryption
- ZK compression via Light Protocol (~99% on-chain storage reduction)
- Shielded transfers via Privacy Cash SDK
- RPC provider configuration (Helius, Quicknode)

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                         Veil                                              │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │ Confidential     │  │ RWA Secrets      │  │ Umbra            │  │ DarkFlow         │ │
│  │ Swap Router      │  │ Service          │  │ (Reputation DEX) │  │ (Dark AMM)       │ │
│  │                  │  │                  │  │                  │  │                  │ │
│  │ • MEV Protection │  │ • Encrypted Meta │  │ • SOVEREIGN ID   │  │ • Hidden LP      │ │
│  │ • Jupiter        │  │ • Access Control │  │ • Tiered Fees    │  │ • ZK Swaps       │ │
│  │ • Shielded       │  │ • Audit Logging  │  │ • Dark Pool      │  │ • Noir Proofs    │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘ │
│                                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │                             ShadowLaunch                                          │   │
│  │               Privacy-first Pump.fun • Ephemeral Wallets • Shielded Transfers     │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │                           @privacy-suite/crypto                                   │   │
│  │    NaCl Box  •  Shamir's  •  ZK Compression  •  Shielded Transfers  •  RPC        │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              RPC Providers                                        │   │
│  │            Helius (ZK support)  •  Quicknode  •  Custom  •  Light Protocol        │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
veil/
├── packages/
│   ├── crypto/                      # Shared encryption library (@privacy-suite/crypto)
│   │   ├── src/
│   │   │   ├── nacl-box.ts         # NaCl box encryption/decryption
│   │   │   ├── threshold.ts        # Shamir's Secret Sharing (M-of-N)
│   │   │   ├── payload.ts          # Binary payload serialization
│   │   │   ├── zk-compression.ts   # Light Protocol ZK compression
│   │   │   ├── shielded.ts         # Privacy Cash shielded transfers
│   │   │   └── rpc-providers.ts    # Helius/Quicknode RPC config
│   │   └── package.json
│   └── fairscore-middleware/        # FairScore integration (@umbra/fairscore-middleware)
├── apps/
│   ├── confidential-swap-router/    # MEV-protected swap protocol
│   │   ├── programs/               # Anchor smart contract
│   │   ├── sdk/                    # TypeScript SDK
│   │   ├── solver/                 # Jupiter-integrated solver + API
│   │   └── app/                    # Next.js frontend
│   ├── rwa-secrets-service/         # RWA secrets protocol
│   │   ├── programs/               # Anchor smart contract
│   │   ├── sdk/                    # TypeScript SDK
│   │   └── app/                    # Next.js frontend
│   ├── umbra/                       # Reputation-gated privacy DEX
│   │   ├── programs/umbra-swap/    # Anchor smart contract
│   │   ├── sdk/                    # TypeScript SDK (SOVEREIGN + FairScore)
│   │   ├── solver/                 # Order execution service
│   │   └── app/                    # Next.js frontend
│   ├── darkflow/                    # Confidential AMM with dark pools
│   │   ├── programs/darkflow/      # Anchor smart contract
│   │   ├── sdk/                    # TypeScript SDK
│   │   ├── solver/                 # Order execution service
│   │   └── app/                    # Next.js frontend
│   └── shadowlaunch/                # Privacy-first Pump.fun purchases
│       └── src/
│           ├── app/                # Next.js App Router
│           ├── components/         # UI components
│           ├── hooks/              # React hooks
│           └── lib/                # Shadow purchase logic
├── package.json                     # Workspace configuration
└── yarn.lock
```

## Confidential Swap Router

### Problem
Traditional DEX swaps expose order details (amounts, slippage) in the mempool, enabling MEV extraction through frontrunning and sandwich attacks.

### Solution
Users encrypt their order parameters (minimum output, slippage tolerance, deadline) using the solver's public key. Only the authorized solver can decrypt and execute the order, preventing MEV searchers from extracting value.

### Key Features
- **MEV Protection**: Order details encrypted until execution
- **Jupiter Integration**: Real-time quotes and optimal routing
- **Non-custodial**: Users retain control; can cancel pending orders
- **Solver API**: REST endpoints for encryption key exchange
- **ZK Compression**: Optional Light Protocol integration for ~99% on-chain storage reduction
- **Shielded Settlement**: Optional Privacy Cash integration for private output delivery

### How It Works
1. Frontend fetches solver's encryption public key via API
2. User creates swap order with encrypted payload
3. Order is submitted on-chain with input tokens locked
4. Solver decrypts and executes via Jupiter aggregator
5. User claims output tokens

### Solver API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/solver-pubkey` | GET | Get solver's encryption public key |
| `/api/register-encryption-pubkey` | POST | Register user's encryption pubkey |
| `/api/health` | GET | Health check |

### Program Instructions
- `initialize_solver` - Register a new solver with encryption public key
- `submit_order` - Submit encrypted swap order
- `execute_order` - Solver executes the order
- `cancel_order` - User cancels pending order
- `claim_output` - User claims executed swap output

## RWA Secrets Service

### Problem
Tokenized real-world assets require confidential metadata (valuations, legal documents, ownership details) that should only be accessible to authorized parties.

### Solution
Asset metadata is encrypted on-chain, with selective disclosure through encrypted key shares. Supports role-based access control and threshold decryption for regulatory compliance.

### Key Features
- **End-to-End Encryption**: Metadata encrypted with NaCl box
- **Granular Access Control**: Four access levels
- **Access Delegation**: Optional delegation rights
- **Expiration Support**: Time-limited access grants
- **Audit Logging**: On-chain access records
- **ZK Access Proofs**: Optional ZK proofs for privacy-preserving access verification
- **Compressed Metadata**: Optional Light Protocol compression for reduced costs

### How It Works
1. Issuer registers asset with encrypted metadata
2. Issuer grants access to specific parties (investors, auditors, regulators)
3. Each grantee receives an encrypted key share
4. Grantees can decrypt metadata according to their access level
5. All access is logged for audit trails

### Access Levels
| Level | Description |
|-------|-------------|
| **ViewBasic** | View basic asset information |
| **ViewFull** | View complete encrypted metadata |
| **Auditor** | Audit and compliance verification |
| **Admin** | Full access including transfer capabilities |

### Asset Types
- Real Estate
- Securities
- Commodities
- Receivables
- Intellectual Property
- Equipment

### Program Instructions
- `initialize_protocol` - Set up protocol configuration
- `register_asset` - Register new RWA with encrypted metadata
- `grant_access` - Grant decryption rights to a party
- `revoke_access` - Revoke access from a party
- `log_access` - Record access for audit trail
- `update_metadata` - Update encrypted metadata (issuer only)
- `deactivate_asset` - Deactivate an asset

## Umbra - Reputation-Gated Privacy DEX

### Problem
Current privacy solutions treat all users equally, enabling sybil attacks and providing no incentive to build reputation. Traders lose $500M+ annually to MEV extraction.

### Solution
Umbra uses on-chain reputation (via SOVEREIGN protocol or FairScore) to unlock execution quality tiers. Higher reputation = lower fees, better MEV protection, and access to dark pools.

### Key Features
- **SOVEREIGN Integration**: Universal on-chain identity with multi-dimensional reputation
- **Tiered Fees**: 0.05% - 0.50% based on reputation tier
- **MEV Protection Levels**: From none to VIP routing
- **Dark Pool Access**: High-tier users can access confidential liquidity
- **Priority Execution**: Diamond tier gets VIP order routing

### Reputation Tiers (SOVEREIGN)
| Tier | Fee Discount | MEV Protection | Dark Pool |
|------|--------------|----------------|-----------|
| Bronze (1) | 0% | None | No |
| Silver (2) | 5% | Basic | No |
| Gold (3) | 15% | Full encryption | No |
| Platinum (4) | 30% | Full + Priority | Yes |
| Diamond (5) | 50% | VIP routing | Yes |

## DarkFlow - Confidential AMM

### Problem
Traditional AMMs expose LP positions and swap amounts, enabling whale watchers and MEV bots to target users.

### Solution
DarkFlow brings institutional-grade dark pool mechanics to Solana with encrypted LP positions and ZK-verified swaps.

### Key Features
- **Hidden LP Positions**: Nobody knows how much you deposited
- **Dark Swaps**: MEV-impossible trades with Noir ZK proofs
- **Confidential Token Launches**: Private bonding curves prevent front-running
- **Arcium Integration**: Encrypted shared state for dark pools

### Privacy Model
| Data | Visibility |
|------|------------|
| Individual LP amounts | Encrypted (only owner sees) |
| Swap amounts | ZK verified, never revealed |
| Order parameters | Encrypted (only solver sees) |
| Launch purchases | Encrypted (only buyer sees) |

## ShadowLaunch - Privacy-First Pump.fun

### Problem
On-chain purchases on Pump.fun are fully transparent, allowing whale watchers to track your accumulation and front-run your trades.

### Solution
ShadowLaunch breaks the on-chain link between your wallet and your purchases using ephemeral wallets and shielded transfers.

### Key Features
- **Shadow Mode**: Toggle between standard and private purchases
- **Ephemeral Wallets**: Each purchase uses a fresh wallet with no history
- **Shielded Transfers**: Funds route through privacy pool
- **Token Browser**: Real-time bonding curve data from Pump.fun

### How Shadow Mode Works
```
Main Wallet → Privacy Pool → Ephemeral Wallet → Pump.fun Purchase
                 ↓
         Link broken here
```

## Getting Started

### Prerequisites
- Node.js 18+
- Yarn
- Rust 1.75+
- Solana CLI 1.18+
- Anchor 0.30+

### Installation

```bash
# Clone the repository
git clone https://github.com/psyto/veil.git
cd veil

# Install dependencies
yarn install

# Build all packages
yarn build
```

### Building Anchor Programs

```bash
# Build Confidential Swap Router
cd apps/confidential-swap-router
anchor build --no-idl

# Build RWA Secrets Service
cd apps/rwa-secrets-service
anchor build --no-idl
```

### Running Tests

```bash
# Start local validator
solana-test-validator

# Deploy programs (in another terminal)
cd apps/confidential-swap-router && anchor deploy
cd apps/rwa-secrets-service && anchor deploy

# Run tests
cd apps/confidential-swap-router
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 ANCHOR_WALLET=~/.config/solana/id.json yarn run ts-mocha -p ./tsconfig.json -t 1000000 "tests/**/*.ts"

cd apps/rwa-secrets-service
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 ANCHOR_WALLET=~/.config/solana/id.json yarn run ts-mocha -p ./tsconfig.json -t 1000000 "tests/**/*.ts"
```

### Running the Applications

#### Confidential Swap Router

```bash
# Terminal 1: Start the solver (includes API server)
cd apps/confidential-swap-router/solver
export SOLVER_KEYPAIR_PATH=/path/to/solver-keypair.json
export RPC_URL=https://api.devnet.solana.com
yarn dev

# Terminal 2: Start the frontend
cd apps/confidential-swap-router/app
yarn dev
```

Open http://localhost:3000

**Frontend Features:**
- Real-time Jupiter quotes with price impact
- Configurable slippage (0.1%, 0.5%, 1.0%, custom)
- Order management (view, cancel, claim)
- Solver connection status indicator

#### RWA Secrets Service

```bash
cd apps/rwa-secrets-service/app
yarn dev -p 3001
```

Open http://localhost:3001

**Frontend Features:**
- Register assets with encrypted metadata
- Grant/revoke access with configurable levels
- Set access expiration and delegation rights
- View all assets and access grants
- Real-time on-chain data

## Encryption & Privacy Features

### NaCl Box
Uses Curve25519 for key exchange, XSalsa20 for encryption, and Poly1305 for authentication. Provides authenticated encryption ensuring both confidentiality and integrity.

```typescript
import { generateEncryptionKeypair, encrypt, decrypt } from '@veil/crypto';

const keypair = generateEncryptionKeypair();
const encrypted = encrypt(data, recipientPublicKey, keypair);
const decrypted = decrypt(encrypted, senderPublicKey, recipientKeypair);
```

### Threshold Encryption
Implements Shamir's Secret Sharing for M-of-N threshold decryption. Useful for:
- Multi-party approval workflows
- Regulatory compliance (multiple parties must approve access)
- Key recovery mechanisms

```typescript
import { splitSecret, combineShares } from '@veil/crypto';

// Split secret into 5 shares, requiring 3 to reconstruct
const shares = splitSecret(secretKey, 5, 3);

// Reconstruct with any 3 shares
const recovered = combineShares([shares[0], shares[2], shares[4]]);
```

### ZK Compression (Light Protocol)
Compress on-chain data using Light Protocol's ZK compression for ~99% storage reduction.

```typescript
import { createZkRpc, compressData, transferCompressedTokens } from '@veil/crypto';

// Create ZK-enabled RPC connection
const rpc = createZkRpc('https://devnet.helius-rpc.com/?api-key=YOUR_KEY');

// Compress data
const compressed = await compressData(rpc, data, payer);

// Transfer compressed tokens
const txId = await transferCompressedTokens(rpc, payer, mint, amount, owner, recipient);
```

### Shielded Transfers (Privacy Cash)
Enable private transfers with shielded balances using Privacy Cash SDK.

```typescript
import { PrivacyCashClient, shieldTokens, unshieldTokens } from '@veil/crypto';

// Create Privacy Cash client
const client = new PrivacyCashClient(connection, wallet, 'SOL');

// Shield tokens (deposit to private balance)
const depositResult = await client.deposit(1000000n);

// Unshield tokens (withdraw from private balance)
const withdrawResult = await client.withdraw(500000n, recipient);

// Get private balance
const balance = await client.getPrivateBalance();
```

### RPC Provider Configuration
Easily connect to supported RPC providers with ZK compression support.

```typescript
import { createHeliusRpc, createQuicknodeRpc, createRpcFromEnv } from '@veil/crypto';

// Using Helius (recommended for ZK compression)
const { connection, zkRpc } = createHeliusRpc('YOUR_HELIUS_API_KEY', 'devnet');

// Using Quicknode
const { connection } = createQuicknodeRpc('YOUR_QUICKNODE_ENDPOINT', 'devnet');

// Auto-configure from environment variables
const rpcConnections = createRpcFromEnv();
```

## Security Considerations

- **Key Management**: Dedicated encryption keypairs are recommended for production
- **Solver Trust**: Users must trust solver operators to execute orders fairly
- **HSM Support**: Consider hardware security modules for key storage in production
- **Access Expiration**: Always set reasonable expiration times for access grants
- **Audit Logs**: Regularly review on-chain audit logs for unauthorized access

## Tech Stack

- **Blockchain**: Solana
- **Smart Contracts**: Anchor 0.30
- **Frontend**: Next.js 14, React 18, TailwindCSS
- **Encryption**: TweetNaCl (NaCl implementation)
- **ZK Compression**: Light Protocol
- **Shielded Transfers**: Privacy Cash SDK
- **DEX Aggregation**: Jupiter API
- **Wallet Integration**: Solana Wallet Adapter
- **RPC Providers**: Helius (recommended), Quicknode

## Environment Configuration

Copy the `.env.example` files and configure your RPC provider:

```bash
# Apps use NEXT_PUBLIC_ prefix for frontend access
cp apps/confidential-swap-router/app/.env.example apps/confidential-swap-router/app/.env.local
cp apps/confidential-swap-router/solver/.env.example apps/confidential-swap-router/solver/.env
cp apps/rwa-secrets-service/app/.env.example apps/rwa-secrets-service/app/.env.local
```

### Supported RPC Providers

| Provider | ZK Compression | Setup |
|----------|----------------|-------|
| **Helius** (Recommended) | Yes | Get API key at [helius.dev](https://helius.dev/) |
| **Quicknode** | Varies | Get endpoint at [quicknode.com](https://www.quicknode.com/) |
| **Custom** | Manual | Any Solana RPC endpoint |

## Philosophy

We believe financial privacy is a fundamental human right. Read our full philosophical background in [PHILOSOPHY.md](./PHILOSOPHY.md).

> "Privacy is not about having something to hide. Privacy is about having something to protect."

## Deployed Programs (Devnet)

| Program | Program ID | Explorer |
|---------|-----------|----------|
| Confidential Swap Router | `v7th9XoyXeonxKLPsKdcgaNsSMLR44HDY7hadD7CCRM` | [View](https://explorer.solana.com/address/v7th9XoyXeonxKLPsKdcgaNsSMLR44HDY7hadD7CCRM?cluster=devnet) |
| RWA Secrets Service | `DWgiBrRNa3JM3XWkPXGXwo7jJ59PvXVr3bVeyKbGySam` | [View](https://explorer.solana.com/address/DWgiBrRNa3JM3XWkPXGXwo7jJ59PvXVr3bVeyKbGySam?cluster=devnet) |
| Umbra Swap | `41Ps5GR2E6QbXRDaXjAcQCcKmPR942VYLRQQDqdkQXLr` | [View](https://explorer.solana.com/address/41Ps5GR2E6QbXRDaXjAcQCcKmPR942VYLRQQDqdkQXLr?cluster=devnet) |

## Built For

- [Solana PrivacyHack 2026](https://www.colosseum.org/privacyhack) - Privacy Infrastructure on Solana
- [FairScale Hackathon 2026](https://fairscale.xyz/) - Reputation-based applications (Umbra)
- [Pump.fun Build In Public Hackathon 2026](https://pump.fun) - Privacy-first token purchases (ShadowLaunch)

### Bounty Eligibility

| Bounty | Technology Used | Apps |
|--------|-----------------|------|
| Light Protocol | ZK compression for payloads and metadata | All |
| Privacy Cash | Shielded settlement for swap outputs | Swap Router, DarkFlow |
| Helius | RPC provider with ZK compression support | All |
| Quicknode | RPC provider integration | ShadowLaunch, All |
| Arcium | Encrypted shared state for dark pools | DarkFlow |
| Aztec/Noir | ZK proofs for swap validity | DarkFlow |
| FairScale | Reputation-gated trading | Umbra |

## License

ISC

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Acknowledgments

- Inspired by [a16z crypto privacy research](https://a16zcrypto.com/posts/article/privacy-trends-moats-quantum-data-testing/)
- Powered by [Jupiter](https://jup.ag/) aggregator
- Built with [Anchor](https://www.anchor-lang.com/) framework
- ZK compression by [Light Protocol](https://lightprotocol.com/)
- Shielded transfers by [Privacy Cash](https://privacycash.io/)
- RPC infrastructure by [Helius](https://helius.dev/) and [Quicknode](https://www.quicknode.com/)
- Reputation by [SOVEREIGN Protocol](https://github.com/psyto/sovereign) and [FairScale](https://fairscale.xyz/)
- Token launches by [Pump.fun](https://pump.fun)
- Encrypted state by [Arcium](https://arcium.com/)
- ZK proofs by [Noir](https://noir-lang.org/)
