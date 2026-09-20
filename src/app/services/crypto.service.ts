import { Injectable } from '@angular/core';
import forge from 'node-forge';
import SHA256 from 'crypto-js/sha256';
import { SignJWT, jwtVerify } from 'jose';

// Mock secret only — this app is a local SSO testing tool, never production.
const JWT_SECRET = new TextEncoder().encode('your-super-secret-jwt-key-here');
const SERVER_API_KEY = 'your-backend-api-key';

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface HandshakeResult {
  success: boolean;
  token?: string;
  encryptedPayload?: string;
  sessionId?: string;
  requestDateTime?: string;
  message: string;
  error?: string;
}

export interface DecryptResult {
  success: boolean;
  payload?: any;
  hashValid?: boolean;
  message?: string;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class CryptoService {
  /** Mirrors the original /cx SSO payload format: comma-joined fields, RSA-OAEP-SHA256, base64. */
  async encryptSsoPayload(
    payloadObj: { userId: string; username: string },
    publicKeyPem: string,
  ): Promise<string> {
    const sessionId = Math.random().toString(36).substring(2, 18);
    const now = new Date();
    const requestDateTime = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;

    const hashInput = [payloadObj.userId, payloadObj.username, sessionId, requestDateTime].join(',');
    const hashValue = SHA256(hashInput).toString();

    const payload = [payloadObj.userId, payloadObj.username, sessionId, requestDateTime, hashValue].join(',');

    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
    const encrypted = publicKey.encrypt(payload, 'RSA-OAEP', {
      md: forge.md.sha256.create(),
      mgf1: { md: forge.md.sha256.create() },
    });

    const encryptedBase64 = forge.util.encode64(encrypted);
    if (!encryptedBase64) throw new Error('Encryption failed. Please check your public key.');
    return encryptedBase64;
  }

  /** Mirrors POST /api/generate-keys */
  generateKeyPair(): Promise<KeyPair> {
    return new Promise((resolve, reject) => {
      forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 }, (err, keypair) => {
        if (err) {
          reject(err);
          return;
        }
        const publicKey = forge.pki.publicKeyToPem(keypair.publicKey);
        const rsaPrivateKeyAsn1 = forge.pki.privateKeyToAsn1(keypair.privateKey);
        const privateKeyInfo = forge.pki.wrapRsaPrivateKey(rsaPrivateKeyAsn1);
        const privateKey = forge.pki.privateKeyInfoToPem(privateKeyInfo);
        resolve({ publicKey, privateKey });
      });
    });
  }

  /** Mirrors POST /api/handshake */
  async handshake(userId: string, username: string, publicKeyPem: string): Promise<HandshakeResult> {
    if (!publicKeyPem.includes('-----BEGIN PUBLIC KEY-----') || !publicKeyPem.includes('-----END PUBLIC KEY-----')) {
      return {
        success: false,
        message: 'Invalid public key format. Please ensure it includes proper BEGIN/END headers.',
        error: 'Invalid public key format. Please ensure it includes proper BEGIN/END headers.',
      };
    }

    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const requestDateTime = new Date().toISOString();

      const hashString = `${userId}${username}${sessionId}${requestDateTime}`;
      const hashValue = SHA256(hashString).toString();

      const payload = { userId, userName: username, sessionId, requestDateTime, hashValue };
      const payloadString = JSON.stringify(payload);

      const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
      const encrypted = publicKey.encrypt(payloadString, 'RSA-OAEP', {
        md: forge.md.sha256.create(),
        mgf1: { md: forge.md.sha256.create() },
      });
      const encryptedPayload = forge.util.encode64(encrypted);

      const token = await new SignJWT({
        sub: userId,
        username,
        sessionId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .sign(JWT_SECRET);

      return {
        success: true,
        token,
        encryptedPayload,
        sessionId,
        requestDateTime,
        message: 'Handshake successful - payload encrypted and ready for SCF platform',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /** Mirrors POST /api/decrypt-payload */
  decryptPayload(encryptedPayloadBase64: string, privateKeyPem: string): DecryptResult {
    try {
      const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
      const encryptedBytes = forge.util.decode64(encryptedPayloadBase64);
      const decrypted = privateKey.decrypt(encryptedBytes, 'RSA-OAEP', {
        md: forge.md.sha256.create(),
        mgf1: { md: forge.md.sha256.create() },
      });

      const decryptedPayload = forge.util.decodeUtf8(decrypted);
      const payload = JSON.parse(decryptedPayload);

      const hashString = `${payload.userId}${payload.userName}${payload.sessionId}${payload.requestDateTime}`;
      const expectedHash = SHA256(hashString).toString();
      const hashValid = payload.hashValue === expectedHash;

      return {
        success: true,
        payload,
        hashValid,
        message: hashValid
          ? 'Payload decrypted and hash verified successfully'
          : 'Payload decrypted but hash verification failed',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to decrypt payload',
      };
    }
  }

  /** Mirrors POST /api/verify-token */
  async verifyToken(token: string): Promise<{ valid: boolean; payload?: any }> {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      return { valid: true, payload };
    } catch {
      return { valid: false };
    }
  }

  /** Mirrors POST /api/refresh-session */
  refreshSession(userId: string, username: string): { success: boolean; expiresAt: string } {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    return { success: true, expiresAt: expiresAt.toISOString() };
  }

  /** Mirrors POST /api/server-refresh */
  serverRefresh(
    userId: string,
    sessionId: string,
    apiKey: string,
  ): { success: boolean; expiresAt?: string; error?: string } {
    if (apiKey !== SERVER_API_KEY) {
      return { success: false, error: 'Unauthorized' };
    }
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    return { success: true, expiresAt: expiresAt.toISOString() };
  }
}
