// src/security/types.ts
import type { HmacAlg, SigEnc } from './entities/api-credential.entity';

export interface ResolvedSecret {
  appId: string;
  kid?: string | null;
  secret: string; // 原始 HMAC 密钥（已解密/可用）
  alg: HmacAlg; // 'sha256' | 'sha512'
  enc: SigEnc; // 'hex' | 'base64'
}

export interface SecretResolver {
  resolve(params: {
    appId: string;
    kid?: string | null;
    now: Date;
    ip?: string | null;
  }): Promise<ResolvedSecret>;

  touch?(params: {
    appId: string;
    kid?: string | null;
    now: Date;
    ip?: string | null;
  }): Promise<void>;
}
