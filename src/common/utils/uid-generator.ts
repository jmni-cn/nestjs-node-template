/**
 * UID 生成器
 * - 生成由大写字母和数字组成的随机ID
 * - 用于 实体的业务短ID
 */
import * as crypto from 'crypto';
/**
 * 生成指定长度的随机UID（由大写字母和数字组成）
 * @param length - UID长度，默认6位
 * @returns 随机UID字符串
 * @example
 * ```typescript
 * const uid = generateUid(); // "A3B8K9"
 * const uid8 = generateUid(8); // "H4J2K9L5"
 * ```
 */
export function generateUid(length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }

  return result;
}

/**
 * 生成指定长度的随机UID（由大小写字母和数字组成）
 * @param length - UID长度，默认6位
 * @returns 随机UID字符串
 * @example
 * ```typescript
 * const uid = generateMixedUid(); // "aB3kL9"
 * const uid8 = generateMixedUid(8); // "H4j2K9l5"
 * ```
 */
export function generateMixedUid(length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }

  return result;
}

/**
 * 生成指定长度的数字UID
 * @param length - 长度，默认8位
 * @returns 数字UID字符串
 * @example
 * ```typescript
 * const uid = generateNumericUid(); // "03458291"
 * const uid10 = generateNumericUid(10); // "4938201745"
 * ```
 */
export function generateNumericUid(length: number = 8): string {
  const n = crypto.randomInt(0, 10 ** length); // 均匀 0..(10^length - 1)
  return n.toString().padStart(length, '0');
}

/**
 * 生成唯一的UID（带重试机制）
 * @param length - UID长度，默认6位
 * @param checkExists - 检查UID是否已存在的函数
 * @param maxRetries - 最大重试次数，默认10次
 * @returns Promise<string> - 唯一的UID
 * @throws Error - 如果达到最大重试次数仍无法生成唯一UID
 * @example
 * ```typescript
 * const uid = await generateUniqueUid(6, async (uid) => {
 *   return await Repo.exists({ where: { uid } });
 * });
 * ```
 */
export async function generateUniqueUid(
  length: number = 6,
  checkExists: (uid: string) => Promise<boolean>,
  maxRetries: number = 10,
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    const uid = generateUid(length);
    const exists = await checkExists(uid);

    if (!exists) {
      return uid;
    }
  }

  throw new Error(
    `Failed to generate unique UID after ${maxRetries} attempts. Consider increasing UID length.`,
  );
}
