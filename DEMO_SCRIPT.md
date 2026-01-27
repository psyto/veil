# Demo Video Scripts

Guidelines for recording the 3-minute demo videos for PrivacyHack 2026.

**Key principle: Lead with philosophy, then show the solution.**

---

## Demo 1: Confidential Swap Router (3 min max)

### Core Message
**"MEV bots can't frontrun what they can't read."**

### Setup Before Recording
1. Start solver: `cd apps/confidential-swap-router/solver && yarn dev`
2. Start frontend: `cd apps/confidential-swap-router/app && yarn dev`
3. Have Phantom wallet ready with devnet SOL
4. Switch Phantom to devnet

### Script

**[0:00 - 0:30] The Problem (Philosophy)**

Open with the problem statement:

"Every time you submit a swap on a public blockchain, you're broadcasting your intention to the world before it executes."

Show a simple diagram or text:
```
You: "I want to buy TOKEN"
     ↓
Mempool: [Visible to everyone]
     ↓
MEV Bot: Sees your order, buys first, sells to you higher
     ↓
Result: You pay more. Bot profits.
```

"This is MEV — Maximal Extractable Value. It costs users billions annually. And it's a direct consequence of transparent mempools."

**[0:30 - 0:50] The Solution (Philosophy)**

"The Confidential Swap Router fixes this with one principle: **encrypt first, execute later.**"

Show the solution diagram:
```
You: Encrypt order with solver's public key
     ↓
On-chain: Encrypted blob. Contents unknown.
     ↓
Solver: Decrypts, executes via Jupiter
     ↓
Result: Fair execution. No frontrunning.
```

"MEV bots can't frontrun what they can't read."

**[0:50 - 1:20] Connect & Create Order**

"Let me show you how it works."

- Connect wallet
- Select SOL → USDC
- Enter amount (0.1 SOL)
- Show Jupiter quote appearing
- "Notice we get real-time quotes from Jupiter, but the actual order details will be encrypted."

**[1:20 - 1:50] Submit Encrypted Order**

- Adjust slippage if needed
- Click "Create Encrypted Order"
- "The order is now encrypted with the solver's public key. On-chain, this is just ciphertext."
- Show transaction confirmation
- "No one watching the blockchain knows my minimum output or slippage tolerance."

**[1:50 - 2:20] Solver Execution**

- Switch to solver terminal
- "The solver picks up encrypted orders, decrypts them, and executes through Jupiter for best pricing."
- Show solver logs
- "This is the only entity that can read the order details."

**[2:20 - 2:45] Claim Output**

- Return to frontend
- Show completed order
- "User claims output tokens. Optionally, outputs can be shielded using Privacy Cash for additional privacy."
- Click claim

**[2:45 - 3:00] Closing (Philosophy)**

"Traditional finance doesn't broadcast your orders to competitors before execution. DeFi shouldn't either."

"Confidential Swap Router: MEV protection through encryption."

Show:
- GitHub: github.com/psyto/veil
- Built with: Light Protocol, Privacy Cash, Jupiter

---

## Demo 2: RWA Secrets Service (3 min max)

### Core Message
**"Not about hiding from regulators. It's about not exposing everything to everyone."**

### Setup Before Recording
1. Start frontend: `cd apps/rwa-secrets-service/app && yarn dev`
2. Have Phantom wallet ready with devnet SOL
3. Switch Phantom to devnet

### Script

**[0:00 - 0:30] The Problem (Philosophy)**

"Tokenized real-world assets have a problem: they need confidential information on-chain."

"Property valuations. Legal documents. Ownership structures. Financial statements."

"On a public blockchain, this information is visible to everyone — competitors, adversaries, the entire world."

"Total transparency destroys business confidentiality."

**[0:30 - 0:55] The Solution (Philosophy)**

"But total privacy isn't the answer either. Regulators need access. Investors need information. Auditors need verification."

"The answer is **selective disclosure** — encrypted by default, disclosed by choice."

Show diagram:
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

"Different parties see different information based on their role. All access logged on-chain."

"This is not about hiding from regulators. It's about not exposing everything to everyone."

**[0:55 - 1:25] Connect & Register Asset**

"Let me demonstrate."

- Connect wallet
- Click "Register New Asset"
- Fill in:
  - Asset ID: "SF-OFFICE-001"
  - Type: Real Estate
  - Description: "Commercial office building, San Francisco"
- "This metadata is encrypted client-side before it ever touches the blockchain."

**[1:25 - 1:50] Submit Registration**

- Click "Register Asset"
- Show encryption happening
- "On-chain, this is encrypted data. The public sees that an asset exists, but not its details."
- Show transaction confirmation

**[1:50 - 2:20] Grant Access (Selective Disclosure)**

"Now let's grant selective access to an investor."

- Select the asset
- Click "Grant Access"
- Enter investor address
- Select "ViewFull" access level
- Set expiration: 30 days
- "The investor receives an encrypted key share. Only they can decrypt."
- Submit

**[2:20 - 2:40] Show Access Levels**

"We have four access levels:"
- ViewBasic — basic info only
- ViewFull — complete metadata
- Auditor — compliance verification
- Admin — full control

"Each level sees only what they need. Nothing more."

**[2:40 - 3:00] Closing (Philosophy)**

"Privacy and compliance can coexist. You don't need to expose everything to prove anything."

"RWA Secrets Service: Confidentiality through selective disclosure."

Show:
- GitHub: github.com/psyto/veil
- Built with: Light Protocol, NaCl encryption

---

## Recording Tips

### Lead with Philosophy
- Judges see many technical demos
- Philosophy differentiates your project
- Start with "why" before "how"

### Key Phrases to Emphasize
- "MEV bots can't frontrun what they can't read"
- "Encrypt first, execute later"
- "Not about hiding from regulators — about not exposing everything to everyone"
- "Encrypted by default, disclosed by choice"
- "Privacy and compliance can coexist"

### Visual Suggestions
- Use simple diagrams (can be slides or whiteboard)
- Show the problem → solution flow
- Terminal + frontend split screen for solver demo

### Technical Tips
- Resolution: 1920x1080 or higher
- Clear audio is essential
- Cut long transaction waits in editing
- Add captions if possible

### Timing
- Philosophy/Problem: ~30 seconds
- Solution concept: ~20-25 seconds
- Live demo: ~90 seconds
- Closing: ~15-20 seconds

---

## Bounty Mentions

Naturally incorporate these:
- "Using Light Protocol for ZK compression"
- "Privacy Cash SDK for shielded transfers"
- "Helius RPC for ZK compression support"
- "Jupiter for best execution routing"

---

## Philosophy Summary (For Reference)

### Confidential Swap Router
> MEV is surveillance-enabled theft. When your trading intentions are public before execution, sophisticated actors extract value from you. Encrypted orders restore the information symmetry that fair markets require.

### RWA Secrets Service
> Total transparency and total privacy are both failures. Selective disclosure is the middle path — users control what they reveal and to whom. Compliance without surveillance.

### Shared Principle
> "Not 'add encryption' but 'design so there's nothing to expose.'"

---

*Remember: The philosophy is what makes this project different. Lead with it.*
