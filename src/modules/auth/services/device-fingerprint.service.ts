// src/api/auth/services/device-fingerprint.service.ts
/**
 * 设备指纹服务
 * - 生成可靠的设备指纹
 * - 提取设备信息
 * - 计算设备信任评分
 *
 * ✅ 新增服务：提供更可靠的设备识别和管理
 */
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export interface DeviceFingerprint {
  /** 设备指纹ID */
  deviceId: string;
  /** 设备名称 */
  deviceName: string;
  /** 平台类型 */
  platform: 'web' | 'mobile' | 'tablet' | 'desktop' | 'unknown';
  /** 浏览器信息 */
  browser?: string;
  /** 操作系统 */
  os?: string;
  /** 原始User-Agent */
  userAgent: string;
  /** IP地址 */
  ip?: string;
}

export interface DeviceTrustScore {
  /** 信任分数 (0-100) */
  score: number;
  /** 风险等级 */
  level: 'low' | 'medium' | 'high' | 'critical';
  /** 风险因素 */
  factors: string[];
}

@Injectable()
export class DeviceFingerprintService {
  /**
   * 生成设备指纹
   *
   * ✅ 优化：使用多个维度生成更可靠的指纹
   * - User-Agent
   * - Accept-Language
   * - Accept-Encoding
   * - Screen信息（如果有）
   * - 时区信息（如果有）
   */
  generateFingerprint(params: {
    userAgent?: string;
    acceptLanguage?: string;
    acceptEncoding?: string;
    ip?: string;
    screenResolution?: string;
    timezone?: string;
  }): string {
    const components: string[] = [];

    // 添加各个组件
    if (params.userAgent) components.push(`ua:${params.userAgent}`);
    if (params.acceptLanguage) components.push(`lang:${params.acceptLanguage}`);
    if (params.acceptEncoding) components.push(`enc:${params.acceptEncoding}`);
    if (params.screenResolution)
      components.push(`screen:${params.screenResolution}`);
    if (params.timezone) components.push(`tz:${params.timezone}`);

    // 生成哈希
    const fingerprint = components.join('|');
    return crypto
      .createHash('sha256')
      .update(fingerprint)
      .digest('hex')
      .substring(0, 32);
  }

  /**
   * 提取设备信息
   */
  extractDeviceInfo(params: {
    userAgent?: string;
    ip?: string;
    deviceId?: string;
  }): DeviceFingerprint {
    const userAgent = params.userAgent || '';

    return {
      deviceId:
        params.deviceId ||
        this.generateFingerprint({ userAgent, ip: params.ip }),
      deviceName: this.extractDeviceName(userAgent),
      platform: this.extractPlatform(userAgent),
      browser: this.extractBrowser(userAgent),
      os: this.extractOS(userAgent),
      userAgent,
      ip: params.ip,
    };
  }

  /**
   * 提取设备名称
   */
  extractDeviceName(userAgent: string): string {
    if (!userAgent) return 'Unknown Device';

    // 移动设备
    if (userAgent.includes('iPhone')) {
      const match = userAgent.match(/iPhone OS ([\d_]+)/);
      const version = match ? match[1].replace(/_/g, '.') : '';
      return version ? `iPhone (iOS ${version})` : 'iPhone';
    }

    if (userAgent.includes('iPad')) {
      const match = userAgent.match(/CPU OS ([\d_]+)/);
      const version = match ? match[1].replace(/_/g, '.') : '';
      return version ? `iPad (iOS ${version})` : 'iPad';
    }

    if (userAgent.includes('Android')) {
      const match = userAgent.match(/Android ([\d.]+)/);
      const version = match ? match[1] : '';

      // 尝试提取设备型号
      const modelMatch = userAgent.match(/\(([^)]+)\)/);
      const model = modelMatch ? modelMatch[1].split(';').pop()?.trim() : '';

      if (model && model !== 'Android') {
        return version ? `${model} (Android ${version})` : model;
      }
      return version ? `Android ${version}` : 'Android Device';
    }

    // 桌面设备
    if (userAgent.includes('Windows NT')) {
      const match = userAgent.match(/Windows NT ([\d.]+)/);
      const versionMap: Record<string, string> = {
        '10.0': '10/11',
        '6.3': '8.1',
        '6.2': '8',
        '6.1': '7',
      };
      const version = match ? versionMap[match[1]] || match[1] : '';
      return version ? `Windows ${version} PC` : 'Windows PC';
    }

    if (userAgent.includes('Macintosh')) {
      const match = userAgent.match(/Mac OS X ([\d_]+)/);
      const version = match ? match[1].replace(/_/g, '.') : '';
      return version ? `Mac (${version})` : 'Mac';
    }

    if (userAgent.includes('Linux')) {
      return 'Linux PC';
    }

    return 'Unknown Device';
  }

  /**
   * 提取平台类型
   */
  extractPlatform(
    userAgent: string,
  ): 'web' | 'mobile' | 'tablet' | 'desktop' | 'unknown' {
    if (!userAgent) return 'unknown';

    // 移动设备检测
    if (
      userAgent.includes('iPhone') ||
      (userAgent.includes('Android') && userAgent.includes('Mobile'))
    ) {
      return 'mobile';
    }

    // 平板检测
    if (
      userAgent.includes('iPad') ||
      (userAgent.includes('Android') && !userAgent.includes('Mobile'))
    ) {
      return 'tablet';
    }

    // 桌面检测
    if (
      userAgent.includes('Windows') ||
      userAgent.includes('Macintosh') ||
      userAgent.includes('Linux')
    ) {
      return 'desktop';
    }

    return 'web';
  }

  /**
   * 提取浏览器信息
   */
  extractBrowser(userAgent: string): string {
    if (!userAgent) return 'Unknown';

    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      const match = userAgent.match(/Chrome\/([\d.]+)/);
      return match ? `Chrome ${match[1].split('.')[0]}` : 'Chrome';
    }

    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      const match = userAgent.match(/Version\/([\d.]+)/);
      return match ? `Safari ${match[1].split('.')[0]}` : 'Safari';
    }

    if (userAgent.includes('Firefox')) {
      const match = userAgent.match(/Firefox\/([\d.]+)/);
      return match ? `Firefox ${match[1].split('.')[0]}` : 'Firefox';
    }

    if (userAgent.includes('Edg')) {
      const match = userAgent.match(/Edg\/([\d.]+)/);
      return match ? `Edge ${match[1].split('.')[0]}` : 'Edge';
    }

    return 'Unknown';
  }

  /**
   * 提取操作系统
   */
  extractOS(userAgent: string): string {
    if (!userAgent) return 'Unknown';

    if (userAgent.includes('Windows NT')) {
      const match = userAgent.match(/Windows NT ([\d.]+)/);
      const versionMap: Record<string, string> = {
        '10.0': 'Windows 10/11',
        '6.3': 'Windows 8.1',
        '6.2': 'Windows 8',
        '6.1': 'Windows 7',
      };
      return match ? versionMap[match[1]] || 'Windows' : 'Windows';
    }

    if (userAgent.includes('Mac OS X')) {
      const match = userAgent.match(/Mac OS X ([\d_]+)/);
      const version = match
        ? match[1].replace(/_/g, '.').split('.').slice(0, 2).join('.')
        : '';
      return version ? `macOS ${version}` : 'macOS';
    }

    if (userAgent.includes('Android')) {
      const match = userAgent.match(/Android ([\d.]+)/);
      return match ? `Android ${match[1].split('.')[0]}` : 'Android';
    }

    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      const match = userAgent.match(/(?:iPhone )?OS ([\d_]+)/);
      const version = match ? match[1].split('_').slice(0, 2).join('.') : '';
      return version ? `iOS ${version}` : 'iOS';
    }

    if (userAgent.includes('Linux')) {
      return 'Linux';
    }

    return 'Unknown';
  }

  /**
   * 计算设备信任评分
   *
   * ✅ 新功能：基于多个维度评估设备可信度
   */
  calculateTrustScore(deviceHistory: {
    firstSeenAt: Date;
    lastSeenAt: Date;
    loginCount: number;
    failedLoginCount?: number;
    ipChanges?: number;
    locationChanges?: number;
    isTrusted?: boolean;
  }): DeviceTrustScore {
    let score = 50; // 基础分数
    const factors: string[] = [];

    // 1. 使用时长（最多+25分）
    const daysSinceFirstSeen =
      (Date.now() - deviceHistory.firstSeenAt.getTime()) /
      (1000 * 60 * 60 * 24);

    if (daysSinceFirstSeen > 90) {
      score += 25;
      factors.push('长期使用设备（90天+）');
    } else if (daysSinceFirstSeen > 30) {
      score += 15;
      factors.push('中期使用设备（30-90天）');
    } else if (daysSinceFirstSeen > 7) {
      score += 10;
      factors.push('短期使用设备（7-30天）');
    } else {
      factors.push('新设备（少于7天）');
    }

    // 2. 登录次数（最多+20分）
    if (deviceHistory.loginCount > 100) {
      score += 20;
      factors.push('频繁使用（100次+登录）');
    } else if (deviceHistory.loginCount > 50) {
      score += 15;
      factors.push('常用设备（50-100次登录）');
    } else if (deviceHistory.loginCount > 10) {
      score += 10;
      factors.push('偶尔使用（10-50次登录）');
    } else {
      factors.push('很少使用（少于10次登录）');
    }

    // 3. 失败登录（最多-30分）
    if (deviceHistory.failedLoginCount) {
      if (deviceHistory.failedLoginCount > 10) {
        score -= 30;
        factors.push('多次失败登录（高风险）');
      } else if (deviceHistory.failedLoginCount > 5) {
        score -= 15;
        factors.push('数次失败登录（中风险）');
      } else if (deviceHistory.failedLoginCount > 0) {
        score -= 5;
        factors.push('少量失败登录');
      }
    }

    // 4. IP稳定性（最多-20分）
    if (deviceHistory.ipChanges !== undefined) {
      if (deviceHistory.ipChanges > 10) {
        score -= 20;
        factors.push('IP频繁变化');
      } else if (deviceHistory.ipChanges > 5) {
        score -= 10;
        factors.push('IP偶尔变化');
      } else if (deviceHistory.ipChanges === 0) {
        score += 5;
        factors.push('IP稳定');
      }
    }

    // 5. 地理位置变化（最多-15分）
    if (deviceHistory.locationChanges !== undefined) {
      if (deviceHistory.locationChanges > 5) {
        score -= 15;
        factors.push('地理位置频繁变化');
      } else if (deviceHistory.locationChanges > 2) {
        score -= 8;
        factors.push('地理位置偶尔变化');
      }
    }

    // 6. 手动信任（+20分）
    if (deviceHistory.isTrusted) {
      score += 20;
      factors.push('用户手动信任');
    }

    // 7. 活跃度（最多-10分）
    const daysSinceLastSeen =
      (Date.now() - deviceHistory.lastSeenAt.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceLastSeen > 30) {
      score -= 10;
      factors.push('长时间未使用');
    } else if (daysSinceLastSeen > 7) {
      score -= 5;
      factors.push('近期未使用');
    }

    // 限制在0-100之间
    score = Math.max(0, Math.min(100, score));

    // 确定风险等级
    let level: 'low' | 'medium' | 'high' | 'critical';
    if (score >= 75) {
      level = 'low';
    } else if (score >= 50) {
      level = 'medium';
    } else if (score >= 25) {
      level = 'high';
    } else {
      level = 'critical';
    }

    return {
      score,
      level,
      factors,
    };
  }

  /**
   * 判断是否为可疑设备
   */
  isSuspiciousDevice(trustScore: DeviceTrustScore): boolean {
    return trustScore.level === 'high' || trustScore.level === 'critical';
  }

  /**
   * 判断是否需要额外验证（如MFA）
   */
  requiresAdditionalVerification(trustScore: DeviceTrustScore): boolean {
    return trustScore.score < 50;
  }
}
