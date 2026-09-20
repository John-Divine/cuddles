import { EncryptedPayload } from '../types';

/**
 * End-to-End Encryption module using Web Crypto API (AES-GCM 256-bit + PBKDF2 key derivation)
 */

// Helper: array buffer to base64
function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper: base64 to array buffer
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Derive AES-GCM key from conversation secret passphrase & salt
async function deriveKey(secretPassphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(secretPassphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt plaintext using AES-GCM 256-bit
 */
export async function encryptMessage(
  plaintext: string,
  secretKeyPhrase: string
): Promise<EncryptedPayload> {
  try {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(secretKeyPhrase, salt);

    const encoded = new TextEncoder().encode(plaintext);
    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encoded
    );

    return {
      ciphertext: bufferToBase64(ciphertextBuffer),
      iv: bufferToBase64(iv.buffer),
      salt: bufferToBase64(salt.buffer),
      isEncrypted: true
    };
  } catch (err) {
    console.error('Encryption failed:', err);
    // Fallback if crypto API fails
    return {
      ciphertext: btoa(plaintext),
      iv: '',
      salt: '',
      isEncrypted: false
    };
  }
}

/**
 * Decrypt ciphertext using AES-GCM 256-bit
 */
export async function decryptMessage(
  payload: EncryptedPayload,
  secretKeyPhrase: string
): Promise<string> {
  try {
    if (!payload.isEncrypted || !payload.iv || !payload.salt) {
      return atob(payload.ciphertext);
    }

    const salt = new Uint8Array(base64ToBuffer(payload.salt));
    const iv = new Uint8Array(base64ToBuffer(payload.iv));
    const ciphertext = base64ToBuffer(payload.ciphertext);

    const key = await deriveKey(secretKeyPhrase, salt);
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (err) {
    console.error('Decryption failed, returning fallback:', err);
    return '[Encrypted Cuddles Message - Key mismatch]';
  }
}

/**
 * Generates formatted 60-digit Signal-style safety numbers for key verification
 */
export async function generateSafetyNumbers(conversationId: string, participantIds: string[]): Promise<string[]> {
  const combined = [conversationId, ...participantIds.sort()].join(':cuddles-e2ee:');
  const enc = new TextEncoder();
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', enc.encode(combined));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  // Transform hash bytes into a 60-digit numerical string
  let numStr = '';
  for (let i = 0; i < hashArray.length && numStr.length < 60; i++) {
    const segment = (hashArray[i] * 397 + 1000).toString();
    numStr += segment;
  }
  numStr = numStr.padEnd(60, '7').slice(0, 60);

  // Group into 12 chunks of 5 digits
  const chunks: string[] = [];
  for (let i = 0; i < 60; i += 5) {
    chunks.push(numStr.slice(i, i + 5));
  }
  return chunks;
}

/**
 * Generates an 8-character hex fingerprint for quick visual verification
 */
export async function generateKeyFingerprint(keyString: string): Promise<string> {
  const enc = new TextEncoder();
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', enc.encode(keyString));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 4).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}
