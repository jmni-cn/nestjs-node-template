// src/security/secret-crypto.util.ts

// 本地密钥包装（AES-256-GCM）
import * as crypto from 'crypto';

const PREFIX = 'enc:v1';

export function encryptSecret(plain: string, kek: string): string {
  const key = crypto.createHash('sha256').update(kek).digest(); // 32 bytes
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}:${iv.toString('hex')}:${tag.toString('hex')}:${ciphertext.toString('hex')}`;
}

export function decryptSecret(stored: string, kek: string): string {
  if (!stored.startsWith(`${PREFIX}:`)) return stored; // 明文兼容
  const [, ivHex, tagHex, dataHex] = stored.split(':');
  const key = crypto.createHash('sha256').update(kek).digest();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(data), decipher.final()]);
  return plain.toString('utf8');
}
