/**
 * FFCSI AFMS - Confidential Core Credentials Vault Service
 * 
 * Provides an authoritative, secure abstraction layer for confidential client credentials.
 * Current Development Configuration: VAULT_REQUIRE_UNLOCK = false (Unlocked by default).
 * Architecture is fully preserved so switching VAULT_REQUIRE_UNLOCK = true restores lock-gate enforcement.
 */

import { CoreCredential } from '../types';
import { 
  encryptVaultSecret, 
  decryptVaultSecret, 
  hashPassword, 
  hashSecretPbkdf2,
  verifyPassword,
  generateSalt,
  PBKDF2_ITERATIONS,
  Pbkdf2HashResult
} from './cryptoUtils';

export const VAULT_REQUIRE_UNLOCK = false; // Dev version: unlocked by default

class CredentialVaultService {
  private _isUnlocked: boolean = !VAULT_REQUIRE_UNLOCK;
  private _listeners: Array<(unlocked: boolean) => void> = [];

  constructor() {
    this._isUnlocked = !VAULT_REQUIRE_UNLOCK;
  }

  public isUnlocked(): boolean {
    return this._isUnlocked;
  }

  public isAuthRequired(): boolean {
    return VAULT_REQUIRE_UNLOCK;
  }

  public subscribe(callback: (unlocked: boolean) => void): () => void {
    this._listeners.push(callback);
    return () => {
      this._listeners = this._listeners.filter(cb => cb !== callback);
    };
  }

  private notify(): void {
    this._listeners.forEach(cb => cb(this._isUnlocked));
  }

  public async unlock(passwordInput?: string, userHash?: string, userSalt?: string, fallbackPassword?: string): Promise<boolean> {
    if (!VAULT_REQUIRE_UNLOCK) {
      this._isUnlocked = true;
      this.notify();
      return true;
    }

    if (!passwordInput) return false;

    let isValid = false;
    if (userHash && userSalt) {
      isValid = await verifyPassword(passwordInput, userHash, userSalt);
    } else if (fallbackPassword) {
      isValid = (passwordInput === fallbackPassword);
    }

    if (isValid) {
      this._isUnlocked = true;
      this.notify();
    }
    return isValid;
  }

  public lock(): void {
    this._isUnlocked = false;
    this.notify();
  }

  /**
   * Hashes a credential password or PIN using PBKDF2 with SHA-256 (100,000 iterations)
   */
  public async hashSecretPbkdf2(secret: string, salt?: string): Promise<Pbkdf2HashResult> {
    return await hashSecretPbkdf2(secret, salt);
  }

  /**
   * Verifies a candidate secret against a PBKDF2 hash using constant-time comparison
   */
  public async verifySecretPbkdf2(secret: string, hash: string, salt: string): Promise<boolean> {
    return await verifyPassword(secret, hash, salt);
  }

  /**
   * Encrypts a secret using AES-GCM 256 with PBKDF2 key derivation
   */
  public async encryptSecret(plaintext: string): Promise<{ ciphertext: string; iv: string; salt: string }> {
    return await encryptVaultSecret(plaintext);
  }

  /**
   * Decrypts an AES-GCM 256 ciphertext
   */
  public async decryptSecret(ciphertext: string, iv: string, salt: string): Promise<string> {
    return await decryptVaultSecret(ciphertext, iv, salt);
  }

  /**
   * Creates a fully secured credential security bundle with PBKDF2 hash & AES-GCM payload
   */
  public async secureCredentialData(
    passwordPlaintext: string, 
    pinPlaintext?: string
  ): Promise<{
    passwordPbkdf2Hash: string;
    pinPbkdf2Hash?: string;
    encryptedPassword: string;
    encryptedPin?: string;
    iv: string;
    salt: string;
    isEncrypted: boolean;
    isPbkdf2Hashed: boolean;
    iterations: number;
  }> {
    const salt = generateSalt(16);
    
    // Compute PBKDF2 hashes with 100,000 iterations and unique 128-bit salt
    const passwordHashObj = await hashSecretPbkdf2(passwordPlaintext || '', salt);
    let pinHashObj: Pbkdf2HashResult | undefined = undefined;
    if (pinPlaintext) {
      pinHashObj = await hashSecretPbkdf2(pinPlaintext, salt);
    }

    // Encrypt secrets using PBKDF2-derived AES key
    const encPass = await encryptVaultSecret(passwordPlaintext || '');
    let encPin: { ciphertext: string; iv: string; salt: string } | undefined = undefined;
    if (pinPlaintext) {
      encPin = await encryptVaultSecret(pinPlaintext);
    }

    return {
      passwordPbkdf2Hash: passwordHashObj.hash,
      pinPbkdf2Hash: pinHashObj?.hash,
      encryptedPassword: encPass.ciphertext,
      encryptedPin: encPin?.ciphertext,
      iv: encPass.iv,
      salt: encPass.salt || salt,
      isEncrypted: true,
      isPbkdf2Hashed: true,
      iterations: PBKDF2_ITERATIONS
    };
  }

  /**
   * Batch upgrades all credentials to ensure PBKDF2 hashing & AES-GCM encryption
   */
  public async batchUpgradeCredentialsToPbkdf2(
    credentials: CoreCredential[]
  ): Promise<{ updatedCredentials: CoreCredential[]; upgradedCount: number }> {
    let upgradedCount = 0;
    const updatedCredentials: CoreCredential[] = [];

    for (const cred of credentials) {
      let plainPass = cred.password || '';
      // If already encrypted, try decrypting first
      if (cred.isEncrypted && cred.encryptedPassword && cred.iv && cred.salt) {
        const decrypted = await decryptVaultSecret(cred.encryptedPassword, cred.iv, cred.salt);
        if (decrypted && !decrypted.includes('Decryption Failed')) {
          plainPass = decrypted;
        }
      }

      // If it has plain text or lacks PBKDF2 hash, compute fresh PBKDF2 hash
      if (!cred.isPbkdf2Hashed || !cred.passwordPbkdf2Hash || (plainPass && plainPass !== '••••••••')) {
        const secured = await this.secureCredentialData(plainPass, cred.pinCode);
        updatedCredentials.push({
          ...cred,
          passwordPbkdf2Hash: secured.passwordPbkdf2Hash,
          pinPbkdf2Hash: secured.pinPbkdf2Hash,
          encryptedPassword: secured.encryptedPassword,
          encryptedPin: secured.encryptedPin,
          iv: secured.iv,
          salt: secured.salt,
          isEncrypted: true,
          isPbkdf2Hashed: true,
          password: '••••••••'
        });
        upgradedCount++;
      } else {
        updatedCredentials.push(cred);
      }
    }

    return { updatedCredentials, upgradedCount };
  }

  public sanitizeCredential(cred: CoreCredential): CoreCredential {
    return {
      ...cred,
      password: '••••••••' // Always hide sensitive plaintext by default in memory/state
    };
  }
}

export const credentialVault = new CredentialVaultService();
