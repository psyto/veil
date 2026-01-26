# Demo Video Scripts

Guidelines for recording the 3-minute demo videos for PrivacyHack 2026.

---

## Demo 1: Confidential Swap Router (3 min max)

### Setup Before Recording
1. Start solver: `cd apps/confidential-swap-router/solver && yarn dev`
2. Start frontend: `cd apps/confidential-swap-router/app && yarn dev`
3. Have Phantom wallet ready with devnet SOL
4. Switch Phantom to devnet

### Script

**[0:00 - 0:20] Introduction**
- "This is the Confidential Swap Router - MEV-protected swaps on Solana"
- "Traditional swaps expose order details, enabling frontrunning attacks"
- "Our solution encrypts orders using NaCl box encryption"

**[0:20 - 0:50] Show Architecture**
- Open the README or architecture diagram
- "Orders are encrypted client-side using the solver's public key"
- "Only the solver can decrypt and execute via Jupiter"
- "We integrate Light Protocol for ZK compression and Privacy Cash for shielded settlement"

**[0:50 - 1:30] Connect Wallet & Create Order**
- Click "Connect Wallet" button
- Show wallet connection
- "Let's create an encrypted swap order"
- Select SOL → USDC
- Enter amount (e.g., 0.1 SOL)
- Show the Jupiter quote appearing
- Point out slippage settings

**[1:30 - 2:00] Submit Encrypted Order**
- Click "Create Encrypted Order"
- Show the encryption happening
- "The order details are now encrypted"
- "Only the solver can see the actual amounts"
- Show transaction confirmation

**[2:00 - 2:30] Show Solver Execution**
- Switch to terminal showing solver logs
- "The solver picks up the order, decrypts it, and executes via Jupiter"
- Show solver decrypting and executing
- "MEV searchers can't frontrun because they can't read the order"

**[2:30 - 2:50] Claim Output**
- Back to frontend
- Show order in "Pending Orders" section
- "User claims their output tokens"
- "Optionally, outputs can be shielded using Privacy Cash"

**[2:50 - 3:00] Conclusion**
- "Confidential Swap Router - private, MEV-protected swaps on Solana"
- "Built with Light Protocol ZK compression and Privacy Cash SDK"
- Show GitHub link

---

## Demo 2: RWA Secrets Service (3 min max)

### Setup Before Recording
1. Start frontend: `cd apps/rwa-secrets-service/app && yarn dev`
2. Have Phantom wallet ready with devnet SOL
3. Switch Phantom to devnet

### Script

**[0:00 - 0:20] Introduction**
- "This is the RWA Secrets Service - encrypted metadata for tokenized real-world assets"
- "Asset issuers need to store confidential information like valuations and legal docs"
- "Our solution encrypts metadata on-chain with selective disclosure"

**[0:20 - 0:50] Show Architecture**
- Open the README or architecture diagram
- "Metadata is encrypted using NaCl box encryption"
- "Access is granted through encrypted key shares"
- "Four access levels: ViewBasic, ViewFull, Auditor, Admin"
- "ZK compression reduces storage costs by 99%"

**[0:50 - 1:30] Connect Wallet & Register Asset**
- Click "Connect Wallet"
- Show wallet connection
- "Let's register a real estate asset"
- Click "Register New Asset"
- Fill in:
  - Asset ID: "PROPERTY-001"
  - Asset Type: "Real Estate"
  - Description: "Office building in San Francisco"
- "The metadata is encrypted client-side before submission"

**[1:30 - 2:00] Submit Registration**
- Click "Register Asset"
- Show encryption happening
- "Metadata is encrypted with our keypair"
- Show transaction confirmation
- "Asset is now registered on-chain with encrypted metadata"

**[2:00 - 2:30] Grant Access**
- Select the registered asset
- Click "Grant Access"
- Enter grantee address
- Select access level: "ViewFull"
- Set expiration: "30 days"
- "The grantee receives an encrypted key share"
- Click "Grant Access"
- Show transaction

**[2:30 - 2:50] Show Access Control**
- "Different parties get different access levels"
- "Investors see basic info, auditors see full details"
- "All access is logged on-chain for compliance"
- "ZK proofs verify access without revealing details"

**[2:50 - 3:00] Conclusion**
- "RWA Secrets Service - privacy-preserving RWA management"
- "Built with Light Protocol for ZK compression"
- "Perfect for tokenized real estate, securities, and more"
- Show GitHub link

---

## Recording Tips

1. **Resolution:** Record at 1920x1080 or higher
2. **Audio:** Use a good microphone, speak clearly
3. **Pace:** Don't rush, but stay within 3 minutes
4. **Preparation:**
   - Clear browser cache before recording
   - Have all tabs ready
   - Test wallet connection beforehand
5. **Editing:**
   - Cut out long transaction wait times
   - Add captions if possible
   - Include GitHub link overlay

## Key Points to Emphasize

### Confidential Swap Router
- MEV protection through encryption
- Jupiter integration for best execution
- Light Protocol ZK compression
- Privacy Cash shielded settlement
- Non-custodial design

### RWA Secrets Service
- End-to-end encryption for metadata
- Granular access control (4 levels)
- On-chain audit logging
- ZK access proofs
- Regulatory compliance support

## Bounty Mentions

Make sure to mention these integrations:
- "Using Light Protocol for ZK compression - 99% storage reduction"
- "Privacy Cash SDK for shielded transfers"
- "Helius RPC for ZK compression support"
- "Built on Solana with Anchor framework"
