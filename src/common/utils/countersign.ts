// src/utils/countersign.ts
import * as crypto from 'crypto';

/**
 * 大小写无关拿 Header
 */
export function header(
  reqHeaders: Record<string, any>,
  name: string,
): string | undefined {
  if (!reqHeaders) return undefined;
  const keys = Object.keys(reqHeaders);
  const k = keys.find((k) => k.toLowerCase() === name.toLowerCase());
  const v = k ? reqHeaders[k] : undefined;
  return Array.isArray(v) ? v[0] : v;
}

/**
 * 规范化路径：去掉多余的斜杠，保留前导 /
 */
export function normalizePath(path: string): string {
  if (!path) return '/';
  let p = path.split('?')[0].trim();
  if (!p.startsWith('/')) p = '/' + p;
  // 压缩多余斜杠
  p = p.replace(/\/{2,}/g, '/');
  // 不去除尾部斜杠，以避免与 /a 与 /a/ 混淆；若要去除，可以改成：if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

/**
 * 稳定序列化（递归 key 排序；数组位置保持；undefined/null 规范化）
 */
export function stableSerialize(input: any): string {
  if (input === null || typeof input === 'undefined') return '';
  if (typeof input !== 'object') return String(input);

  const sorter = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(sorter);
    if (obj && typeof obj === 'object') {
      const out: any = {};
      Object.keys(obj)
        .sort()
        .forEach((k) => {
          const v = obj[k];
          if (typeof v === 'undefined') return; // 丢弃 undefined
          out[k] = sorter(v);
        });
      return out;
    }
    return obj;
  };

  return JSON.stringify(sorter(input));
}

/**
 * 生成规范化待签名串（v1）
 * m=<METHOD>\npath=<PATH>\nqs=<SORTED_QUERY>\nbody=<SORTED_BODY>\nts=<TS>\nnonce=<NONCE>
 */
export function buildStringToSign(params: {
  method: string;
  path: string;
  query?: any; // 解析后的对象（若没有则 {}）
  body?: any; // 解析后的对象/字符串/Buffer
  timestamp: string | number;
  nonce: string;
  maxBodyBytes?: number; // 默认 8KB
}): string {
  const {
    method,
    path,
    query,
    body,
    timestamp,
    nonce,
    maxBodyBytes = 8 * 1024,
  } = params;
  const normPath = normalizePath(path);
  const m = String(method || 'GET').toUpperCase();
  // let qs = '';
  // if (query && typeof query === 'object') {
  //   qs = stableSerialize(query);
  // }

  // let bodyPart = '';
  // if (typeof body === 'string') {
  //   bodyPart = body.slice(0, maxBodyBytes);
  // } else if (Buffer.isBuffer(body)) {
  //   bodyPart = body.subarray(0, maxBodyBytes).toString('utf8');
  // } else if (typeof body === 'object' && body !== null) {
  //   bodyPart = stableSerialize(body).slice(0, maxBodyBytes);
  // } // 其他类型为空串
  return `m=${m}&path=${normPath}&ts=${timestamp}&nonce=${nonce}`;
}

/**
 * 计算 HMAC
 */
export function hmacSign(
  input: string,
  secret: string,
  alg: 'sha256' | 'sha512' = 'sha256',
  enc: 'hex' | 'base64' = 'hex',
): string {
  const mac = crypto.createHmac(alg, secret).update(input, 'utf8');
  return mac.digest(enc);
}

/**
 * 常量时间比较，避免时序侧信道
 */
export function timingSafeEqual(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}
