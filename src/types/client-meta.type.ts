export interface ClientMeta {
  appVersion?: string; // x-app-version
  fingerprint?: string; // x-client-fingerprint（可能是 bcrypt 字符串或明文指纹）
  fingerprintHash?: string; // x-client-fingerprint-hash（HMAC/sha256 十六进制）
  ts?: number; // x-client-ts（毫秒时间戳）
  deviceId?: string; // x-device-id
  deviceName?: string; // x-device-name
  platform?: string; // x-platform
  requestId: string; // x-requested-id（没有就生成）
  userLang?: string; // x-user-lang
  userTimezone?: string; // x-user-timezone
  ip?: string; // 解析后的客户端 IP
}
