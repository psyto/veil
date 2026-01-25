# Confidential Swap Router

MEV-protected swap router with encrypted order payloads on Solana.

## Overview

Confidential Swap Router enables users to submit swap orders with encrypted details, protecting them from MEV (Maximal Extractable Value) attacks such as frontrunning and sandwich attacks. Only authorized solvers can decrypt and execute orders, ensuring fair execution through Jupiter aggregator.

### How It Works

1. **User submits order**: Swap details (min output amount, slippage, deadline) are encrypted using the solver's public key (NaCl box encryption)
2. **Order stored on-chain**: The encrypted payload is stored in a PDA, with input tokens locked in a vault
3. **Solver decrypts & executes**: The solver decrypts the order, finds the optimal route via Jupiter, and executes the swap
4. **User claims output**: After execution, the user claims their output tokens

```
┌─────────────┐     encrypted      ┌─────────────┐     Jupiter     ┌─────────────┐
│    User     │ ────────────────▶ │   On-Chain  │ ◀────────────▶ │   Solver    │
│             │    order payload   │   Program   │    swap route   │             │
└─────────────┘                    └─────────────┘                 └─────────────┘
      │                                   │                              │
      │ 1. Encrypt order details          │ 2. Store in PDA              │
      │ 3. Lock input tokens              │                              │
      │                                   │ 4. Decrypt payload           │
      │                                   │ 5. Execute via Jupiter       │
      │ 6. Claim output tokens            │                              │
      └───────────────────────────────────┴──────────────────────────────┘
```

## Features

- **MEV Protection**: Order details encrypted until execution
- **Non-custodial**: Users retain control; can cancel pending orders anytime
- **Best Execution**: Solvers use Jupiter aggregator for optimal routing
- **Transparent**: All executions verifiable on-chain

## Project Structure

```
confidential-swap-router/
├── programs/                    # Solana/Anchor program
│   └── confidential-swap-router/
│       └── src/
│           ├── lib.rs          # Program instructions
│           ├── state/          # Account structures
│           ├── constants.rs    # Seeds & limits
│           └── error.rs        # Custom errors
├── sdk/                        # TypeScript SDK
│   └── src/
│       ├── encryption.ts       # NaCl box encryption
│       ├── client.ts           # Program client
│       └── index.ts            # Exports
├── solver/                     # Solver service
│   └── src/
│       ├── jupiter.ts          # Jupiter integration
│       ├── solver.ts           # Order execution
│       └── index.ts            # Entry point
├── app/                        # Next.js frontend
│   └── src/
│       └── pages/
│           └── index.tsx       # Swap interface
└── target/
    └── idl/                    # Program IDL
```

## Prerequisites

- [Rust](https://rustup.rs/) 1.75.0+
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) 1.18+
- [Anchor](https://www.anchor-lang.com/docs/installation) 0.30.0
- [Node.js](https://nodejs.org/) 18+
- [Yarn](https://yarnpkg.com/)

## Installation

```bash
# Clone the repository
git clone https://github.com/psyto/confidential-swap-router.git
cd confidential-swap-router

# Install dependencies
yarn install

# Build the program
anchor build --no-idl

# Install SDK dependencies
cd sdk && yarn install && cd ..

# Install solver dependencies
cd solver && yarn install && cd ..

# Install app dependencies
cd app && yarn install && cd ..
```

## Usage

### Deploy the Program

```bash
# Configure Solana CLI for devnet
solana config set --url devnet

# Airdrop SOL for deployment
solana airdrop 2

# Deploy
anchor deploy
```

### Run the Frontend

```bash
cd app
yarn dev
```

Open http://localhost:3000 in your browser.

### Run the Solver

```bash
cd solver

# Set environment variables
export SOLVER_KEYPAIR_PATH=/path/to/solver-keypair.json
export RPC_URL=https://api.devnet.solana.com

yarn dev
```

## Program Instructions

| Instruction | Description |
|-------------|-------------|
| `initialize_solver` | Initialize solver configuration (admin) |
| `submit_order` | Submit encrypted swap order |
| `execute_order` | Execute order (solver only) |
| `cancel_order` | Cancel pending order (owner only) |
| `claim_output` | Claim output tokens after execution |

## Encryption

Orders are encrypted using **NaCl box** (Curve25519-XSalsa20-Poly1305):

```typescript
import { createEncryptedOrder, generateEncryptionKeypair } from '@confidential-swap/sdk';

// Generate user encryption keypair
const userKeypair = generateEncryptionKeypair();

// Create encrypted order payload
const encryptedPayload = createEncryptedOrder(
  minOutputAmount,    // Minimum tokens to receive
  slippageBps,        // Slippage tolerance (e.g., 50 = 0.5%)
  deadline,           // Unix timestamp
  solverPublicKey,    // Solver's encryption public key
  userKeypair
);
```

## Security Considerations

- **Solver Trust**: Users must trust the solver to execute orders fairly
- **Key Management**: Solver encryption keys should be securely stored
- **Deadline**: Always set reasonable deadlines to prevent stale orders

## License

MIT

## Acknowledgments

- Built for [Colosseum Eternal Challenge](https://www.colosseum.com/)
- Inspired by [a16z crypto privacy research](https://a16zcrypto.com/posts/article/privacy-trends-moats-quantum-data-testing/)
- Powered by [Jupiter](https://jup.ag/) aggregator
