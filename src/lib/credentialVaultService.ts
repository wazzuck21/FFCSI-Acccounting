/**
 * FFCSI AFMS - Confidential Core Credentials Vault Service
 * 
 * Provides an authoritative, secure abstraction layer for confidential client credentials.
 * Current Development Configuration: VAULT_REQUIRE_UNLOCK = false (Unlocked by default).
 * Architecture is fully preserved so switching VAULT_REQUIRE_UNLOCK = true restores lock-gate enforcement.
 */

import { CoreCredential } from '../types';
import { encryptVaultSecret, decryptVaultSecret, verifyPassword } from './cryptoUtils';

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

  public async encryptSecret(plaintext: string): Promise<{ ciphertext: string; iv: string; salt: string }> {
    return await encryptVaultSecret(plaintext);
  }

  public async decryptSecret(ciphertext: string, iv: string, salt: string): Promise<string> {
    return await decryptVaultSecret(ciphertext, iv, salt);
  }

  public sanitizeCredential(cred: CoreCredential): CoreCredential {
    return {
      ...cred,
      password: '••••••••' // Always hide sensitive plaintext by default in memory/state
    };
  }
}

export const credentialVault = new CredentialVaultService();
