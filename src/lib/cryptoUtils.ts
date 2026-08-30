/**
 * FFCSI AFMS - Cryptographic Security & Vault Utilities
 * 
 * Standards & Implementations:
 * 1. PBKDF2 with HMAC-SHA256 (100,000 iterations per NIST SP 800-132 recommendations)
 * 2. Cryptographically secure 128-bit random salt (CSPRNG via Web Crypto)
 * 3. AES-GCM 256-bit Authenticated Encryption / Decryption with PBKDF2 Key Derivation
 * 4. Zero-knowledge hash verification with timing-attack resistant comparison
 */

export const PBKDF2_ITERATIONS = 100000;
export const PBKDF2_HASH_ALGO = 'SHA-256';

export interface Pbkdf2HashResult {
  hash: string;            // 256-bit hex string (64 characters)
  base64Hash: string;      // Base64-encoded hash
  salt: string;            // 128-bit hex salt (32 characters)
  iterations: number;      // 100,000
  algorithm: string;       // PBKDF2-HMAC-SHA256
  timestamp: string;       // ISO timestamp
}

/**
 * Converts ArrayBuffer to Hex String
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converts ArrayBuffer to Base64 String
 */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Converts Hex String to Uint8Array
 */
function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Generates a cryptographically secure random salt hex string
 */
export function generateSalt(length: number = 16): string {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return bufferToHex(array.buffer);
}

/**
 * Generates a secure random session token
 */
export function generateSessionToken(): string {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return bufferToHex(array.buffer);
}

/**
 * Hashes a plaintext secret (password or PIN) using PBKDF2 with SHA-256 (100,000 iterations)
 */
export async function hashPassword(
  password: string, 
  existingSalt?: string,
  iterations: number = PBKDF2_ITERATIONS
): Promise<{ hash: string; salt: string }> {
  const result = await hashSecretPbkdf2(password, existingSalt, iterations);
  return { hash: result.hash, salt: result.salt };
}

/**
 * Comprehensive PBKDF2 Hashing function returning full cryptographic metadata
 */
export async function hashSecretPbkdf2(
  secret: string,
  existingSalt?: string,
  iterations: number = PBKDF2_ITERATIONS
): Promise<Pbkdf2HashResult> {
  const salt = existingSalt || generateSalt(16);
  const encoder = new TextEncoder();
  
  // Import raw password string into CryptoKey
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(secret || ''),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations,
      hash: PBKDF2_HASH_ALGO
    },
    keyMaterial,
    256
  );

  const hash = bufferToHex(derivedBits);
  const base64Hash = bufferToBase64(derivedBits);

  return {
    hash,
    base64Hash,
    salt,
    iterations,
    algorithm: `PBKDF2-HMAC-${PBKDF2_HASH_ALGO}`,
    timestamp: new Date().toISOString()
  };
}

/**
 * Synchronous / Fast SHA-256 digest
 */
export async function hashSha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
}

/**
 * Verifies a plaintext password against a stored PBKDF2 hash and salt using timing-safe comparison
 */
export async function verifyPassword(
  passwordInput: string, 
  storedHash: string, 
  salt: string,
  iterations: number = PBKDF2_ITERATIONS
): Promise<boolean> {
  if (!passwordInput || !storedHash || !salt) return false;
  
  try {
    const { hash } = await hashPassword(passwordInput, salt, iterations);
    // Constant-time comparison to prevent timing side-channel attacks
    if (hash.length !== storedHash.length) return false;
    let result = 0;
    for (let i = 0; i < hash.length; i++) {
      result |= hash.charCodeAt(i) ^ storedHash.charCodeAt(i);
    }
    return result === 0;
  } catch (err) {
    console.error('PBKDF2 password verification error:', err);
    return false;
  }
}

/**
 * Benchmarks PBKDF2 computation time on client machine for 100,000 iterations
 */
export async function benchmarkPbkdf2(): Promise<{ durationMs: number; iterations: number }> {
  const startTime = performance.now();
  await hashPassword('benchmarking_test_pass_2026', '0123456789abcdef0123456789abcdef', PBKDF2_ITERATIONS);
  const endTime = performance.now();
  return {
    durationMs: Math.round(endTime - startTime),
    iterations: PBKDF2_ITERATIONS
  };
}

/**
 * Derives an AES-GCM 256-bit key from a passphrase and salt using PBKDF2
 */
async function deriveAesKey(passphrase: string, saltHex: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: hexToBuffer(saltHex),
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH_ALGO
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a string (e.g., Vault password/PIN) using AES-GCM 256 with PBKDF2-derived key
 */
export async function encryptVaultSecret(
  plaintext: string, 
  masterPassphrase: string = 'FFCSI_VAULT_MASTER_KEY_2026'
): Promise<{ ciphertext: string; iv: string; salt: string }> {
  if (!plaintext) return { ciphertext: '', iv: '', salt: '' };

  const saltHex = generateSalt(16);
  const ivArray = new Uint8Array(12); // 96-bit IV for AES-GCM
  window.crypto.getRandomValues(ivArray);

  const key = await deriveAesKey(masterPassphrase, saltHex);
  const encoder = new TextEncoder();
  
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivArray },
    key,
    encoder.encode(plaintext)
  );

  return {
    ciphertext: bufferToHex(encryptedBuffer),
    iv: bufferToHex(ivArray.buffer),
    salt: saltHex
  };
}

/**
 * Decrypts a vault secret using AES-GCM 256 with PBKDF2-derived key
 */
export async function decryptVaultSecret(
  ciphertextHex: string, 
  ivHex: string, 
  saltHex: string,
  masterPassphrase: string = 'FFCSI_VAULT_MASTER_KEY_2026'
): Promise<string> {
  if (!ciphertextHex || !ivHex || !saltHex) return '';

  try {
    const key = await deriveAesKey(masterPassphrase, saltHex);
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: hexToBuffer(ivHex) },
      key,
      hexToBuffer(ciphertextHex)
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    console.error('Vault secret decryption error:', err);
    return '*** [Decryption Failed] ***';
  }
}
