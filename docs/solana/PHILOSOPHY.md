# Philosophy

## The Problem with Transparent Finance

Public blockchains created a paradox: systems designed for financial freedom became the most surveilled financial infrastructure in history.

Every transaction is permanent. Every intention is broadcast. Every strategy is exposed.

This transparency has consequences.

---

## MEV: Surveillance-Enabled Theft

When you submit a swap on a public blockchain, you broadcast your intention to the world before it executes. This creates an information asymmetry that sophisticated actors exploit.

```
You: "I want to buy 10,000 USDC worth of TOKEN"
     ↓
Mempool: [Your transaction is visible to everyone]
     ↓
MEV Bot: Sees your order, buys TOKEN first, sells to you at higher price
     ↓
Result: You pay more. Bot profits. Value extracted.
```

This is called MEV — Maximal Extractable Value. It's not a bug. It's a direct consequence of transparent mempools.

**MEV extraction costs users billions annually.** Frontrunning, sandwich attacks, arbitrage — all enabled by the simple fact that your trading intentions are public before execution.

### The Solution: Encrypt First, Execute Later

The Confidential Swap Router inverts the information flow:

```
You: Encrypt order with solver's public key
     ↓
On-chain: Encrypted blob. Contents unknown.
     ↓
Solver: Decrypts, executes via Jupiter
     ↓
Result: Fair execution. No frontrunning possible.
```

**MEV bots can't frontrun what they can't read.**

This isn't about hiding illicit activity. It's about restoring the information symmetry that fair markets require. In traditional finance, your broker doesn't broadcast your order to competitors before executing it. Why should DeFi be different?

---

## Selective Disclosure: Privacy with Accountability

Total privacy and total transparency are both failures.

- **Total transparency** destroys business confidentiality, personal safety, and competitive markets.
- **Total privacy** enables money laundering, tax evasion, and regulatory arbitrage.

The answer is **selective disclosure** — systems where users control what information they reveal and to whom.

### The RWA Problem

Tokenized real-world assets need confidential information on-chain:
- Property valuations
- Legal documents
- Ownership structures
- Financial statements

This information must be:
- **Hidden** from competitors and the public
- **Visible** to authorized investors
- **Auditable** by regulators when legally required
- **Provable** without full disclosure

### The Solution: Encrypted by Default, Disclosed by Choice

The RWA Secrets Service implements selective disclosure:

```
Asset registered → Metadata encrypted on-chain
                         ↓
              ┌──────────┴──────────┐
              ↓                     ↓
      Investor requests      Regulator requests
         access                  access
              ↓                     ↓
      Issuer grants           Issuer grants
      ViewFull level          Auditor level
              ↓                     ↓
      Sees valuation,         Sees compliance
      basic terms             data only
```

Different parties see different information based on their role and authorization. All access is logged on-chain for audit trails.

**This is not about hiding from regulators. It's about not exposing everything to everyone.**

---

## Privacy by Architecture

> "Not 'add encryption' but 'design so there's nothing to expose.'"

Both protocols follow this principle:

**Confidential Swap Router:**
- Order details never exist unencrypted on-chain
- Only the solver can decrypt
- MEV bots see ciphertext, not intentions

**RWA Secrets Service:**
- Metadata encrypted before submission
- Access controlled by cryptographic keys
- Disclosure is explicit, not default

Privacy isn't a feature we added. It's how the systems work.

---

## Why This Matters

### For Traders
MEV extraction is a tax on every swap. Encrypted orders eliminate it.

### For Businesses
Public chains become viable for sensitive operations when confidentiality is possible.

### For Markets
Fair price discovery requires that not everyone knows your order before it executes.

### For Compliance
Selective disclosure proves that privacy and regulation can coexist. You don't need to expose everything to prove anything.

---

## The Third Era

Crypto is entering its third era:

| Era | Focus | Privacy |
|-----|-------|---------|
| Era 1 | Decentralized money | Pseudonymous but traceable |
| Era 2 | Decentralized compute | Transparent by default |
| **Era 3** | **Decentralized privacy** | **Confidential by design** |

Previous eras treated privacy as optional. Era 3 makes it foundational.

Veil is infrastructure for this era.

---

## Related Work

This project shares philosophical foundations with [Fabcash](https://github.com/psyto/fabcash), a true burner wallet for Solana focused on payment privacy and coercion resistance.

Both projects believe:
- Privacy is infrastructure, not a feature
- Solana's low fees make privacy economically viable
- Zero-knowledge proofs enable compliance without surveillance

Different problems, same principle: **design for privacy from the start.**

---

*Veil: MEV protection through encryption. Confidentiality through selective disclosure.*
