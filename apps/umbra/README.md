# Umbra - Reputation-Gated Privacy DeFi

> **"Stop losing money to MEV bots. Earn privacy through your on-chain reputation."**

Umbra is a privacy-first DEX aggregator on Solana that uses on-chain reputation to unlock execution quality tiers. Higher reputation = lower fees, better MEV protection, and access to advanced order types.

Umbra uses **SOVEREIGN** - Universal on-chain identity with multi-dimensional reputation for tier determination.

## The Problem

DeFi traders lose **$500M+ annually** to MEV extraction. Front-running, sandwich attacks, and other forms of value extraction hurt users and create an unfair trading environment.

Current solutions (like private mempools) treat all users equally, which:
- Enables sybil attacks
- Doesn't reward good actors
- Provides no incentive to build reputation

## The Solution

Umbra introduces **reputation-gated privacy**: your SOVEREIGN identity unlocks execution quality tiers.

## SOVEREIGN Integration

Umbra integrates with [SOVEREIGN](https://github.com/psyto/sovereign), a universal identity and multi-dimensional reputation protocol on Solana. Your SOVEREIGN identity provides portable reputation that works across multiple applications.

### How It Works

```
SOVEREIGN Identity                    Umbra Benefits
──────────────────                    ──────────────
Tier 1 (Bronze)     ───────────────►  0.50% fee, No MEV protection
Tier 2 (Silver)     ───────────────►  0.30% fee + 5% discount, Basic MEV
Tier 3 (Gold)       ───────────────►  0.15% fee + 15% discount, Full MEV
Tier 4 (Platinum)   ───────────────►  0.08% fee + 30% discount, Dark pool access
Tier 5 (Diamond)    ───────────────►  0.05% fee + 50% discount, Priority execution
```

### Using SOVEREIGN

```typescript
import { UmbraClient } from '@umbra/sdk';

const client = new UmbraClient(connection, wallet);

// Submit order using SOVEREIGN identity (no API key needed)
const tx = await client.submitOrderWithSovereign({
  orderId: new BN(1),
  inputMint: USDC_MINT,
  outputMint: SOL_MINT,
  inputAmount: new BN(1000000),
  // SOVEREIGN identity is read directly from chain
});
```

### Tier Benefits

| SOVEREIGN Tier | Fee Discount | Max Order Size | Dark Pool | Priority MEV |
|----------------|--------------|----------------|-----------|--------------|
| Bronze (1) | 0% | 1,000 USDC | ❌ | ❌ |
| Silver (2) | 5% | 10,000 USDC | ❌ | ❌ |
| Gold (3) | 15% | 100,000 USDC | ❌ | ❌ |
| Platinum (4) | 30% | 1,000,000 USDC | ✅ | ❌ |
| Diamond (5) | 50% | Unlimited | ✅ | ✅ |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER FRONTEND                           │
│  (Connect Wallet → Check Reputation → Show Available Features)  │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
┌───────────────────────────┐
│   SOVEREIGN PROTOCOL      │
│   (On-chain identity)     │
│                           │
│ • Direct PDA read         │
│ • Multi-dimensional score │
│ • Portable reputation     │
└─────────────┬─────────────┘
              │
              ▼
        ┌─────────────────────────────────────────────────┐
        │              TIER CALCULATOR                     │
        │  SOVEREIGN tier (1-5)                           │
        │         → Umbra tier index (0-4)                │
        └─────────────────────┬───────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────────┐
        ▼                     ▼                         ▼
┌───────────────┐     ┌───────────────┐       ┌───────────────┐
│  CONFIDENTIAL │     │   TIERED      │       │  DERIVATIVES  │
│  SWAP ROUTER  │     │   FEE VAULT   │       │    ACCESS     │
│               │     │               │       │               │
│ • Encrypted   │     │ • Tier-based  │       │ • Perps       │
│   orders      │     │   fees        │       │ • Variance    │
│ • MEV shield  │     │ • Revenue     │       │ • Exotics     │
└───────────────┘     └───────────────┘       └───────────────┘
```

## Technical Implementation

### Smart Contracts (Anchor/Rust)

- **TierConfig**: Stores tier definitions and fee structure
- **TieredOrder**: Order with embedded tier information
- **Fee collection**: Automatic tier-based fee deduction
- **SOVEREIGN module**: Cross-program account reading for on-chain reputation

#### SOVEREIGN Integration

```rust
use umbra_swap::sovereign::*;

// Read SOVEREIGN tier directly from chain
let sovereign_tier = read_sovereign_tier(&sovereign_identity_account);

// Map to Umbra tier index
let umbra_tier = sovereign_tier_to_umbra_index(sovereign_tier);

// Get tier-specific benefits
let benefits = get_privacy_benefits(sovereign_tier);
// benefits.fee_discount_bps, benefits.dark_pool_access, etc.
```

### SDK (TypeScript)

```typescript
import { UmbraClient } from '@umbra/sdk';

const client = new UmbraClient(connection, wallet);

// Submit a tiered order using SOVEREIGN identity
const tx = await client.submitOrder({
  orderId: new BN(1),
  inputMint: USDC_MINT,
  outputMint: SOL_MINT,
  inputAmount: new BN(1000000), // 1 USDC
  minOutputAmount: new BN(5000000), // Min SOL
  slippageBps: 50,
  deadlineSeconds: 300,
});
```

## Business Model

| Revenue Stream | Description | Monthly Potential |
|----------------|-------------|-------------------|
| Trading Fees | 0.05-0.50% tiered by reputation | $15-50K |
| MEV Recapture | 30% of saved MEV | $4-12K |
| Derivatives | Premium tier access | $2-8K |
| B2B API | Execution-as-a-service | $5-15K |

## Philosophy

**"Privacy is a privilege you earn through good behavior."**

This inverts the typical narrative that privacy enables bad actors. Instead, Umbra rewards users who demonstrate legitimate on-chain behavior with better privacy guarantees.

## Deployments

| Network | Program | ID |
|---------|---------|-----|
| Devnet | Umbra Swap | `41Ps5GR2E6QbXRDaXjAcQCcKmPR942VYLRQQDqdkQXLr` |
| Devnet | SOVEREIGN | `2UAZc1jj4QTSkgrC8U9d4a7EM9AQunxMvW5g7rX7Af9T` |

---

## Frontend Features

The Umbra frontend integrates real-time SOVEREIGN identity fetching:

- **SOVEREIGN Tier Display**: Shows composite score and breakdown (Trading, Civic, Developer, Infra)
- **Dynamic Fees**: Trading fees adjust based on your SOVEREIGN tier
- **MEV Protection Indicator**: Shows protection level for your tier
- **Order Type Badges**: Available order types based on tier
- **Wallet Integration**: Phantom, Solflare support with auto-connect

### Components

```typescript
// TierDisplay - Shows full SOVEREIGN identity with score breakdown
<TierDisplay />

// SwapInterface - Dynamic fees based on SOVEREIGN tier
<SwapInterface />
```

---

## Getting Started

### Prerequisites

- Node.js >= 18
- Yarn
- Rust + Anchor
- Solana CLI

### Installation

```bash
# Clone the repo
cd veil/apps/umbra

# Install dependencies
yarn install

# Build the smart contracts
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Start the solver
cd solver && yarn dev

# Start the frontend
cd app && yarn dev
```

### Environment Variables

```bash
# .env
RPC_URL=https://api.devnet.solana.com
SOLVER_KEYPAIR_PATH=~/.config/solana/id.json
```

## Project Structure

```
umbra/
├── programs/umbra-swap/     # Anchor smart contracts
│   └── src/
│       ├── lib.rs           # Main program
│       ├── state/           # Account structures
│       └── sovereign/       # SOVEREIGN integration
│           └── mod.rs       # Identity reading, tier mapping
├── sdk/                     # TypeScript SDK
│   └── src/
│       ├── client.ts        # UmbraClient
│       └── encryption.ts    # Order encryption
├── solver/                  # Order execution service
│   └── src/
│       ├── solver.ts        # Main solver
│       ├── jupiter.ts       # Jupiter integration
│       └── api.ts           # REST API
└── app/                     # Next.js frontend
```

## API Endpoints

### Solver API

- `GET /api/health` - Health check
- `GET /api/solver-pubkey` - Get encryption public key
- `GET /api/tiers` - Get tier configuration
- `GET /api/fee/:score` - Calculate fee for a reputation score

## Hackathon Submission

### SOVEREIGN Integration (30%)

- ✅ SOVEREIGN tier determines trading fees (core logic)
- ✅ SOVEREIGN tier gates MEV protection levels
- ✅ SOVEREIGN tier unlocks order types and derivatives
- ✅ On-chain SOVEREIGN identity verification on order submission

### Technical Quality (25%)

- ✅ Production-ready Anchor smart contracts
- ✅ Full TypeScript SDK
- ✅ Jupiter aggregator integration
- ✅ Comprehensive error handling

### Traction & Users (20%)

- 🔄 Twitter: [@UmbraFinance](https://twitter.com/UmbraFinance)
- 🔄 Live demo: [umbra.finance](https://umbra.finance)
- 🔄 Discord community

### Business Viability (15%)

- ✅ Clear revenue model (tier-based fees)
- ✅ Path to profitability
- ✅ Competitive moat (reputation data)

## Resources

- [SOVEREIGN Protocol](https://github.com/psyto/sovereign) - Universal identity & reputation
- [Solana Docs](https://docs.solana.com/)
- [Anchor Framework](https://www.anchor-lang.com/)

## License

MIT

---

Built for the FairScale Hackathon 2026
