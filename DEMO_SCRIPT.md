# Demo Video Scripts

Guidelines for recording demo videos for PrivacyHack 2026, FairScale Hackathon, and Pump.fun Hackathon.

**Key principle: Lead with philosophy, then show the solution.**

---

## Quick Reference

| App | Hackathon | Max Duration | Key Message |
|-----|-----------|--------------|-------------|
| Confidential Swap Router | PrivacyHack | 3 min | "MEV bots can't frontrun what they can't read" |
| RWA Secrets Service | PrivacyHack | 3 min | "Not about hiding from regulators" |
| Umbra | FairScale | 3 min | "Privacy is a privilege you earn" |
| DarkFlow | PrivacyHack | 3 min | "Trade without a trace" |
| ShadowLaunch | Pump.fun | 3 min | "Break the link" |

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

## Demo 3: Umbra - Reputation-Gated Privacy (3 min max)

### Core Message
**"Privacy is a privilege you earn through good behavior."**

### Setup Before Recording
1. Start solver: `cd apps/umbra/solver && yarn dev`
2. Start frontend: `cd apps/umbra/app && yarn dev`
3. Have Phantom wallet ready with devnet SOL
4. Ensure wallet has SOVEREIGN identity (or will create one)

### Script

**[0:00 - 0:30] The Problem (Philosophy)**

"Current privacy solutions treat all users equally. This creates a problem: sybil attackers get the same privacy as legitimate users. There's no incentive to build reputation."

"Meanwhile, DeFi traders lose over $500 million annually to MEV extraction."

**[0:30 - 1:00] The Solution (Philosophy)**

"Umbra inverts this: **Privacy is a privilege you earn through good behavior.**"

"Your on-chain reputation — tracked via SOVEREIGN protocol — unlocks execution quality tiers."

Show tier table:
```
SOVEREIGN Tier → Fee → MEV Protection → Dark Pool
Bronze (1)     → 0.50% → None        → No
Silver (2)     → 0.30% → Basic       → No
Gold (3)       → 0.15% → Full        → No
Platinum (4)   → 0.08% → Priority    → Yes
Diamond (5)    → 0.05% → VIP         → Yes
```

"Higher reputation = lower fees, better MEV protection, and access to dark pools."

**[1:00 - 1:30] Connect & Show SOVEREIGN Identity**

- Connect wallet
- Show SOVEREIGN tier display with multi-dimensional scores
- "My SOVEREIGN identity shows my Trading Score, Civic Score, Developer Score, and Infrastructure Score"
- "Based on my composite score, I'm at Tier [X], which means [Y]% fee discount"

**[1:30 - 2:00] Submit a Tiered Swap**

- Select token pair (SOL → USDC)
- Enter amount
- "Notice the fee shown reflects my tier discount"
- "And my MEV protection level is [Basic/Full/Priority]"
- Submit order

**[2:00 - 2:30] Show Tier Benefits**

- "If I had a higher tier, I'd get even better rates"
- Show the tier benefits table in the UI
- "Diamond tier users get 50% fee discount and access to dark pools for larger orders"

**[2:30 - 3:00] Closing (Philosophy)**

"Traditional privacy solutions enable sybil attacks. Umbra rewards legitimate users."

"The more you participate honestly on-chain, the better privacy you get."

"Umbra: Where reputation unlocks privacy."

Show:
- GitHub: github.com/psyto/veil
- Built with: SOVEREIGN, FairScale, Jupiter

---

## Demo 4: DarkFlow - Confidential AMM (3 min max)

### Core Message
**"Trade without a trace. Lend without a ledger."**

### Setup Before Recording
1. Start frontend: `cd apps/darkflow/app && yarn dev`
2. Have Phantom wallet ready with devnet SOL

### Script

**[0:00 - 0:30] The Problem (Philosophy)**

"On traditional AMMs like Uniswap or Raydium, everything is visible."

Show diagram:
```
LP deposits 100,000 USDC → Everyone sees → Whale watchers target you
Swap 50,000 SOL → Everyone sees → MEV bots sandwich attack
Result: Value extracted from users
```

"Your LP positions, your swap amounts — all public. All exploitable."

**[0:30 - 1:00] The Solution (Philosophy)**

"DarkFlow brings institutional-grade dark pool mechanics to DeFi."

Show diagram:
```
LP deposits [encrypted] → Nobody knows size → No targeting
Swap [encrypted] → ZK proof verifies validity → MEV impossible
Result: Your value stays yours
```

"We use Arcium for encrypted shared state and Noir for zero-knowledge proofs."

**[1:00 - 1:30] Add Encrypted Liquidity**

- Connect wallet
- Go to Pool section
- "When I add liquidity, the amount is encrypted using NaCl box"
- Enter amounts (e.g., 10 SOL + 1000 USDC)
- "On-chain, others only see a commitment hash — not my actual position size"
- Submit transaction

**[1:30 - 2:00] Execute a Dark Swap**

- Go to Swap section
- Enter swap details
- "This swap will be verified using a Noir ZK proof"
- "The proof confirms I have sufficient balance and valid parameters — without revealing amounts"
- Submit swap

**[2:00 - 2:30] Show Privacy Model**

- "Let me show you what others can see vs what's private"
- Show table:
  - Pool existence: Public
  - Your LP amounts: Encrypted (only you see)
  - Swap amounts: ZK verified, never revealed
  - Total volume: Public aggregate

**[2:30 - 3:00] Closing (Philosophy)**

"Traditional finance has dark pools for institutions. DeFi should have them for everyone."

"DarkFlow: Where your trades stay in the shadows."

Show:
- GitHub: github.com/psyto/veil
- Built with: Arcium, Noir, Light Protocol

---

## Demo 5: ShadowLaunch - Private Pump.fun (3 min max)

### Core Message
**"Break the link between your wallet and your trades."**

### Setup Before Recording
1. Start frontend: `cd apps/shadowlaunch && yarn dev`
2. Have Phantom wallet ready with mainnet/devnet SOL
3. Find a trending token on Pump.fun to demonstrate

### Script

**[0:00 - 0:30] The Problem (Philosophy)**

"When you buy tokens on Pump.fun, everyone can see."

"Whale watchers track your accumulation. MEV bots front-run your trades. Your wallet becomes a target."

"The moment you find a good token, your buying activity broadcasts your conviction to competitors."

**[0:30 - 1:00] The Solution (Philosophy)**

"ShadowLaunch breaks the on-chain link."

Show flow:
```
Your Wallet → Privacy Pool → Ephemeral Wallet → Pump.fun Purchase
                   ↓
           Link broken here
```

"Each purchase uses a fresh wallet with no history. Your main wallet never touches Pump.fun."

**[1:00 - 1:30] Browse Tokens**

- Connect wallet
- Browse the token list
- Show bonding curve data for a token
- "Notice we show real-time curve progress and graduation status"
- Select a token to purchase

**[1:30 - 2:00] Shadow Mode Purchase**

- Toggle Shadow Mode ON
- "In Shadow Mode, we generate an ephemeral wallet"
- Show the ephemeral wallet address
- "Funds will route through the privacy pool to this fresh address"
- Enter purchase amount
- "The on-chain link between my main wallet and this purchase is broken"
- Submit purchase

**[2:00 - 2:30] Show the Result**

- "Tokens now sit in the ephemeral wallet"
- "If anyone looks up my main wallet, they won't see this purchase"
- "I can export this ephemeral wallet's private key or transfer tokens later"

**[2:30 - 3:00] Closing (Philosophy)**

"Your trading strategy is your edge. Don't broadcast it to the world."

"ShadowLaunch: Accumulate without being tracked."

Show:
- GitHub: github.com/psyto/veil
- Built with: Quicknode, Privacy Cash, Light Protocol

---

## Recording Tips for All Demos

### Lead with Philosophy
- Judges see many technical demos
- Philosophy differentiates your project
- Start with "why" before "how"

### Key Phrases by App

| App | Key Phrase |
|-----|------------|
| Swap Router | "MEV bots can't frontrun what they can't read" |
| RWA Secrets | "Not about hiding from regulators" |
| Umbra | "Privacy is a privilege you earn" |
| DarkFlow | "Trade without a trace" |
| ShadowLaunch | "Break the link" |

### Visual Suggestions
- Use simple diagrams (slides or whiteboard)
- Show problem → solution flow
- Terminal + frontend split screen for solver demos
- Show before/after wallet states

### Technical Tips
- Resolution: 1920x1080 or higher
- Clear audio is essential
- Cut long transaction waits in editing
- Add captions if possible

### Timing (Standard 3-min format)
- Philosophy/Problem: ~30 seconds
- Solution concept: ~25 seconds
- Live demo: ~90 seconds
- Closing: ~15 seconds

---

*Remember: The philosophy is what makes each project different. Lead with it.*
