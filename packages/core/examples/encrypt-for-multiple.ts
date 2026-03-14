/**
 * @fabrknt/veil-crypto — Multi-recipient Encryption Example
 *
 * Demonstrates encrypting a single payload for multiple recipients
 * (e.g. a compliance officer and a counterparty both need to read
 * the same KYC data).
 */
import {
  generateEncryptionKeypair,
  encryptForMultiple,
  decrypt,
} from '@fabrknt/veil-crypto';

// Three parties
const issuer = generateEncryptionKeypair();
const investor = generateEncryptionKeypair();
const complianceOfficer = generateEncryptionKeypair();

// Issuer encrypts confidential terms for both investor and compliance
const terms = new TextEncoder().encode(
  JSON.stringify({
    securityId: 'SEC-2024-001',
    terms: 'Restricted — accredited investors only',
    jurisdiction: 'JP',
  }),
);

const recipients = [investor.publicKey, complianceOfficer.publicKey];
const results = encryptForMultiple(terms, recipients, issuer);

console.log(`Encrypted for ${results.length} recipients\n`);

// Each recipient decrypts independently with their own keypair
for (const [i, result] of results.entries()) {
  const combined = new Uint8Array(result.nonce.length + result.ciphertext.length);
  combined.set(result.nonce, 0);
  combined.set(result.ciphertext, result.nonce.length);

  const recipientKeypair = i === 0 ? investor : complianceOfficer;
  const plaintext = decrypt(combined, issuer.publicKey, recipientKeypair);
  const label = i === 0 ? 'Investor' : 'Compliance Officer';

  console.log(`${label} decrypted:`, JSON.parse(new TextDecoder().decode(plaintext)));
}
