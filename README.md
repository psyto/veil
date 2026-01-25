# Solana Privacy Suite

Privacy-focused DeFi infrastructure for Solana, featuring encrypted swap orders and confidential RWA (Real World Asset) metadata management.

## Overview

This monorepo contains two privacy-preserving protocols built on Solana:

1. **Confidential Swap Router** - MEV-protected token swaps with encrypted order payloads
2. **RWA Secrets Service** - Encrypted metadata management for tokenized real-world assets with selective disclosure

Both protocols share a common encryption library (`@privacy-suite/crypto`) that provides:
- NaCl box encryption (Curve25519-XSalsa20-Poly1305)
- Shamir's Secret Sharing for threshold decryption
- Payload serialization utilities

## Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          Solana Privacy Suite                               │
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
│  │                    @privacy-suite/crypto                           │   │
│  │         NaCl Box  •  Shamir's Secret Sharing  •  Payloads          │   │
│  └────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
solana-privacy-suite/
├── packages/
│   └── crypto/                      # Shared encryption library
│       ├── src/
│       │   ├── nacl-box.ts         # NaCl box encryption/decryption
│       │   ├── threshold.ts        # Shamir's Secret Sharing (M-of-N)
│       │   └── payload.ts          # Binary payload serialization
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
git clone https://github.com/psyto/solana-privacy-suite.git
cd solana-privacy-suite

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

## Encryption Details

### NaCl Box
Uses Curve25519 for key exchange, XSalsa20 for encryption, and Poly1305 for authentication. Provides authenticated encryption ensuring both confidentiality and integrity.

```typescript
import { generateEncryptionKeypair, encrypt, decrypt } from '@privacy-suite/crypto';

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
import { splitSecret, combineShares } from '@privacy-suite/crypto';

// Split secret into 5 shares, requiring 3 to reconstruct
const shares = splitSecret(secretKey, 5, 3);

// Reconstruct with any 3 shares
const recovered = combineShares([shares[0], shares[2], shares[4]]);
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
- **DEX Aggregation**: Jupiter API
- **Wallet Integration**: Solana Wallet Adapter

## Built For

[Colosseum Eternal Challenge](https://www.colosseum.com/) - Privacy & Security Track

## License

ISC

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Acknowledgments

- Inspired by [a16z crypto privacy research](https://a16zcrypto.com/posts/article/privacy-trends-moats-quantum-data-testing/)
- Powered by [Jupiter](https://jup.ag/) aggregator
- Built with [Anchor](https://www.anchor-lang.com/) framework
