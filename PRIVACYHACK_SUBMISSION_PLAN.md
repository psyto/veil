# Solana PrivacyHack 2026 - Submission Plan

## Overview

This document outlines the strategy for submitting **three privacy-focused projects** to the Solana PrivacyHack hackathon (January 12-30, 2026). By leveraging a shared cryptographic library, we can efficiently upgrade multiple projects with ZK proofs and sponsor SDK integrations.

---

## Hackathon Details

| Item | Details |
|------|---------|
| **Dates** | January 12-30, 2026 |
| **Submission Deadline** | February 1, 2026 |
| **Winners Announced** | February 10, 2026 |
| **Total Prize Pool** | $100,000+ (tracks) + $100,000+ (bounties) |

### Tracks

| Track | Prize | Description |
|-------|-------|-------------|
| Private Payments | $15,000 | Confidential or private transfers on Solana |
| Privacy Tooling | $15,000 | Tools and infrastructure for privacy development |
| Open Track | $18,000 | Any privacy application on Solana |

### Relevant Sponsor Bounties

| Sponsor | Prize | Technology |
|---------|-------|------------|
| Privacy Cash | $15,000 | Privacy Cash SDK for shielded transactions |
| Radr Labs (ShadowWire) | $15,000 | Bulletproofs for private transfers |
| Arcium | $10,000 | End-to-end encrypted DeFi |
| Light Protocol | Part of Open Track | ZK compression (~99% reduction) |
| Quicknode | $3,000 | Open-source privacy tooling with Quicknode RPC |
| Range | $1,500+ | Compliant privacy applications |
| Helius | $5,000 | Best privacy project using Helius |

---

## Submission Strategy

### Three Projects, Three Tracks

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SUBMISSION STRATEGY                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────┐    ┌─────────────────────┐    ┌───────────────────┐  │
│   │   Fabcash   │    │ Confidential Swap   │    │   RWA Secrets     │  │
│   │             │    │      Router         │    │     Service       │  │
│   └──────┬──────┘    └──────────┬──────────┘    └─────────┬─────────┘  │
│          │                      │                         │             │
│          ▼                      ▼                         ▼             │
│   ┌─────────────┐    ┌─────────────────────┐    ┌───────────────────┐  │
│   │   Private   │    │     Open Track      │    │  Privacy Tooling  │  │
│   │  Payments   │    │                     │    │                   │  │
│   │   $15,000   │    │      $18,000        │    │     $15,000       │  │
│   └─────────────┘    └─────────────────────┘    └───────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Project Assignments

| Project | Repository | Track | Rationale |
|---------|------------|-------|-----------|
| **Fabcash** | psyto/fabcash | Private Payments | Strongest fit - burner wallet with offline payments, already integrates Privacy Cash + Light Protocol |
| **Confidential Swap Router** | psyto/veil | Open Track | MEV-protected swaps with encrypted orders - unique angle for open track |
| **RWA Secrets Service** | psyto/veil | Privacy Tooling | Infrastructure for encrypted RWA metadata - clear tooling use case |

---

## Shared Architecture Advantage

The Confidential Swap Router and RWA Secrets Service share a common cryptographic library (`@veil/crypto`). Upgrading this shared library benefits both projects simultaneously.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       @veil/crypto                              │
│                                                                          │
│   Current Implementation:                                                │
│   ├── nacl-box.ts      → NaCl box encryption (Curve25519-XSalsa20)     │
│   ├── threshold.ts     → Shamir's Secret Sharing (M-of-N)              │
│   └── payload.ts       → Binary payload serialization                   │
│                                                                          │
│   Planned Upgrades:                                                      │
│   ├── zk-compression.ts → Light Protocol ZK compression                 │
│   ├── shielded.ts       → Privacy Cash SDK integration                  │
│   └── bulletproofs.ts   → ShadowWire Bulletproofs (optional)           │
│                                                                          │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
                ▼                               ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│  Confidential Swap Router │   │    RWA Secrets Service    │
│                           │   │                           │
│  • ZK-encrypted orders    │   │  • ZK access proofs       │
│  • Shielded settlements   │   │  • Compressed metadata    │
│  • MEV protection         │   │  • Compliant disclosure   │
└───────────────────────────┘   └───────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Shared Library Upgrades [COMPLETED]

#### 1.1 Light Protocol ZK Compression Integration

**File:** `packages/crypto/src/zk-compression.ts`

```typescript
import { LightSystemProgram, Rpc, createRpc } from '@lightprotocol/stateless.js';
import { createMint, mintTo, transfer } from '@lightprotocol/compressed-token';

export interface CompressedPayload {
  proof: Uint8Array;
  publicInputs: Uint8Array;
  compressedData: Uint8Array;
}

export async function compressPayload(
  connection: Rpc,
  data: Uint8Array,
  payer: Keypair
): Promise<CompressedPayload> {
  // Compress data using Light Protocol
  // ~99% on-chain footprint reduction
}

export async function verifyCompressedPayload(
  connection: Rpc,
  payload: CompressedPayload
): Promise<boolean> {
  // Verify ZK proof on-chain
}
```

**Benefits:**
- Reduced transaction costs (~99% smaller)
- ZK proof verification
- Enhanced privacy through compression

#### 1.2 Privacy Cash SDK Integration

**File:** `packages/crypto/src/shielded.ts`

```typescript
import { PrivacyCash } from '@privacy-cash/sdk';

export interface ShieldedTransfer {
  commitment: Uint8Array;
  nullifier: Uint8Array;
  proof: Uint8Array;
}

export async function createShieldedTransfer(
  amount: number,
  recipient: PublicKey,
  privateKey: Uint8Array
): Promise<ShieldedTransfer> {
  // Create shielded transfer using Privacy Cash
}

export async function settleShielded(
  transfer: ShieldedTransfer,
  connection: Connection
): Promise<string> {
  // Settle shielded transfer on-chain
}
```

**Benefits:**
- Shielded transaction amounts
- Unlinkable transfers
- Privacy Cash bounty eligibility ($15,000)

#### 1.3 Export Updated Modules

**File:** `packages/crypto/src/index.ts`

```typescript
// Existing exports
export * from './nacl-box';
export * from './threshold';
export * from './payload';

// New exports
export * from './zk-compression';
export * from './shielded';
```

---

### Phase 2: Confidential Swap Router Upgrades [COMPLETED]

#### 2.1 ZK-Encrypted Order Payloads

**File:** `apps/confidential-swap-router/sdk/src/encryption.ts`

Update to use ZK compression for order payloads:

```typescript
import { compressPayload } from '@veil/crypto';

export async function encryptSwapOrder(
  order: SwapOrderParams,
  solverPubkey: Uint8Array,
  connection: Rpc
): Promise<EncryptedOrder> {
  // 1. Serialize order parameters
  const serialized = serializeOrder(order);

  // 2. Encrypt with NaCl box (existing)
  const encrypted = encryptPayload(serialized, solverPubkey, keypair);

  // 3. Compress with ZK proof (new)
  const compressed = await compressPayload(connection, encrypted, payer);

  return {
    encryptedData: compressed.compressedData,
    proof: compressed.proof,
    publicInputs: compressed.publicInputs,
  };
}
```

#### 2.2 Shielded Settlement

**File:** `apps/confidential-swap-router/solver/src/solver.ts`

Add shielded output delivery:

```typescript
import { createShieldedTransfer, settleShielded } from '@veil/crypto';

async function executeOrderWithShielding(order: OrderData): Promise<string> {
  // 1. Execute swap via Jupiter (existing)
  const swapResult = await this.executeSwap(order);

  // 2. Shield output tokens (new)
  const shieldedTransfer = await createShieldedTransfer(
    swapResult.outputAmount,
    order.user,
    this.solverKeypair.secretKey
  );

  // 3. Settle shielded transfer
  return settleShielded(shieldedTransfer, this.connection);
}
```

#### 2.3 Update Program (Optional)

If time permits, add on-chain ZK verification:

```rust
// programs/confidential-swap-router/src/lib.rs

use light_verifier_sdk::verify_proof;

pub fn submit_order_zk(
    ctx: Context<SubmitOrderZk>,
    compressed_payload: Vec<u8>,
    proof: Vec<u8>,
) -> Result<()> {
    // Verify ZK proof on-chain
    verify_proof(&proof, &compressed_payload)?;

    // Store compressed order
    // ...
}
```

---

### Phase 3: RWA Secrets Service Upgrades [COMPLETED]

#### 3.1 ZK Access Proofs

**File:** `apps/rwa-secrets-service/sdk/src/encryption.ts`

Add ZK proofs for access verification:

```typescript
import { compressPayload } from '@veil/crypto';

export async function createAccessProof(
  grantee: PublicKey,
  accessLevel: AccessLevel,
  assetId: Uint8Array,
  connection: Rpc
): Promise<AccessProof> {
  // Create ZK proof that grantee has access without revealing details
  const accessData = serializeAccess(grantee, accessLevel, assetId);
  const compressed = await compressPayload(connection, accessData, payer);

  return {
    proof: compressed.proof,
    publicInputs: compressed.publicInputs,
  };
}

export async function verifyAccessProof(
  proof: AccessProof,
  connection: Rpc
): Promise<boolean> {
  // Verify access without revealing access level or asset details
}
```

#### 3.2 Compressed Metadata Storage

**File:** `apps/rwa-secrets-service/sdk/src/client.ts`

Use compression for metadata:

```typescript
export async function registerAssetCompressed(
  assetId: Uint8Array,
  assetType: AssetType,
  encryptedMetadata: Uint8Array,
  encryptionPubkey: Uint8Array
): Promise<string> {
  // Compress encrypted metadata with ZK proof
  const compressed = await compressPayload(
    this.connection,
    encryptedMetadata,
    this.wallet
  );

  // Store compressed metadata on-chain (much cheaper)
  return this.registerAssetOnChain(
    assetId,
    assetType,
    compressed.compressedData,
    encryptionPubkey
  );
}
```

#### 3.3 Range Compliance Integration (Bounty: $1,500+)

**File:** `apps/rwa-secrets-service/sdk/src/compliance.ts`

```typescript
import { Range } from '@range/sdk';

export async function preScreenAccess(
  grantee: PublicKey,
  accessLevel: AccessLevel
): Promise<ComplianceResult> {
  // Screen grantee before granting access
  const result = await Range.screen(grantee.toBase58());

  return {
    approved: result.clean,
    riskScore: result.riskScore,
    flags: result.flags,
  };
}

export async function createSelectiveDisclosure(
  assetId: Uint8Array,
  fields: string[],
  regulator: PublicKey
): Promise<DisclosureProof> {
  // Create ZK proof revealing only specific fields to regulator
}
```

---

### Phase 4: RPC Integration for Bounties [COMPLETED]

#### 4.1 Helius RPC Integration ($5,000 bounty)

**File:** `packages/crypto/src/rpc.ts`

```typescript
export function createHeliusConnection(apiKey: string): Connection {
  return new Connection(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`);
}
```

#### 4.2 Quicknode RPC Integration ($3,000 bounty)

```typescript
export function createQuicknodeConnection(endpoint: string): Connection {
  return new Connection(endpoint);
}
```

Update environment configuration:

```bash
# .env.example
RPC_PROVIDER=helius  # or quicknode
HELIUS_API_KEY=your-api-key
QUICKNODE_ENDPOINT=your-endpoint
```

---

### Phase 5: Deployment & Submission [IN PROGRESS]

#### 5.1 Deploy to Devnet

```bash
# Configure for devnet
solana config set --url devnet

# Airdrop SOL for deployment
solana airdrop 5

# Deploy Confidential Swap Router
cd apps/confidential-swap-router
anchor build
anchor deploy

# Deploy RWA Secrets Service
cd apps/rwa-secrets-service
anchor build
anchor deploy
```

#### 5.2 Demo Videos (Required)

| Project | Duration | Key Demos |
|---------|----------|-----------|
| Confidential Swap Router | 3 min max | 1. Connect wallet, 2. Create encrypted swap order, 3. Show ZK compression, 4. Execute via solver, 5. Show shielded output |
| RWA Secrets Service | 3 min max | 1. Connect wallet, 2. Register encrypted asset, 3. Grant ZK-verified access, 4. Show compliance check, 5. Decrypt as grantee |

#### 5.3 Submission Checklist

**For Each Project:**

- [x] Code is open source on GitHub
- [x] Programs deployed to devnet
- [ ] Demo video uploaded (max 3 minutes)
- [x] README with setup instructions
- [x] Working frontend demo
- [x] Sponsor SDK integrations documented
- [x] Devnet integration tests passing
- [x] SUBMISSION.md created
- [x] DEMO_SCRIPT.md created

---

## Timeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           TIMELINE                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Jan 12-14: Phase 1 - Shared Library Upgrades              [COMPLETED]  │
│  ├── Day 1: Light Protocol ZK integration                  ✓            │
│  └── Day 2-3: Privacy Cash SDK integration                 ✓            │
│                                                                          │
│  Jan 15-17: Phase 2 - Confidential Swap Router             [COMPLETED]  │
│  ├── Day 4: ZK-encrypted orders                            ✓            │
│  └── Day 5-6: Shielded settlements                         ✓            │
│                                                                          │
│  Jan 18-20: Phase 3 - RWA Secrets Service                  [COMPLETED]  │
│  ├── Day 7: ZK access proofs                               ✓            │
│  └── Day 8-9: Range compliance integration                 (deferred)   │
│                                                                          │
│  Jan 21-22: Phase 4 - RPC Integration                      [COMPLETED]  │
│  └── Day 10-11: Helius/Quicknode setup                     ✓            │
│                                                                          │
│  Jan 23-26: Phase 5 - Deployment & Testing                 [COMPLETED]  │
│  ├── Day 12: Deploy to devnet                              ✓            │
│  └── Day 13-15: End-to-end testing                         ✓            │
│                                                                          │
│  Jan 27-30: Phase 6 - Demo Videos & Documentation          [IN PROGRESS]│
│  ├── Day 16-17: Record demo videos                         (pending)    │
│  └── Day 18-19: Final documentation                        ✓            │
│                                                                          │
│  Feb 1: SUBMISSION DEADLINE                                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Prize Potential

### Track Prizes

| Project | Track | Prize |
|---------|-------|-------|
| Fabcash | Private Payments | $15,000 |
| Confidential Swap Router | Open Track | $18,000 |
| RWA Secrets Service | Privacy Tooling | $15,000 |
| **Subtotal** | | **$48,000** |

### Bounty Eligibility

| Bounty | Eligible Projects | Prize |
|--------|-------------------|-------|
| Privacy Cash - Best Overall | Fabcash, Swap Router | $6,000 |
| Privacy Cash - Best Integration | Swap Router | $6,000 |
| Light Protocol | Fabcash, Swap Router, RWA | (Part of Open Track) |
| Helius - Best Privacy Project | All three | $5,000 |
| Quicknode - Open Source Tooling | RWA Secrets Service | $3,000 |
| Range - Compliant Privacy | RWA Secrets Service | $1,500+ |
| **Subtotal** | | **$21,500+** |

### Total Potential

| Category | Amount |
|----------|--------|
| Track Prizes | $48,000 |
| Bounties | $21,500+ |
| **Maximum Total** | **$69,500+** |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Light Protocol integration complexity | Start early, use their examples, attend workshop (Jan 14) |
| Privacy Cash SDK learning curve | Attend workshop (Jan 13), Fabcash already integrated |
| Time constraints | Prioritize: ZK compression > Shielded transfers > Compliance |
| Devnet deployment issues | Test locally first, have backup plan |
| Demo video quality | Script beforehand, do multiple takes |

---

## Resources

### Workshops to Attend

| Date | Workshop | Relevance |
|------|----------|-----------|
| Jan 13, 2pm ET | Privacy Cash SDK | Direct integration |
| Jan 14, 12pm ET | ZK by Light Protocol | ZK compression |
| Jan 15, 1pm ET | Range Compliance | RWA compliance |
| Jan 16, 12pm ET | Confidential Transfers | General knowledge |

### Documentation Links

- [Light Protocol Docs](https://docs.lightprotocol.com/)
- [Privacy Cash SDK](https://docs.privacycash.io/)
- [Range SDK](https://docs.range.xyz/)
- [Solana Confidential Transfers](https://spl.solana.com/confidential-token)

---

## Conclusion

By leveraging the shared `@veil/crypto` library, we can efficiently upgrade both the Confidential Swap Router and RWA Secrets Service with ZK proofs and sponsor SDK integrations. Combined with Fabcash, this gives us three strong submissions across all three tracks, maximizing our prize potential while minimizing redundant development effort.

**Key Success Factors:**
1. Shared library upgrades benefit multiple projects
2. Each project targets a different track (no self-competition)
3. Multiple bounty eligibility per project
4. Attend relevant workshops for integration support
