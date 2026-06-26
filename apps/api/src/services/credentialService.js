import crypto from 'node:crypto';

/**
 * Credential Encryption Service
 * Provides AES-256-GCM encryption/decryption for AI provider credentials.
 * Key is sourced from AI_CREDENTIAL_ENCRYPTION_KEY env var (32-byte hex).
 *
 * Security rules:
 *  - Raw credentials are NEVER returned in API responses.
 *  - Only masked representations (****xxxx) are exposed externally.
 *  - Credential rotation is supported via the ai_provider_credentials table.
 */
export function createCredentialService() {
  const keyHex = process.env.AI_CREDENTIAL_ENCRYPTION_KEY || '';

  // Derive a 32-byte key from env; fall back to a deterministic dev key
  // (dev key is NOT secure — production MUST set AI_CREDENTIAL_ENCRYPTION_KEY)
  let encryptionKey;
  if (keyHex && keyHex.length >= 64) {
    encryptionKey = Buffer.from(keyHex.slice(0, 64), 'hex');
  } else {
    // Dev fallback: sha256('sunave-dev-credential-key')
    encryptionKey = crypto
      .createHash('sha256')
      .update('sunave-dev-credential-key')
      .digest();
  }

  return {
    /**
     * Encrypt plaintext credential.
     * Returns a JSON string: { iv, tag, ciphertext } — all base64-encoded.
     * @param {string} plaintext
     * @returns {string} encrypted JSON string for DB storage
     */
    encrypt(plaintext) {
      if (!plaintext) return null;
      const iv = crypto.randomBytes(12); // 96-bit IV for GCM
      const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
      const ciphertext = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
      ]);
      const tag = cipher.getAuthTag(); // 128-bit auth tag
      return JSON.stringify({
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        ciphertext: ciphertext.toString('base64')
      });
    },

    /**
     * Decrypt a previously encrypted credential string.
     * @param {string} stored — JSON string from DB
     * @returns {string|null} decrypted plaintext, or null on failure
     */
    decrypt(stored) {
      if (!stored) return null;
      try {
        const { iv, tag, ciphertext } = JSON.parse(stored);
        const decipher = crypto.createDecipheriv(
          'aes-256-gcm',
          encryptionKey,
          Buffer.from(iv, 'base64')
        );
        decipher.setAuthTag(Buffer.from(tag, 'base64'));
        return Buffer.concat([
          decipher.update(Buffer.from(ciphertext, 'base64')),
          decipher.final()
        ]).toString('utf8');
      } catch {
        return null; // Invalid encrypted payload
      }
    },

    /**
     * Returns a masked version of a credential for API responses.
     * Shows only the last 4 characters: "****xxxx"
     * @param {string} stored — encrypted JSON string from DB
     * @returns {string} masked string, safe for API response
     */
    mask(stored) {
      if (!stored) return null;
      const plaintext = this.decrypt(stored);
      if (!plaintext) return '****';
      if (plaintext.length <= 4) return '****';
      return '****' + plaintext.slice(-4);
    },

    /**
     * Returns a safe representation of a credential for API responses.
     * Never exposes the raw key.
     * @param {string} stored — encrypted JSON string from DB
     * @returns {{ masked: string, hasValue: boolean }}
     */
    toApiSafe(stored) {
      return {
        hasValue: !!stored,
        masked: this.mask(stored)
      };
    }
  };
}
