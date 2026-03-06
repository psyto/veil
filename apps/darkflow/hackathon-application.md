# DarkFlow - Privacy Hack 2026 Application

## Project Information

### Project Name
DarkFlow

### Tagline
Confidential AMM with Dark Liquidity

### One-liner Description
A privacy-preserving AMM that brings institutional-grade dark pool mechanics to Solana DeFi with encrypted swaps, hidden liquidity, and confidential token launches.

---

## Track Selection

### Primary Track
**Track 03: Open Track - Pool** ($18,000)
- Novel privacy infrastructure bringing dark pool mechanics to DeFi
- Combines multiple privacy technologies (MPC, ZK, encryption)

### Sponsor Bounties

#### 1. Arcium - End-to-End Private DeFi ($10,000)
- **Integration:** Arcium MPC for encrypted shared state
- **Use Case:** Dark pools with hidden liquidity positions, private swap execution
- **Category Target:** Best overall app

#### 2. Anoncoin - Privacy Tooling for Launching Tokens ($10,000)
- **Integration:** Confidential token launches with private bonding curves
- **Use Case:** Dark liquidity pools, private swaps, MEV-protected launches
- **Category Target:** Best overall

#### 3. Aztec - ZK with Noir ($10,000)
- **Integration:** Noir ZK proofs for swap validity verification
- **Use Case:** Proving swap correctness without revealing amounts
- **Category Target:** Best overall

---

## Project Details

### Problem Statement
Over $1.38 billion was lost to MEV (Maximal Extractable Value) in 2024. Every swap on a traditional DEX is visible to bots who front-run and sandwich trades. LP positions are tracked by whale watchers, and token launches are routinely front-run.

### Solution
DarkFlow is a privacy-preserving AMM that encrypts transaction details while maintaining verifiability:

1. **Dark Swaps** - Swap amounts encrypted with NaCl, verified by ZK proofs
2. **Hidden Liquidity** - LP positions encrypted on-chain, only aggregate TVL public
3. **Confidential Token Launch** - Private bonding curves prevent front-running
4. **Nullifier Tracking** - Prevents replay attacks on encrypted orders

### How It Works

**Dark Swap Flow:**
1. User encrypts swap order with NaCl box encryption
2. ZK proof (Noir) verifies order validity without revealing amounts
3. Nullifier prevents replay attacks
4. Arcium MPC enables computation on encrypted state
5. Swap executes without exposing trade details

**Encrypted LP Flow:**
1. Deposit amount encrypted before going on-chain
2. Pedersen commitment for later verification
3. Position stored in encrypted state via Arcium MPC
4. Only aggregate pool TVL is public
5. Withdraw with ZK proof of ownership

---

## Technical Implementation

### Tech Stack
| Technology | Purpose |
|------------|---------|
| Solana | High-throughput blockchain |
| Anchor 0.30 | Smart contract framework |
| Arcium MPC | Encrypted shared state computation |
| Noir (Aztec) | Zero-knowledge proof generation |
| NaCl/TweetNaCl | Order encryption |
| Pedersen Commitments | Amount verification |
| Next.js | Frontend application |

### Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                         DARKFLOW                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │  Dark AMM Pool │  │ Confidential   │  │  ZK Swap       │    │
│  │  (Hidden LP)   │  │ Token Launch   │  │  Verifier      │    │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘    │
│          └───────────────────┼───────────────────┘              │
│                              │                                  │
│              ┌───────────────▼───────────────┐                  │
│              │      Arcium Encrypted         │                  │
│              │      Shared State (MPC)       │                  │
│              └───────────────┬───────────────┘                  │
│                              │                                  │
│              ┌───────────────▼───────────────┐                  │
│              │   NaCl Encryption + Noir ZK   │                  │
│              └───────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

### Smart Contract Features
- `dark_swap` - Execute encrypted swaps with ZK verification
- `add_liquidity` - Deposit with encrypted position amounts
- `remove_liquidity` - Withdraw with ownership proof
- `confidential_launch` - Create tokens with private bonding curves
- Nullifier tracking to prevent replay attacks

---

## Deployment Information

### Program ID
```
8UvUSCfsXUjRW6NwcLVEJ4Y5jg8nWbxsZGNrzK1xs38U
```

### Network
Devnet

### Solana Explorer
https://explorer.solana.com/address/8UvUSCfsXUjRW6NwcLVEJ4Y5jg8nWbxsZGNrzK1xs38U?cluster=devnet

---

## Links

### GitHub Repository
https://github.com/psyto/veil/tree/main/apps/darkflow

### Demo Video
https://youtu.be/Mslq17qW6B8

### Documentation
Available in the GitHub repository README

---

## What's Implemented

- [x] Anchor program with encrypted LP position structs
- [x] Dark swap with nullifier tracking
- [x] Confidential token launch structure
- [x] TypeScript SDK
- [x] Next.js frontend with wallet integration (Phantom, Solflare)
- [x] Deployed to Solana Devnet

---

## Team

### Builder
Solo developer

### Contact
GitHub: @psyto

---

## Submission Checklist

- [x] Code is open source
- [x] Project integrates with Solana
- [x] Uses privacy-preserving technologies (MPC, ZK, encryption)
- [x] Program deployed to Solana devnet
- [x] Demo video submitted (under 3 minutes)
- [x] Documentation included in repository

---

## Why DarkFlow?

DarkFlow addresses a critical gap in DeFi: the complete transparency that enables MEV extraction. By bringing institutional dark pool mechanics to Solana, we enable:

1. **Fair Trading** - MEV bots cannot front-run what they cannot see
2. **Whale Privacy** - Large LPs can provide liquidity without being targeted
3. **Fair Launches** - Token creators and early buyers get equal treatment
4. **Verifiable Privacy** - ZK proofs ensure correctness without revealing data

*"Trade without a trace. Lend without a ledger."*
