import nacl from 'tweetnacl';

export interface EncryptionKeypair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export interface EncryptedData {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
}

export function generateEncryptionKeypair(): EncryptionKeypair {
  const kp = nacl.box.keyPair();
  return { publicKey: kp.publicKey, secretKey: kp.secretKey };
}

export function deriveEncryptionKeypair(secretKey: Uint8Array): EncryptionKeypair {
  const kp = nacl.box.keyPair.fromSecretKey(secretKey);
  return { publicKey: kp.publicKey, secretKey: kp.secretKey };
}

export function encrypt(
  plaintext: Uint8Array,
  recipientPublicKey: Uint8Array,
  senderKeypair: EncryptionKeypair,
): EncryptedData {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const ciphertext = nacl.box(plaintext, nonce, recipientPublicKey, senderKeypair.secretKey);
  if (!ciphertext) throw new Error('Encryption failed');
  return { ciphertext, nonce };
}

export function decrypt(
  combined: Uint8Array,
  senderPublicKey: Uint8Array,
  recipientKeypair: EncryptionKeypair,
): Uint8Array {
  const nonce = combined.slice(0, nacl.box.nonceLength);
  const ciphertext = combined.slice(nacl.box.nonceLength);
  const plaintext = nacl.box.open(ciphertext, nonce, senderPublicKey, recipientKeypair.secretKey);
  if (!plaintext) throw new Error('Decryption failed');
  return plaintext;
}
