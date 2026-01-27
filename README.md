# Veil

> "MEV bots can't frontrun what they can't read."

Privacy-focused DeFi infrastructure for Solana, featuring encrypted swap orders and confidential RWA (Real World Asset) metadata management with ZK compression and shielded transfers.

## Overview

This monorepo contains two privacy-preserving protocols built on Solana:

1. **Confidential Swap Router** - MEV-protected token swaps with encrypted order payloads
2. **RWA Secrets Service** - Encrypted metadata management for tokenized real-world assets with selective disclosure

Both protocols share a common encryption library (`@veil/crypto`) that provides:
- NaCl box encryption (Curve25519-XSalsa20-Poly1305)
- Shamir's Secret Sharing for threshold decryption
- ZK compression via Light Protocol (~99% on-chain storage reduction)
- Shielded transfers via Privacy Cash SDK
- RPC provider configuration (Helius, Quicknode)

## Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                   Veil                                      │
├────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────┐    ┌─────────────────────────────┐       │
│  │  Confidential Swap Router   │    │    RWA Secrets Service      │       │
│  │                             │    │                             │       │
│  │  ┌─────────┐ ┌───────────┐ │    │  ┌─────────┐ ┌───────────┐ │       │
│  │  │ Program │ │    SDK    │ │    │  │ Program │ │    SDK    │ │       │
│  │  └─────────┘ └───────────┘ │    │  └─────────┘ └───────────┘ │       │
│  │  ┌─────────┐ ┌───────────┐ │    │  ┌───────────────────────┐ │       │
│  │  │ Solver  │ │  Frontend │ │    │  │       Frontend        │ │       │
│  │  │  + API  │ │           │ │    │  │                       │ │       │
│  │  └─────────┘ └───────────┘ │    │  └───────────────────────┘ │       │
│  └─────────────────────────────┘    └─────────────────────────────┘       │
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │                    @veil/crypto                           │   │
│  │    NaCl Box  •  Shamir's  •  ZK Compression  •  Shielded Transfers │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │                       RPC Providers                                 │   │
│  │           Helius (ZK support)  •  Quicknode  •  Custom              │   │
│  └────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
veil/
├── packages/
│   └── crypto/                      # Shared encryption library
│       ├── src/
│       │   ├── nacl-box.ts         # NaCl box encryption/decryption
│       │   ├── threshold.ts        # Shamir's Secret Sharing (M-of-N)
│       │   ├── payload.ts          # Binary payload serialization
│       │   ├── zk-compression.ts   # Light Protocol ZK compression
│       │   ├── shielded.ts         # Privacy Cash shielded transfers
│       │   └── rpc-providers.ts    # Helius/Quicknode RPC config
│       └── package.json
├── apps/
│   ├── confidential-swap-router/    # MEV-protected swap protocol
│   │   ├── programs/               # Anchor smart contract
│   │   ├── sdk/                    # TypeScript SDK
│   │   ├── solver/                 # Jupiter-integrated solver + API
│   │   │   └── src/
│   │   │       ├── api.ts          # REST API for key exchange
│   │   │       ├── solver.ts       # Order execution logic
│   │   │       └── jupiter.ts      # Jupiter aggregator client
│   │   └── app/                    # Next.js frontend
│   └── rwa-secrets-service/         # RWA secrets protocol
│       ├── programs/               # Anchor smart contract
│       ├── sdk/                    # TypeScript SDK
│       ├── tests/                  # Integration tests
│       └── app/                    # Next.js frontend
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

## Built For

[Solana PrivacyHack 2026](https://www.colosseum.org/privacyhack) - Privacy Infrastructure on Solana

### Bounty Eligibility

| Bounty | Technology Used |
|--------|-----------------|
| Light Protocol | ZK compression for order payloads and metadata |
| Privacy Cash | Shielded settlement for swap outputs |
| Helius | RPC provider with ZK compression support |
| Quicknode | RPC provider integration |

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
