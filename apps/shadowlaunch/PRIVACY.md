# ShadowLaunch Privacy Model

## Overview

ShadowLaunch provides **transaction unlinkability** for Pump.fun token purchases. This document explains our privacy guarantees, threat model, and limitations.

## Privacy Goal

**Primary Goal**: Break the on-chain link between your main wallet and token holdings.

When using Shadow Mode, an external observer should NOT be able to:
- Determine which tokens you purchased from your main wallet activity
- Link your ephemeral wallet purchases back to your identity
- Track your accumulation patterns across multiple purchases

## How It Works

### Standard Mode (No Privacy)

```
Main Wallet ──────────────────────▶ Pump.fun
   0x123...                         Token
     │                                │
     └────────────────────────────────┘
              VISIBLE LINK
```

In standard mode, your purchase is directly visible on-chain. Anyone can see:
- Your wallet address bought token X
- The exact amount and timing
- Your other holdings and history

### Shadow Mode (Privacy Enabled)

```
Main Wallet ─────▶ Privacy Pool ─────▶ Ephemeral Wallet ─────▶ Pump.fun
   0x123...          (Shielded)           0xABC...              Token
     │                   │                    │                   │
     │                   │                    └───────────────────┘
     │                   │                         VISIBLE
     │                   │
     │                   └──── LINK BROKEN (shielded transfer)
     │
     └──── LINK EXISTS but destination unknown
```

In Shadow Mode:
1. SOL leaves your main wallet to the privacy pool (visible)
2. SOL is unshielded to a fresh ephemeral address (link broken)
3. Ephemeral wallet purchases the token (visible but not linked to you)

## Privacy Guarantees

### What We Protect

| Threat | Protection Level | Notes |
|--------|------------------|-------|
| Direct wallet-token linking | ✅ Strong | Ephemeral addresses are unlinkable |
| Amount correlation | ⚠️ Partial | Timing and amounts may correlate |
| Pattern analysis | ⚠️ Partial | Depends on usage patterns |
| Metadata leakage | ❌ None | IP address not protected |

### Unlinkability Properties

1. **Forward Privacy**: Future purchases cannot be linked to past identity
2. **Ephemeral Isolation**: Each purchase uses a fresh keypair
3. **No Reuse**: Ephemeral wallets are used once and discarded

## Threat Model

### Adversaries We Protect Against

#### Casual Observer
- Cannot link your main wallet to token holdings
- Cannot see your accumulation strategy
- Cannot front-run based on your wallet history

#### On-Chain Analyst
- Cannot definitively link ephemeral wallets to main wallet
- Statistical correlation possible with enough data points
- Timing analysis may reveal patterns

#### MEV Bots
- Cannot identify your pending transactions by wallet
- Cannot target you specifically for sandwich attacks
- Generic MEV attacks still possible on ephemeral tx

### Adversaries We Do NOT Protect Against

#### Network-Level Adversary
- IP address correlation is possible
- Use Tor/VPN for network-level privacy

#### Timing Correlation
- If you always shield then immediately purchase, timing may correlate
- Mitigation: Add random delays, batch operations

#### Amount Correlation
- Unique amounts may be correlatable
- Mitigation: Use common round numbers (0.1, 0.5, 1 SOL)

#### Compromised Client
- Browser extensions can see your activity
- Use a clean browser profile for privacy operations

## Privacy Levels

| Level | Mode | Link to Main Wallet | Recommended For |
|-------|------|---------------------|-----------------|
| None | Standard | ✅ Direct link | Public accumulation |
| Basic | Shadow | ❌ Broken | Private purchases |
| Enhanced | Shadow + Delays | ❌ + Timing protection | High-value targets |

## Best Practices

### For Maximum Privacy

1. **Use Shadow Mode for all purchases** you want private
2. **Add delays** between shielding and purchasing
3. **Use common amounts** (0.1, 0.5, 1.0 SOL)
4. **Don't reuse ephemeral wallets**
5. **Use VPN/Tor** for network-level privacy
6. **Clean browser profile** without tracking extensions

### Operational Security

```
DO:
✅ Create new ephemeral wallet for each purchase
✅ Use round SOL amounts
✅ Wait between shield and purchase
✅ Export ephemeral keys before closing browser

DON'T:
❌ Reuse ephemeral addresses
❌ Use exact same amounts repeatedly
❌ Shield and purchase in rapid succession
❌ Consolidate tokens back to main wallet immediately
```

## Technical Implementation

### Ephemeral Wallet Generation

```typescript
// Fresh keypair with no seed phrase
const keypair = Keypair.generate();

// Properties:
// - 32-byte random private key
// - No derivation path (not HD)
// - No link to any seed or previous keys
```

### Shielded Transfer (Privacy Cash)

```typescript
// Shield: Main wallet → Privacy Pool
await shieldTokens(connection, mainWallet, amount, "SOL");

// Unshield: Privacy Pool → Ephemeral
await unshieldTokens(connection, mainWallet, amount, ephemeralPubkey, "SOL");
```

The privacy pool uses cryptographic commitments to hide the link between deposit and withdrawal.

## Limitations

### Current Limitations

1. **Placeholder Implementation**: Actual Privacy Cash SDK integration pending
2. **No Relayer**: Unshield currently requires main wallet signature
3. **Client-Side Only**: No server-side privacy infrastructure
4. **Single-Use UX**: No persistent ephemeral wallet management

### Theoretical Limitations

1. **Anonymity Set**: Privacy depends on pool size and usage
2. **Timing Leakage**: Perfect timing privacy requires delays
3. **Amount Leakage**: Exact amounts may be correlatable
4. **Metadata**: On-chain privacy only, not network-level

## Comparison to Alternatives

| Solution | Privacy Level | Speed | Cost | Complexity |
|----------|---------------|-------|------|------------|
| Standard Purchase | None | Fast | Low | Simple |
| ShadowLaunch | Moderate | Fast | Medium | Simple |
| Tornado-style Mixer | High | Slow | High | Complex |
| Full ZK Solution | Very High | Slow | Very High | Very Complex |

ShadowLaunch optimizes for **usability** while providing meaningful privacy. For maximum privacy, consider additional measures.

## Future Improvements

1. **Larger Anonymity Set**: More users = better privacy
2. **Batched Operations**: Multiple purchases in single shield
3. **Timing Randomization**: Built-in delays
4. **Note System**: Encrypted records for personal tracking
5. **Mobile Support**: Secure enclave for key storage

## Disclaimer

ShadowLaunch provides transaction unlinkability, not anonymity. For high-stakes privacy needs, consult with security professionals and use additional privacy tools.

Privacy is a spectrum, not a binary. ShadowLaunch significantly raises the bar for linking your wallet to purchases, but determined adversaries with sufficient resources may still perform correlation analysis.

**Use responsibly. Know your threat model.**
