// src/api/auth/services/password-policy.service.ts
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@/common/logger/logger.service';

export interface PasswordPolicy {
  /** 最小长度 */
  minLength: number;
  /** 最大长度 */
  maxLength: number;
  /** 需要大写字母 */
  requireUppercase: boolean;
  /** 需要小写字母 */
  requireLowercase: boolean;
  /** 需要数字 */
  requireNumbers: boolean;
  /** 需要特殊字符 */
  requireSpecialChars: boolean;
  /** 禁止的密码列表 */
  forbiddenPasswords: string[];
  /** 密码历史记录数量 */
  passwordHistoryCount: number;
  /** 密码过期天数 */
  passwordExpirationDays?: number;
}

export interface PasswordStrength {
  /** 强度分数 (0-100) */
  score: number;
  /** 强度等级 */
  level: 'weak' | 'fair' | 'good' | 'strong';
  /** 建议 */
  suggestions: string[];
  /** 是否通过策略检查 */
  passed: boolean;
}

export interface PasswordValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误信息 */
  errors: string[];
  /** 强度信息 */
  strength: PasswordStrength;
}

@Injectable()
export class PasswordPolicyService {
  private readonly defaultPolicy: PasswordPolicy = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    forbiddenPasswords: [
      'password',
      '123456',
      '123456789',
      'qwerty',
      'abc123',
      'password123',
      'admin',
      'letmein',
      'welcome',
      'monkey',
      '1234567890',
      'password1',
      'qwerty123',
      'dragon',
      'master',
      'hello',
      'freedom',
      'whatever',
      'qazwsx',
      'trustno1',
    ],
    passwordHistoryCount: 5,
    passwordExpirationDays: 90,
  };

  constructor(private readonly logger: LoggerService) {}

  /**
   * 验证密码
   */
  validatePassword(
    password: string,
    policy: Partial<PasswordPolicy> = {},
  ): PasswordValidationResult {
    const mergedPolicy = { ...this.defaultPolicy, ...policy };
    const errors: string[] = [];
    const strength = this.calculatePasswordStrength(password, mergedPolicy);

    // 长度检查
    if (password.length < mergedPolicy.minLength) {
      errors.push(`密码长度至少需要 ${mergedPolicy.minLength} 个字符`);
    }

    if (password.length > mergedPolicy.maxLength) {
      errors.push(`密码长度不能超过 ${mergedPolicy.maxLength} 个字符`);
    }

    // 字符类型检查
    if (mergedPolicy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('密码必须包含至少一个大写字母');
    }

    if (mergedPolicy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('密码必须包含至少一个小写字母');
    }

    if (mergedPolicy.requireNumbers && !/[0-9]/.test(password)) {
      errors.push('密码必须包含至少一个数字');
    }

    if (
      mergedPolicy.requireSpecialChars &&
      !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    ) {
      errors.push('密码必须包含至少一个特殊字符');
    }

    // 禁止密码检查
    if (mergedPolicy.forbiddenPasswords.includes(password.toLowerCase())) {
      errors.push('密码过于简单，请选择更复杂的密码');
    }

    // 常见模式检查
    if (this.hasCommonPatterns(password)) {
      errors.push('密码包含常见模式，请选择更复杂的密码');
    }

    return {
      valid: errors.length === 0,
      errors,
      strength,
    };
  }

  /**
   * 计算密码强度
   */
  calculatePasswordStrength(
    password: string,
    policy: PasswordPolicy = this.defaultPolicy,
  ): PasswordStrength {
    let score = 0;
    const suggestions: string[] = [];

    // 长度评分
    if (password.length >= policy.minLength) {
      score += 20;
    } else {
      suggestions.push(`增加密码长度到至少 ${policy.minLength} 个字符`);
    }

    if (password.length >= 12) {
      score += 10;
    }

    if (password.length >= 16) {
      score += 10;
    }

    // 字符类型评分
    if (/[a-z]/.test(password)) {
      score += 10;
    } else {
      suggestions.push('添加小写字母');
    }

    if (/[A-Z]/.test(password)) {
      score += 10;
    } else {
      suggestions.push('添加大写字母');
    }

    if (/[0-9]/.test(password)) {
      score += 10;
    } else {
      suggestions.push('添加数字');
    }

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      score += 15;
    } else {
      suggestions.push('添加特殊字符');
    }

    // 复杂度评分
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= password.length * 0.6) {
      score += 15;
    } else {
      suggestions.push('使用更多不同的字符');
    }

    // 避免常见模式
    if (!this.hasCommonPatterns(password)) {
      score += 10;
    } else {
      suggestions.push('避免使用常见模式（如123、abc等）');
    }

    // 确定强度等级
    let level: PasswordStrength['level'];
    if (score < 30) {
      level = 'weak';
    } else if (score < 50) {
      level = 'fair';
    } else if (score < 80) {
      level = 'good';
    } else {
      level = 'strong';
    }

    return {
      score: Math.min(score, 100),
      level,
      suggestions,
      passed: score >= 50,
    };
  }

  /**
   * 生成安全密码
   */
  generateSecurePassword(length: number = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let password = '';
    const allChars = lowercase + uppercase + numbers + specialChars;

    // 确保至少包含每种类型的字符
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += specialChars[Math.floor(Math.random() * specialChars.length)];

    // 填充剩余长度
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // 打乱字符顺序
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  /**
   * 检查密码历史
   */
  async checkPasswordHistory(
    userId: number,
    newPassword: string,
    passwordHistory: string[],
    policy: PasswordPolicy = this.defaultPolicy,
  ): Promise<boolean> {
    try {
      // 检查新密码是否与历史密码相同
      for (const oldPassword of passwordHistory) {
        if (oldPassword === newPassword) {
          return false;
        }
      }

      // 检查是否与历史密码过于相似
      for (const oldPassword of passwordHistory) {
        if (this.calculateSimilarity(newPassword, oldPassword) > 0.8) {
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to check password history', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      return false;
    }
  }

  /**
   * 检查密码是否过期
   */
  isPasswordExpired(
    passwordChangedAt: Date,
    policy: PasswordPolicy = this.defaultPolicy,
  ): boolean {
    if (!policy.passwordExpirationDays) {
      return false;
    }

    const expirationDate = new Date(passwordChangedAt);
    expirationDate.setDate(
      expirationDate.getDate() + policy.passwordExpirationDays,
    );

    return new Date() > expirationDate;
  }

  /**
   * 获取密码过期提醒
   */
  getPasswordExpirationWarning(
    passwordChangedAt: Date,
    policy: PasswordPolicy = this.defaultPolicy,
  ): {
    expired: boolean;
    daysUntilExpiration: number;
    warningLevel: 'none' | 'warning' | 'critical';
  } {
    if (!policy.passwordExpirationDays) {
      return {
        expired: false,
        daysUntilExpiration: 0,
        warningLevel: 'none',
      };
    }

    const expirationDate = new Date(passwordChangedAt);
    expirationDate.setDate(
      expirationDate.getDate() + policy.passwordExpirationDays,
    );

    const now = new Date();
    const daysUntilExpiration = Math.ceil(
      (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    let warningLevel: 'none' | 'warning' | 'critical' = 'none';
    if (daysUntilExpiration <= 0) {
      warningLevel = 'critical';
    } else if (daysUntilExpiration <= 7) {
      warningLevel = 'critical';
    } else if (daysUntilExpiration <= 30) {
      warningLevel = 'warning';
    }

    return {
      expired: daysUntilExpiration <= 0,
      daysUntilExpiration,
      warningLevel,
    };
  }

  /**
   * 检查常见模式
   */
  private hasCommonPatterns(password: string): boolean {
    const commonPatterns = [
      /123/,
      /abc/,
      /qwe/,
      /asd/,
      /zxc/,
      /password/i,
      /admin/i,
      /user/i,
      /login/i,
      /welcome/i,
    ];

    return commonPatterns.some((pattern) => pattern.test(password));
  }

  /**
   * 计算字符串相似度
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * 计算编辑距离
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * 获取默认密码策略
   */
  getDefaultPolicy(): PasswordPolicy {
    return { ...this.defaultPolicy };
  }

  /**
   * 计算密码熵（信息熵）
   * 熵越高，密码越安全
   */
  calculatePasswordEntropy(password: string): number {
    // 计算字符集大小
    let charsetSize = 0;

    if (/[a-z]/.test(password)) charsetSize += 26; // 小写字母
    if (/[A-Z]/.test(password)) charsetSize += 26; // 大写字母
    if (/[0-9]/.test(password)) charsetSize += 10; // 数字
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
      charsetSize += 32; // 特殊字符

    // 熵 = log2(字符集大小^密码长度)
    return Math.log2(Math.pow(charsetSize, password.length));
  }

  /**
   * 检查密码是否有连续字符
   */
  hasConsecutiveCharacters(
    password: string,
    maxConsecutive: number = 3,
  ): boolean {
    for (let i = 0; i <= password.length - maxConsecutive; i++) {
      const substr = password.substring(i, i + maxConsecutive);

      // 检查连续递增（abc, 123）
      let isIncreasing = true;
      for (let j = 1; j < substr.length; j++) {
        if (substr.charCodeAt(j) !== substr.charCodeAt(j - 1) + 1) {
          isIncreasing = false;
          break;
        }
      }

      // 检查连续递减（cba, 321）
      let isDecreasing = true;
      for (let j = 1; j < substr.length; j++) {
        if (substr.charCodeAt(j) !== substr.charCodeAt(j - 1) - 1) {
          isDecreasing = false;
          break;
        }
      }

      if (isIncreasing || isDecreasing) {
        return true;
      }
    }

    return false;
  }

  /**
   * 检查密码是否有重复字符
   */
  hasRepeatingCharacters(password: string, maxRepeating: number = 3): boolean {
    let count = 1;
    for (let i = 1; i < password.length; i++) {
      if (password[i] === password[i - 1]) {
        count++;
        if (count >= maxRepeating) {
          return true;
        }
      } else {
        count = 1;
      }
    }
    return false;
  }

  /**
   * 检查密码是否包含用户信息
   * （如用户名、邮箱等）
   */
  containsUserInfo(
    password: string,
    userInfo: { username?: string; email?: string; name?: string },
  ): boolean {
    const lowerPassword = password.toLowerCase();

    if (
      userInfo.username &&
      lowerPassword.includes(userInfo.username.toLowerCase())
    ) {
      return true;
    }

    if (userInfo.email) {
      const emailName = userInfo.email.split('@')[0];
      if (lowerPassword.includes(emailName.toLowerCase())) {
        return true;
      }
    }

    if (userInfo.name && lowerPassword.includes(userInfo.name.toLowerCase())) {
      return true;
    }

    return false;
  }

  /**
   * 生成密码强度报告
   */
  generateStrengthReport(password: string): {
    entropy: number;
    strength: PasswordStrength;
    hasConsecutive: boolean;
    hasRepeating: boolean;
    estimatedCrackTime: string;
  } {
    const entropy = this.calculatePasswordEntropy(password);
    const strength = this.calculatePasswordStrength(password);
    const hasConsecutive = this.hasConsecutiveCharacters(password);
    const hasRepeating = this.hasRepeatingCharacters(password);

    // 估算破解时间（基于熵）
    const estimatedCrackTime = this.estimateCrackTime(entropy);

    return {
      entropy,
      strength,
      hasConsecutive,
      hasRepeating,
      estimatedCrackTime,
    };
  }

  /**
   * 估算破解时间
   * 假设每秒可以尝试10亿次（现代GPU）
   */
  private estimateCrackTime(entropy: number): string {
    const attemptsPerSecond = 1e9; // 10亿次/秒
    const combinations = Math.pow(2, entropy);
    const seconds = combinations / (2 * attemptsPerSecond); // 平均需要一半尝试

    if (seconds < 60) {
      return '少于1分钟';
    } else if (seconds < 3600) {
      return `约${Math.ceil(seconds / 60)}分钟`;
    } else if (seconds < 86400) {
      return `约${Math.ceil(seconds / 3600)}小时`;
    } else if (seconds < 2592000) {
      return `约${Math.ceil(seconds / 86400)}天`;
    } else if (seconds < 31536000) {
      return `约${Math.ceil(seconds / 2592000)}个月`;
    } else if (seconds < 3153600000) {
      return `约${Math.ceil(seconds / 31536000)}年`;
    } else {
      return '数百万年';
    }
  }

  /**
   * 验证密码（增强版）
   */
  validatePasswordEnhanced(
    password: string,
    userInfo?: { username?: string; email?: string; name?: string },
    policy: Partial<PasswordPolicy> = {},
  ): PasswordValidationResult {
    const basicValidation = this.validatePassword(password, policy);
    const errors = [...basicValidation.errors];

    // 额外检查
    if (this.hasConsecutiveCharacters(password)) {
      errors.push('密码不能包含连续字符（如abc、123）');
    }

    if (this.hasRepeatingCharacters(password)) {
      errors.push('密码不能包含重复字符（如aaa、111）');
    }

    if (userInfo && this.containsUserInfo(password, userInfo)) {
      errors.push('密码不能包含用户信息（如用户名、邮箱等）');
    }

    const entropy = this.calculatePasswordEntropy(password);
    if (entropy < 30) {
      errors.push('密码强度太低，请使用更复杂的密码');
    }

    return {
      valid: errors.length === 0,
      errors,
      strength: basicValidation.strength,
    };
  }
}
