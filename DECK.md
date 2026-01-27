# Veil - Presentation Deck

## PrivacyHack 2026 Submission

---

## Slide 1: Title

**Veil**

*MEV protection through encryption. Confidentiality through selective disclosure.*

- Confidential Swap Router (Open Track)
- RWA Secrets Service (Privacy Tooling Track)

GitHub: github.com/psyto/veil

---

## Slide 2: The Core Problem

**Public blockchains created a paradox:**

Systems designed for financial freedom became the most surveilled financial infrastructure in history.

- Every transaction is permanent
- Every intention is broadcast
- Every strategy is exposed

**This has consequences.**

---

## Slide 3: MEV - The $Billion Problem

```
You: "I want to swap 1 SOL for USDC"
          ↓
Mempool: [Your order is visible to everyone]
          ↓
MEV Bot: Buys before you, sells to you higher
          ↓
Result: You pay more. Bot profits.
```

**MEV extraction costs users billions annually.**

Frontrunning. Sandwich attacks. All enabled by transparent mempools.

---

## Slide 4: RWA - The Confidentiality Problem

**Tokenized assets need sensitive data on-chain:**

- Property valuations
- Legal documents
- Ownership structures
- Financial statements

**On a public blockchain, this is visible to:**

Competitors. Adversaries. The entire world.

Total transparency destroys business confidentiality.

---

## Slide 5: Our Philosophy

> **"MEV bots can't frontrun what they can't read."**

> **"Not about hiding from regulators. It's about not exposing everything to everyone."**

**The answer:** Privacy by architecture, not as an afterthought.

---

## Slide 6: Solution 1 - Confidential Swap Router

**Encrypt first. Execute later.**

```
User: Encrypts order with solver's public key
          ↓
On-chain: Encrypted blob (ciphertext only)
          ↓
Solver: Decrypts, executes via Jupiter
          ↓
Result: Fair execution. No frontrunning.
```

**MEV bots see bytes, not intentions.**

---

## Slide 7: Confidential Swap Router - Features

| Feature | Benefit |
|---------|---------|
| NaCl Box Encryption | Order details hidden until execution |
| Jupiter Integration | Best price routing |
| Non-custodial | Users can cancel anytime |
| ZK Compression | ~99% storage reduction |
| Shielded Settlement | Private output delivery |

**Program ID:** `v7th9XoyXeonxKLPsKdcgaNsSMLR44HDY7hadD7CCRM`

---

## Slide 8: Solution 2 - RWA Secrets Service

**Encrypted by default. Disclosed by choice.**

```
Asset registered → Metadata encrypted
                        ↓
        ┌───────────────┴───────────────┐
        ↓                               ↓
  Investor granted              Regulator granted
  ViewFull access               Auditor access
        ↓                               ↓
  Sees valuation                Sees compliance data
```

**Different parties see different information.**

---

## Slide 9: RWA Secrets Service - Access Levels

| Level | Description | Use Case |
|-------|-------------|----------|
| ViewBasic | Basic asset info | Public investors |
| ViewFull | Complete metadata | Qualified investors |
| Auditor | Compliance data | Regulators |
| Admin | Full control | Asset issuer |

**Features:** Time-limited access, delegation rights, on-chain audit trail, revocable

**Program ID:** `DWgiBrRNa3JM3XWkPXGXwo7jJ59PvXVr3bVeyKbGySam`

---

## Slide 10: Technical Architecture

```
┌────────────────────────────────────────────────────────┐
│              Veil                       │
├────────────────────────────────────────────────────────┤
│  ┌──────────────────┐    ┌──────────────────┐         │
│  │ Confidential     │    │ RWA Secrets      │         │
│  │ Swap Router      │    │ Service          │         │
│  │                  │    │                  │         │
│  │ • MEV Protection │    │ • Encrypted Meta │         │
│  │ • Jupiter        │    │ • Access Control │         │
│  │ • Shielded       │    │ • Audit Logging  │         │
│  └──────────────────┘    └──────────────────┘         │
│                                                        │
│  ┌────────────────────────────────────────────────┐   │
│  │           @veil/crypto                 │   │
│  │  NaCl Box • Shamir's • ZK Compression          │   │
│  └────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

---

## Slide 11: Bounty Integrations

| Partner | Integration | Benefit |
|---------|-------------|---------|
| **Light Protocol** | ZK Compression | ~99% storage reduction |
| **Privacy Cash** | Shielded Transfers | Private token delivery |
| **Helius** | RPC Provider | ZK compression support |
| **Quicknode** | RPC Provider | Reliable infrastructure |
| **Jupiter** | DEX Aggregation | Best execution routing |

---

## Slide 12: Code Example - Encrypted Swap

```typescript
import { createEncryptedOrder } from '@confidential-swap/sdk';

// User encrypts order - only solver can read
const encrypted = createEncryptedOrder(
  {
    minOutputAmount: 1000000n,
    slippageBps: 50,
    deadline: Date.now() + 3600000
  },
  solverPublicKey,  // Solver's encryption key
  userKeypair
);

// Submit to chain - MEV bots see only ciphertext
await program.submitEncryptedOrder(encrypted);
```

---

## Slide 13: Code Example - Selective Disclosure

```typescript
import { encryptAssetMetadata, grantAccess } from '@rwa-secrets/sdk';

// Encrypt sensitive metadata
const encrypted = encryptAssetMetadata({
  valuationUsdCents: 150000000n,  // $1.5M
  jurisdictionCode: 'US',
  additionalInfo: '{"address": "123 Main St"}'
}, keypair);

// Grant selective access to investor
await grantAccess({
  asset: assetPda,
  grantee: investorPublicKey,
  level: AccessLevel.ViewFull,
  expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000  // 30 days
});
```

---

## Slide 14: Why This Matters

| For | Benefit |
|-----|---------|
| **Traders** | No more MEV tax on every swap |
| **Businesses** | Confidential operations on public chains |
| **Markets** | Fair price discovery |
| **Compliance** | Privacy and regulation coexist |

**Privacy isn't a feature. It's infrastructure.**

---

## Slide 15: The Third Era of Crypto

| Era | Focus | Privacy |
|-----|-------|---------|
| Era 1 | Decentralized money | Pseudonymous but traceable |
| Era 2 | Decentralized compute | Transparent by default |
| **Era 3** | **Decentralized privacy** | **Confidential by design** |

**Veil is infrastructure for Era 3.**

---

## Slide 16: Deployed & Tested

**Devnet Deployments:**

- Confidential Swap Router: `v7th9XoyXeonxKLPsKdcgaNsSMLR44HDY7hadD7CCRM`
- RWA Secrets Service: `DWgiBrRNa3JM3XWkPXGXwo7jJ59PvXVr3bVeyKbGySam`

**All Tests Passing:**
- Network connectivity
- Wallet configuration
- Program deployment verification
- PDA derivation
- Encryption functions
- Threshold secret sharing

---

## Slide 17: Summary

**Veil**

Two protocols. One principle.

| Protocol | Problem | Solution |
|----------|---------|----------|
| Confidential Swap Router | MEV extraction | Encrypted orders |
| RWA Secrets Service | Data exposure | Selective disclosure |

> "MEV bots can't frontrun what they can't read."

> "Privacy and compliance can coexist."

---

## Slide 18: Links & Contact

**Repository:** github.com/psyto/veil

**Explorer Links:**
- [Swap Router Program](https://explorer.solana.com/address/v7th9XoyXeonxKLPsKdcgaNsSMLR44HDY7hadD7CCRM?cluster=devnet)
- [RWA Secrets Program](https://explorer.solana.com/address/DWgiBrRNa3JM3XWkPXGXwo7jJ59PvXVr3bVeyKbGySam?cluster=devnet)

**Built with:**
Light Protocol • Privacy Cash • Jupiter • Helius • Quicknode

**Developer:** psyto

---

## Speaker Notes

### Key Messages to Emphasize:

1. **Lead with philosophy** - "MEV bots can't frontrun what they can't read"
2. **Problem → Solution flow** - Show the pain point before the fix
3. **Not anti-compliance** - "Not about hiding from regulators"
4. **Production-ready** - Deployed on devnet, all tests passing
5. **Bounty integrations** - Mention Light Protocol, Privacy Cash, Helius, Quicknode

### Timing Suggestion:
- Slides 1-5: Problem & Philosophy (1 min)
- Slides 6-9: Solutions (1.5 min)
- Slides 10-13: Technical (1 min)
- Slides 14-18: Impact & Close (30 sec)

**Total: ~4 minutes** (adjust based on submission requirements)
