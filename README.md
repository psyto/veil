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
│   │   ├── solver/                 # Jupiter-integrated solver
│   │   └── app/                    # Next.js frontend
│   └── rwa-secrets-service/         # RWA secrets protocol
│       ├── programs/               # Anchor smart contract
│       └── sdk/                    # TypeScript SDK
├── package.json                     # Workspace configuration
└── yarn.lock
```

## Confidential Swap Router

### Problem
Traditional DEX swaps expose order details (amounts, slippage) in the mempool, enabling MEV extraction through frontrunning and sandwich attacks.

### Solution
Users encrypt their order parameters (minimum output, slippage tolerance, deadline) using the solver's public key. Only the authorized solver can decrypt and execute the order, preventing MEV searchers from extracting value.

### How It Works
1. User creates swap order with encrypted payload containing sensitive parameters
2. Order is submitted on-chain with visible input amount but encrypted details
3. Solver decrypts the payload off-chain
4. Solver executes the swap via Jupiter aggregator
5. User claims output tokens

### Instructions
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

### How It Works
1. Issuer registers asset with encrypted metadata
2. Issuer grants access to specific parties (investors, auditors, regulators)
3. Each grantee receives an encrypted key share
4. Grantees can decrypt metadata according to their access level
5. All access is logged for audit trails

### Instructions
- `initialize_protocol` - Set up protocol configuration
- `register_asset` - Register new RWA with encrypted metadata
- `grant_access` - Grant decryption rights to a party
- `revoke_access` - Revoke access from a party
- `log_access` - Record access for audit trail
- `update_metadata` - Update encrypted metadata (issuer only)
- `deactivate_asset` - Deactivate an asset

### Access Levels
- **ViewBasic** - View basic asset information
- **ViewFull** - View complete encrypted metadata
- **Auditor** - Audit and compliance verification
- **Admin** - Full access including transfer capabilities

## Getting Started

### Prerequisites
- Node.js 18+
- Yarn
- Rust 1.70+
- Solana CLI / Agave
- Anchor 0.30+

### Installation

```bash
# Clone the repository
git clone https://github.com/psyto/solana-privacy-suite.git
cd solana-privacy-suite

# Install dependencies
yarn install

# Build shared crypto package
cd packages/crypto && yarn build && cd ../..

# Build SDKs
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

# Run tests (in another terminal)
cd apps/confidential-swap-router
anchor test

cd apps/rwa-secrets-service
anchor test
```

## Encryption Details

### NaCl Box
Uses Curve25519 for key exchange, XSalsa20 for encryption, and Poly1305 for authentication. Provides authenticated encryption ensuring both confidentiality and integrity.

### Threshold Encryption
Implements Shamir's Secret Sharing for M-of-N threshold decryption. Useful for:
- Multi-party approval workflows
- Regulatory compliance (multiple parties must approve access)
- Key recovery mechanisms

## Security Considerations

- Encryption keys are derived deterministically from wallet keys for convenience, but dedicated encryption keypairs are recommended for production
- Solver operators must secure their encryption private keys
- On-chain encrypted data is visible but unreadable without the corresponding private key
- Consider using hardware security modules (HSMs) for key management in production

## License

ISC

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
