# Fabrknt Privacy -- QuickNode Marketplace Add-On

## User Guide

Version 0.1.0

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Authentication](#authentication)
4. [API Reference](#api-reference)
   - [Keypair Generation](#keypair-generation)
   - [Keypair Derivation](#keypair-derivation)
   - [Encrypt](#encrypt)
   - [Decrypt](#decrypt)
   - [Broadcast Encryption](#broadcast-encryption)
   - [Validate Encrypted Data](#validate-encrypted-data)
   - [Key Format Conversion](#key-format-conversion)
   - [Shamir Split](#shamir-split)
   - [Shamir Combine](#shamir-combine)
   - [Shamir Verify](#shamir-verify)
   - [Encrypt Order](#encrypt-order)
   - [Decrypt Order](#decrypt-order)
   - [Validate Order](#validate-order)
   - [Payload Serialize](#payload-serialize)
   - [Payload Deserialize](#payload-deserialize)
   - [Compression Estimate](#compression-estimate)
   - [ZK Compress (Pro)](#zk-compress-pro)
   - [ZK Decompress (Pro)](#zk-decompress-pro)
5. [Error Handling](#error-handling)
6. [Use Cases](#use-cases)

---

## Overview

Fabrknt Privacy is a QuickNode Marketplace add-on built on Veil that provides chain-agnostic privacy primitives for Web3 developers. It exposes a REST API with the following capabilities:

- **NaCl Encryption** -- Authenticated public-key encryption using Curve25519-XSalsa20-Poly1305 (NaCl `box`). Generate or derive X25519 keypairs, encrypt for one or many recipients, and validate ciphertext structure.
- **Shamir Secret Sharing** -- Split a 32-byte secret into M-of-N shares using Shamir's scheme over GF(256). Distribute shares across parties so that any M can reconstruct the secret, but fewer than M reveal nothing.
- **Encrypted Order Payloads** -- Purpose-built encryption for swap orders (minOutputAmount, slippageBps, deadline). Designed for MEV-protected order submission on any DEX.
- **Payload Serialization** -- Convert structured data to compact binary using named schemas (`SWAP_ORDER`, `RWA_ASSET`, `RWA_ACCESS_GRANT`) or custom schemas. Useful for on-chain storage where every byte counts.
- **ZK Compression** -- Estimate cost savings from Light Protocol ZK compression (chain-agnostic). Pro plan users can compress and decompress data on Solana via their provisioned QuickNode RPC endpoint.

All cryptographic operations are stateless. No plaintext, keys, or secrets are stored server-side.

---

## Getting Started

### Installation

1. Go to the [QuickNode Marketplace](https://marketplace.quicknode.com/).
2. Search for **Fabrknt Privacy**.
3. Click **Add** and select a plan.
4. Attach the add-on to an existing Solana endpoint (required for ZK compression features on the Pro plan; any endpoint works for chain-agnostic features).
5. After provisioning, note your **Endpoint ID** -- this is your `X-INSTANCE-ID` for API calls.

### Plans

| Plan | Price | Rate Limit | Features |
|------|-------|------------|----------|
| **Starter** | Free | 100 req/min | NaCl encryption/decryption, broadcast encryption, keypair generation and derivation, key format conversion, encrypted data validation, Shamir secret sharing (split/combine/verify), encrypted order payloads, payload serialization (SWAP_ORDER, RWA_ASSET, RWA_ACCESS_GRANT), ZK compression cost estimation |
| **Pro** | TBD | 500 req/min | Everything in Starter, plus ZK data compression and decompression via Light Protocol using your provisioned QuickNode RPC endpoint |

### Base URL

All API endpoints are served at the base URL provided by QuickNode after provisioning. Examples in this guide use `$BASE_URL` as a placeholder.

---

## Authentication

API endpoints that require a provisioned instance use the `X-INSTANCE-ID` header. This header contains the Endpoint ID assigned during provisioning.

```
X-INSTANCE-ID: <your-endpoint-id>
```

The `X-INSTANCE-ID` header is **required** for Pro-plan endpoints (ZK compress/decompress) that need access to the provisioned RPC URL. Starter-plan endpoints are stateless and do not require this header.

Additional headers recognized by the add-on (set automatically by QuickNode):

| Header | Description |
|--------|-------------|
| `X-INSTANCE-ID` | Your provisioned endpoint ID |
| `X-QUICKNODE-ID` | Your QuickNode account ID |
| `X-QN-CHAIN` | Chain identifier (e.g., `solana`) |
| `X-QN-NETWORK` | Network identifier (e.g., `mainnet-beta`) |

---

## API Reference

All request and response bodies use JSON. Binary data is encoded as base64 strings. Most responses also include a hex encoding for convenience. Every response contains a `success` boolean field.

### Keypair Generation

Generate a random NaCl X25519 encryption keypair.

**POST** `/v1/keypair/generate`

**Plan:** Starter

**Request body:** None (empty object or no body required).

```bash
curl -X POST "$BASE_URL/v1/keypair/generate" \
  -H "Content-Type: application/json"
```

**Response:**

```json
{
  "success": true,
  "publicKey": {
    "base64": "dGhpcyBpcyBhIHB1YmxpYyBrZXk=",
    "hex": "7468697320697320612070..."
  },
  "secretKey": {
    "base64": "c2VjcmV0IGtleSBieXRlcw==",
    "hex": "736563726574206b65792062..."
  }
}
```

---

### Keypair Derivation

Derive a deterministic encryption keypair from a 32-byte seed. The same seed always produces the same keypair.

**POST** `/v1/keypair/derive`

**Plan:** Starter

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `seed` | string (base64) | Yes | Exactly 32 bytes, base64-encoded |

```bash
curl -X POST "$BASE_URL/v1/keypair/derive" \
  -H "Content-Type: application/json" \
  -d '{
    "seed": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
  }'
```

**Response:** Same shape as `/v1/keypair/generate`.

---

### Encrypt

Encrypt plaintext using NaCl box (Curve25519-XSalsa20-Poly1305).

**POST** `/v1/encrypt`

**Plan:** Starter

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `plaintext` | string (base64) | Yes | Data to encrypt |
| `recipientPublicKey` | string (base64) | Yes | Recipient's X25519 public key |
| `senderSecretKey` | string (base64) | Yes | Sender's secret key |
| `senderPublicKey` | string (base64) | Yes | Sender's public key |

```bash
curl -X POST "$BASE_URL/v1/encrypt" \
  -H "Content-Type: application/json" \
  -d '{
    "plaintext": "SGVsbG8gV29ybGQ=",
    "recipientPublicKey": "<recipient-pk-base64>",
    "senderSecretKey": "<sender-sk-base64>",
    "senderPublicKey": "<sender-pk-base64>"
  }'
```

**Response:**

```json
{
  "success": true,
  "nonce": {
    "base64": "...",
    "hex": "..."
  },
  "ciphertext": {
    "base64": "...",
    "hex": "..."
  },
  "bytes": {
    "base64": "...",
    "hex": "..."
  }
}
```

The `bytes` field contains the complete encrypted payload (nonce + ciphertext) suitable for storage or transmission. Use it as input to the `/v1/decrypt` endpoint.

---

### Decrypt

Decrypt NaCl box ciphertext back to plaintext.

**POST** `/v1/decrypt`

**Plan:** Starter

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bytes` | string (base64) | Yes | Complete encrypted payload (from encrypt response `bytes` field) |
| `senderPublicKey` | string (base64) | Yes | Public key of the original sender |
| `recipientSecretKey` | string (base64) | Yes | Recipient's secret key |
| `recipientPublicKey` | string (base64) | Yes | Recipient's public key |

```bash
curl -X POST "$BASE_URL/v1/decrypt" \
  -H "Content-Type: application/json" \
  -d '{
    "bytes": "<encrypted-bytes-base64>",
    "senderPublicKey": "<sender-pk-base64>",
    "recipientSecretKey": "<recipient-sk-base64>",
    "recipientPublicKey": "<recipient-pk-base64>"
  }'
```

**Response:**

```json
{
  "success": true,
  "plaintext": {
    "base64": "SGVsbG8gV29ybGQ=",
    "hex": "48656c6c6f20576f726c64"
  }
}
```

---

### Broadcast Encryption

Encrypt the same plaintext for multiple recipients in a single call (up to 50).

**POST** `/v1/crypto/encrypt-multiple`

**Plan:** Starter

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `plaintext` | string (base64) | Yes | Data to encrypt |
| `recipientPublicKeys` | string[] (base64) | Yes | Array of 1-50 recipient public keys |
| `senderSecretKey` | string (base64) | Yes | Sender's secret key |
| `senderPublicKey` | string (base64) | Yes | Sender's public key |

```bash
curl -X POST "$BASE_URL/v1/crypto/encrypt-multiple" \
  -H "Content-Type: application/json" \
  -d '{
    "plaintext": "SGVsbG8gV29ybGQ=",
    "recipientPublicKeys": [
      "<recipient1-pk-base64>",
      "<recipient2-pk-base64>"
    ],
    "senderSecretKey": "<sender-sk-base64>",
    "senderPublicKey": "<sender-pk-base64>"
  }'
```

**Response:**

```json
{
  "success": true,
  "recipientCount": 2,
  "recipients": {
    "<recipient1-pk-hex>": {
      "nonce": { "base64": "...", "hex": "..." },
      "ciphertext": { "base64": "...", "hex": "..." },
      "bytes": { "base64": "...", "hex": "..." }
    },
    "<recipient2-pk-hex>": {
      "nonce": { "base64": "...", "hex": "..." },
      "ciphertext": { "base64": "...", "hex": "..." },
      "bytes": { "base64": "...", "hex": "..." }
    }
  }
}
```

The `recipients` object is keyed by each recipient's public key in hex format.

---

### Validate Encrypted Data

Check whether a byte array conforms to the NaCl box encrypted data structure. Optionally enforce plaintext size bounds.

**POST** `/v1/crypto/validate`

**Plan:** Starter

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bytes` | string (base64) | Yes | Encrypted payload to validate |
| `minPlaintextSize` | number | No | Minimum expected plaintext size in bytes |
| `maxPlaintextSize` | number | No | Maximum expected plaintext size in bytes |

```bash
curl -X POST "$BASE_URL/v1/crypto/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "bytes": "<encrypted-bytes-base64>",
    "minPlaintextSize": 1,
    "maxPlaintextSize": 1024
  }'
```

**Response:**

```json
{
  "success": true,
  "valid": true,
  "byteLength": 75
}
```

---

### Key Format Conversion

Convert an encryption public key between base64, hex, and base58 (Solana) formats.

**POST** `/v1/crypto/key-convert`

**Plan:** Starter

Provide **one** of:

| Field | Type | Description |
|-------|------|-------------|
| `publicKey` | string (base64) | Convert from base64/hex to base58 |
| `base58` | string | Convert from base58 to base64/hex |

```bash
# base64 -> base58
curl -X POST "$BASE_URL/v1/crypto/key-convert" \
  -H "Content-Type: application/json" \
  -d '{ "publicKey": "<pk-base64>" }'

# base58 -> base64/hex
curl -X POST "$BASE_URL/v1/crypto/key-convert" \
  -H "Content-Type: application/json" \
  -d '{ "base58": "7YWHk..." }'
```

**Response:**

```json
{
  "success": true,
  "base58": "7YWHk...",
  "publicKey": {
    "base64": "...",
    "hex": "..."
  }
}
```

---

### Shamir Split

Split a 32-byte secret into M-of-N Shamir shares.

**POST** `/v1/threshold/split`

**Plan:** Starter

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `secret` | string (base64) | Yes | Exactly 32 bytes, base64-encoded |
| `threshold` | number | Yes | Minimum shares needed to reconstruct (>= 2) |
| `totalShares` | number | Yes | Total shares to generate (>= threshold, <= 255) |

```bash
curl -X POST "$BASE_URL/v1/threshold/split" \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    "threshold": 3,
    "totalShares": 5
  }'
```

**Response:**

```json
{
  "success": true,
  "shares": [
    { "index": 1, "value": "..." },
    { "index": 2, "value": "..." },
    { "index": 3, "value": "..." },
    { "index": 4, "value": "..." },
    { "index": 5, "value": "..." }
  ]
}
```

Each share `value` is a base64-encoded byte string. Distribute shares to different parties. Store the `index` alongside each share -- it is required for reconstruction.

---

### Shamir Combine

Reconstruct the original 32-byte secret from a sufficient number of Shamir shares.

**POST** `/v1/threshold/combine`

**Plan:** Starter

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `shares` | array | Yes | At least 2 share objects, each with `index` (number) and `value` (base64) |

```bash
curl -X POST "$BASE_URL/v1/threshold/combine" \
  -H "Content-Type: application/json" \
  -d '{
    "shares": [
      { "index": 1, "value": "<share1-base64>" },
      { "index": 3, "value": "<share3-base64>" },
      { "index": 5, "value": "<share5-base64>" }
    ]
  }'
```

**Response:**

```json
{
  "success": true,
  "secret": {
    "base64": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    "hex": "0000000000000000000000000000000000000000000000000000000000000000"
  }
}
```

---

### Shamir Verify

Verify that a set of Shamir shares are consistent with a given threshold -- i.e., that they would reconstruct the same secret.

**POST** `/v1/threshold/verify`

**Plan:** Starter

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `shares` | array | Yes | At least 2 share objects, each with `index` (number) and `value` (base64) |
| `threshold` | number | Yes | The threshold (>= 2) used when the shares were created |

```bash
curl -X POST "$BASE_URL/v1/threshold/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "shares": [
      { "index": 1, "value": "<share1-base64>" },
      { "index": 2, "value": "<share2-base64>" },
      { "index": 3, "value": "<share3-base64>" }
    ],
    "threshold": 3
  }'
```

**Response:**

```json
{
  "success": true,
  "valid": true,
  "sharesProvided": 3,
  "threshold": 3
}
```

---

### Encrypt Order

Encrypt a swap order payload for MEV-protected submission. The order fields are serialized and then encrypted using NaCl box so that only the designated solver can read them.

**POST** `/v1/orders/encrypt`

**Plan:** Starter

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `minOutputAmount` | string | Yes | Minimum acceptable output amount |
| `slippageBps` | number | Yes | Slippage tolerance in basis points |
| `deadline` | number | Yes | Unix timestamp deadline for order execution |
| `solverPublicKey` | string (base64) | Yes | Solver/relayer's public key (recipient) |
| `userSecretKey` | string (base64) | Yes | User's secret key |
| `userPublicKey` | string (base64) | Yes | User's public key |

```bash
curl -X POST "$BASE_URL/v1/orders/encrypt" \
  -H "Content-Type: application/json" \
  -d '{
    "minOutputAmount": "1000000",
    "slippageBps": 50,
    "deadline": 1700000000,
    "solverPublicKey": "<solver-pk-base64>",
    "userSecretKey": "<user-sk-base64>",
    "userPublicKey": "<user-pk-base64>"
  }'
```

**Response:**

```json
{
  "success": true,
  "nonce": { "base64": "...", "hex": "..." },
  "ciphertext": { "base64": "...", "hex": "..." },
  "bytes": { "base64": "...", "hex": "..." }
}
```

---

### Decrypt Order

Decrypt an encrypted swap order payload. Typically called by the solver/relayer.

**POST** `/v1/orders/decrypt`

**Plan:** Starter

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bytes` | string (base64) | Yes | Encrypted order payload |
| `userPublicKey` | string (base64) | Yes | User's public key (sender of the order) |
| `solverSecretKey` | string (base64) | Yes | Solver's secret key |
| `solverPublicKey` | string (base64) | Yes | Solver's public key |

```bash
curl -X POST "$BASE_URL/v1/orders/decrypt" \
  -H "Content-Type: application/json" \
  -d '{
    "bytes": "<encrypted-order-base64>",
    "userPublicKey": "<user-pk-base64>",
    "solverSecretKey": "<solver-sk-base64>",
    "solverPublicKey": "<solver-pk-base64>"
  }'
```

**Response:**

```json
{
  "success": true,
  "payload": {
    "minOutputAmount": "1000000",
    "slippageBps": 50,
    "deadline": 1700000000
  }
}
```

---

### Validate Order

Validate that an encrypted byte array conforms to the encrypted order payload structure.

**POST** `/v1/orders/validate`

**Plan:** Starter

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bytes` | string (base64) | Yes | Encrypted order payload to validate |

```bash
curl -X POST "$BASE_URL/v1/orders/validate" \
  -H "Content-Type: application/json" \
  -d '{ "bytes": "<encrypted-order-base64>" }'
```

**Response:**

```json
{
  "success": true,
  "valid": true,
  "byteLength": 112
}
```

---

### Payload Serialize

Serialize structured data to compact binary using a named schema.

**POST** `/v1/payload/serialize`

**Plan:** Starter

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data` | object | Yes | Structured data matching the schema |
| `schema` | string | Yes | One of: `SWAP_ORDER`, `RWA_ASSET`, `RWA_ACCESS_GRANT` |

```bash
curl -X POST "$BASE_URL/v1/payload/serialize" \
  -H "Content-Type: application/json" \
  -d '{
    "schema": "SWAP_ORDER",
    "data": {
      "minOutputAmount": "1000000",
      "slippageBps": 50,
      "deadline": 1700000000
    }
  }'
```

**Response:**

```json
{
  "success": true,
  "bytes": {
    "base64": "...",
    "hex": "..."
  },
  "size": 24
}
```

---

### Payload Deserialize

Deserialize binary data back to structured fields using a named schema.

**POST** `/v1/payload/deserialize`

**Plan:** Starter

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bytes` | string (base64) | Yes | Binary data to deserialize |
| `schema` | string | Yes | One of: `SWAP_ORDER`, `RWA_ASSET`, `RWA_ACCESS_GRANT` |

```bash
curl -X POST "$BASE_URL/v1/payload/deserialize" \
  -H "Content-Type: application/json" \
  -d '{
    "schema": "SWAP_ORDER",
    "bytes": "<serialized-base64>"
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "minOutputAmount": "1000000",
    "slippageBps": 50,
    "deadline": 1700000000
  }
}
```

---

### Compression Estimate

Estimate ZK compression cost savings for a given data size. This endpoint is chain-agnostic and does not require an RPC connection.

**GET** `/v1/compression/estimate?size=<bytes>`

**Plan:** Starter

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `size` | integer (query) | Yes | Data size in bytes (positive integer) |

```bash
curl "$BASE_URL/v1/compression/estimate?size=4096"
```

**Response:**

```json
{
  "success": true,
  "dataSize": 4096,
  "uncompressedCost": "57344",
  "compressedCost": "12288",
  "savings": "45056",
  "savingsPercent": 78.57
}
```

---

### ZK Compress (Pro)

Compress data on-chain via Light Protocol ZK compression on Solana. Requires a provisioned QuickNode Solana endpoint.

**POST** `/v1/compression/compress`

**Plan:** Pro

**Headers:** `X-INSTANCE-ID` required.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data` | string (base64) | Yes | Data to compress |
| `payerSecretKey` | string (base64) | Yes | Solana payer account secret key (for transaction fees) |

```bash
curl -X POST "$BASE_URL/v1/compression/compress" \
  -H "Content-Type: application/json" \
  -H "X-INSTANCE-ID: <your-endpoint-id>" \
  -d '{
    "data": "<data-base64>",
    "payerSecretKey": "<payer-sk-base64>"
  }'
```

**Response:**

```json
{
  "success": true,
  "compressedData": "...",
  "proof": "...",
  "publicInputs": "...",
  "stateTreeRoot": "...",
  "dataHash": "..."
}
```

All response fields are base64-encoded. Save all fields -- they are all required for decompression.

---

### ZK Decompress (Pro)

Decompress Light Protocol ZK-compressed data on Solana.

**POST** `/v1/compression/decompress`

**Plan:** Pro

**Headers:** `X-INSTANCE-ID` required.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `compressedData` | string (base64) | Yes | From compress response |
| `proof` | string (base64) | Yes | From compress response |
| `publicInputs` | string (base64) | Yes | From compress response |
| `stateTreeRoot` | string (base64) | Yes | From compress response |
| `dataHash` | string (base64) | Yes | From compress response |

```bash
curl -X POST "$BASE_URL/v1/compression/decompress" \
  -H "Content-Type: application/json" \
  -H "X-INSTANCE-ID: <your-endpoint-id>" \
  -d '{
    "compressedData": "<compressed-data-base64>",
    "proof": "<proof-base64>",
    "publicInputs": "<public-inputs-base64>",
    "stateTreeRoot": "<state-tree-root-base64>",
    "dataHash": "<data-hash-base64>"
  }'
```

**Response:**

```json
{
  "success": true,
  "data": "<original-data-base64>"
}
```

---

## Error Handling

All error responses include `"success": false` and an `error` message.

### HTTP Status Codes

| Status | Meaning | When It Occurs |
|--------|---------|----------------|
| `400` | Bad Request | Missing required fields, invalid base64 encoding, invalid parameter types, secret not exactly 32 bytes, threshold < 2, totalShares > 255, recipientPublicKeys exceeds 50 entries, missing `X-INSTANCE-ID` header |
| `404` | Not Found | Instance not found or inactive (invalid `X-INSTANCE-ID`) |
| `429` | Too Many Requests | Rate limit exceeded (100 req/min Starter, 500 req/min Pro) |
| `500` | Internal Server Error | Unexpected server-side failure |

### Error Response Format

```json
{
  "success": false,
  "error": "seed must be exactly 32 bytes"
}
```

### Common Errors

| Error Message | Cause | Fix |
|---------------|-------|-----|
| `"seed must be exactly 32 bytes"` | Seed provided to `/v1/keypair/derive` is not 32 bytes | Provide a 32-byte value, base64-encoded (44 characters with padding) |
| `"All fields must be valid base64"` | One or more fields failed base64 decoding | Verify all binary fields are properly base64-encoded |
| `"recipientPublicKeys must have 1-50 entries"` | Empty array or more than 50 recipients | Provide between 1 and 50 recipient keys |
| `"threshold must be a number >= 2"` | Threshold below minimum | Use a threshold of at least 2 |
| `"totalShares must be a number >= threshold and <= 255"` | Invalid share count | Ensure totalShares >= threshold and <= 255 |
| `"Missing X-INSTANCE-ID header"` | Pro endpoint called without instance header | Add `X-INSTANCE-ID` header with your endpoint ID |
| `"Instance not found or inactive"` | Invalid or deprovisioned instance ID | Verify your endpoint ID is correct and the add-on is active |
| `"No RPC URL configured for this instance"` | Instance was not provisioned with an RPC URL | Re-provision the add-on with a Solana endpoint that provides an HTTP URL |
| `"Too many requests, please try again later."` | Rate limit exceeded | Back off and retry after the rate limit window resets (1 minute) |

### Correlation

Every response includes an `X-Request-Id` header. Include this value when contacting support to help trace issues.

---

## Use Cases

### Encrypted Order Books

Protect swap orders from MEV extraction by encrypting order parameters before submission. Only the designated solver can decrypt.

```bash
# 1. Generate keypairs for user and solver
USER_KEYS=$(curl -s -X POST "$BASE_URL/v1/keypair/generate")
SOLVER_KEYS=$(curl -s -X POST "$BASE_URL/v1/keypair/generate")

# 2. User encrypts an order for the solver
curl -X POST "$BASE_URL/v1/orders/encrypt" \
  -H "Content-Type: application/json" \
  -d '{
    "minOutputAmount": "5000000",
    "slippageBps": 100,
    "deadline": 1700000000,
    "solverPublicKey": "'$(echo $SOLVER_KEYS | jq -r .publicKey.base64)'",
    "userSecretKey": "'$(echo $USER_KEYS | jq -r .secretKey.base64)'",
    "userPublicKey": "'$(echo $USER_KEYS | jq -r .publicKey.base64)'"
  }'

# 3. Solver decrypts the order to execute it
curl -X POST "$BASE_URL/v1/orders/decrypt" \
  -H "Content-Type: application/json" \
  -d '{
    "bytes": "<encrypted-order-from-step-2>",
    "userPublicKey": "'$(echo $USER_KEYS | jq -r .publicKey.base64)'",
    "solverSecretKey": "'$(echo $SOLVER_KEYS | jq -r .secretKey.base64)'",
    "solverPublicKey": "'$(echo $SOLVER_KEYS | jq -r .publicKey.base64)'"
  }'
```

### Multi-Party Key Management

Use Shamir secret sharing to distribute an encryption key across multiple custodians. No single party can reconstruct the key alone.

```bash
# 1. Generate a keypair (the secret key is what we want to protect)
KEYS=$(curl -s -X POST "$BASE_URL/v1/keypair/generate")
SECRET_KEY=$(echo $KEYS | jq -r .secretKey.base64)

# 2. Split the secret key into 5 shares with a threshold of 3
curl -X POST "$BASE_URL/v1/threshold/split" \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "'$SECRET_KEY'",
    "threshold": 3,
    "totalShares": 5
  }'
# Distribute shares to 5 custodians. Any 3 can reconstruct.

# 3. Later, 3 custodians combine their shares to recover the key
curl -X POST "$BASE_URL/v1/threshold/combine" \
  -H "Content-Type: application/json" \
  -d '{
    "shares": [
      { "index": 1, "value": "<share1>" },
      { "index": 3, "value": "<share3>" },
      { "index": 5, "value": "<share5>" }
    ]
  }'

# 4. Verify shares are consistent before a critical operation
curl -X POST "$BASE_URL/v1/threshold/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "shares": [
      { "index": 1, "value": "<share1>" },
      { "index": 3, "value": "<share3>" },
      { "index": 5, "value": "<share5>" }
    ],
    "threshold": 3
  }'
```

### Privacy-Preserving Compliance

Encrypt sensitive RWA (Real World Asset) data so it can be stored on-chain in compliance with privacy regulations, while remaining accessible to authorized parties.

```bash
# 1. Serialize an RWA asset record
curl -X POST "$BASE_URL/v1/payload/serialize" \
  -H "Content-Type: application/json" \
  -d '{
    "schema": "RWA_ASSET",
    "data": {
      "assetId": "PROP-2024-001",
      "ownerHash": "abc123...",
      "valueCents": 50000000,
      "jurisdiction": "US-CA"
    }
  }'

# 2. Encrypt the serialized payload for the compliance auditor
curl -X POST "$BASE_URL/v1/encrypt" \
  -H "Content-Type: application/json" \
  -d '{
    "plaintext": "<serialized-bytes-base64>",
    "recipientPublicKey": "<auditor-pk-base64>",
    "senderSecretKey": "<issuer-sk-base64>",
    "senderPublicKey": "<issuer-pk-base64>"
  }'

# 3. Grant access to additional parties using broadcast encryption
curl -X POST "$BASE_URL/v1/crypto/encrypt-multiple" \
  -H "Content-Type: application/json" \
  -d '{
    "plaintext": "<serialized-bytes-base64>",
    "recipientPublicKeys": [
      "<auditor-pk-base64>",
      "<regulator-pk-base64>",
      "<custodian-pk-base64>"
    ],
    "senderSecretKey": "<issuer-sk-base64>",
    "senderPublicKey": "<issuer-pk-base64>"
  }'

# 4. Serialize an access grant record
curl -X POST "$BASE_URL/v1/payload/serialize" \
  -H "Content-Type: application/json" \
  -d '{
    "schema": "RWA_ACCESS_GRANT",
    "data": {
      "assetId": "PROP-2024-001",
      "granteePublicKey": "<auditor-pk-base64>",
      "permissions": ["read", "audit"],
      "expiry": 1735689600
    }
  }'

# 5. (Pro) Compress the encrypted payload for cheaper on-chain storage
curl -X POST "$BASE_URL/v1/compression/compress" \
  -H "Content-Type: application/json" \
  -H "X-INSTANCE-ID: <your-endpoint-id>" \
  -d '{
    "data": "<encrypted-bytes-base64>",
    "payerSecretKey": "<payer-sk-base64>"
  }'
```

This pattern lets you store encrypted, compressed asset records on Solana while maintaining selective disclosure -- only parties with the correct decryption keys can read the underlying data, and access grants are themselves auditable on-chain.
