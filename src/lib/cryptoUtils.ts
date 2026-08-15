/**
 * FFCSI AFMS - Cryptographic Security & Vault Utilities
 * 
 * Provides:
 * 1. Password Hashing & Verification (PBKDF2 with SHA-256 and unique salt)
 * 2. AES-GCM 256-bit Encryption / Decryption for Vault Data (Credentials, Passwords, PINs)
 * 3. Secure Random Salt & Token Generation
 */

/**
 * Converts ArrayBuffer to Hex String
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
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
 * Hashes a plaintext password using PBKDF2 with SHA-256
 */
export async function hashPassword(
  password: string, 
  existingSalt?: string
): Promise<{ hash: string; salt: string }> {
  const salt = existingSalt || generateSalt(16);
  const encoder = new TextEncoder();
  
  // Import raw password string into CryptoKey
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  const hash = bufferToHex(derivedBits);
  return { hash, salt };
}

/**
 * Synchronous / Fast SHA-256 fallback hash for static seed comparison if needed
 */
export async function hashSha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
}

/**
 * Verifies a plaintext password against a stored hash and salt
 */
export async function verifyPassword(
  passwordInput: string, 
  storedHash: string, 
  salt: string
): Promise<boolean> {
  if (!passwordInput || !storedHash || !salt) return false;
  
  try {
    const { hash } = await hashPassword(passwordInput, salt);
    // Constant-time like string comparison
    if (hash.length !== storedHash.length) return false;
    let result = 0;
    for (let i = 0; i < hash.length; i++) {
      result |= hash.charCodeAt(i) ^ storedHash.charCodeAt(i);
    }
    return result === 0;
  } catch (err) {
    console.error('Password verification error:', err);
    return false;
  }
}

/**
 * Derives an AES-GCM 256-bit key from a passphrase and salt
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
 * Encrypts a string (e.g., Vault password/PIN) using AES-GCM 256
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
 * Decrypts a vault secret using AES-GCM 256
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
