// src/api/auth/oauth/types.ts
export type NormalizedProfile = {
  provider: string;
  subject?: string; // 优先由 provider 端给出
  openid?: string | null; // 微信/QQ等
  unionid?: string | null; // 微信
  app_id?: string | null; // 微信应用ID
  tenant_id?: string | null; // 微软/企业微信等可用
  email?: string | null;
  email_verified?: boolean;
  name?: string | null;
  avatar_url?: string | null;
  raw?: any; // 原始 payload（去除 access_token 等敏感信息）
};

export interface ProviderPlugin {
  name: string;
  getAuthUrl(params: {
    state: string;
    redirectUri: string;
    codeVerifier?: string;
  }): string;
  exchangeCode(params: {
    code: string;
    redirectUri: string;
    codeVerifier?: string;
  }): Promise<any>;
  normalizeProfile(tokens: any): Promise<NormalizedProfile>;
}
