// src/api/auth/email-code.service.ts
import {
  Inject,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import mailConfig from '@/config/mail.config';
import Redis from 'ioredis';
import * as nodemailer from 'nodemailer';
import { REDIS_CLIENT } from '@/common/modules/providers/redis.provider';
import type { EmailScene } from './dto/send-email-code.dto';
import { ExceptionUtil } from '@/common/exceptions/exception.util';
import { LoggerService } from '@/common/logger/logger.service';

@Injectable()
export class EmailCodeService {
  private transporter: nodemailer.Transporter;

  constructor(
    @Inject(mailConfig.KEY)
    private readonly mailcfg: ConfigType<typeof mailConfig>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly logger: LoggerService,
  ) {
    /**
     * aliyun调试地址
     * const transporter = nodemailer.createTransport({
          host: 'smtpdm.aliyun.com',
          port: 80,
          secure: false, // 使用非加密连接
          auth: {
              user: '您的发信地址',
              pass: '您的SMTP密码'
          },
          debug: true // 开启调试模式
      });
    */
    /**
     * 本地maddy
     * this.transporter = nodemailer.createTransport({
      host: this.mailcfg.host,
      port: this.mailcfg.port,
      authMethod: 'PLAIN',
      secure: this.mailcfg.secure,
      auth: { user: this.mailcfg.user, pass: this.mailcfg.pass },
      logger: true,
    });
     */

    this.transporter = nodemailer.createTransport({
      host: this.mailcfg.host,
      port: this.mailcfg.port,
      secure: this.mailcfg.secure,
      auth: { user: this.mailcfg.user, pass: this.mailcfg.pass },
      debug: true,
    });

    this.transporter.verify((err: Error | null) => {
      if (err) {
        this.logger.error('[EmailCodeService] SMTP verify error:', err);
      } else {
        this.logger.log('[EmailCodeService] SMTP connection verified successfully');
      }
    });
  }

  private keyCode(scene: EmailScene, email: string) {
    return `email:code:${scene}:${email.toLowerCase()}`;
  }
  private keyCooldown(scene: EmailScene, email: string) {
    return `email:cooldown:${scene}:${email.toLowerCase()}`;
  }
  private keyIpBucket(ip: string) {
    return `email:ip:${ip}`;
  }

  private genCode(len = 6) {
    // 纯数字易输入，也可换成大小写字母混合 -> 再在模板里强调大小写
    return Array.from({ length: len }, () =>
      Math.floor(Math.random() * 10),
    ).join('');
  }

  /**
   * 发送验证码：含
   * - 单 IP 每小时限额（Redis 计数桶）
   * - 单邮箱冷却（冷却期内禁止再次发送）
   * - 验证码落库（Redis）包含：code、triesLeft、生成时间
   */
  async send(email: string, scene: EmailScene, ip?: string) {
    email = email.trim().toLowerCase();

    // —— IP 频控（可选，防滥用）——
    if (ip) {
      const ipKey = this.keyIpBucket(ip);
      const n = await this.redis.incr(ipKey);
      if (n === 1) await this.redis.expire(ipKey, 60 * 60); // 首次设置 1 小时
      if (n > this.mailcfg.ipHourlyLimit) {
        throw ExceptionUtil.email.rateLimit({
          ip,
          limit: this.mailcfg.ipHourlyLimit,
          attempts: n,
        });
      }
    }

    // —— 冷却 —— //
    const cdKey = this.keyCooldown(scene, email);
    const cdTTL = await this.redis.ttl(cdKey);
    if (cdTTL > 0) {
      throw ExceptionUtil.auth.emailCodeCooldown({
        email,
        scene,
        cooldownSec: cdTTL,
      });
    }

    // —— 生成并存储 —— //
    const code = this.genCode(6);
    const payload = JSON.stringify({
      code,
      triesLeft: this.mailcfg.maxTries,
      createdAt: Date.now(),
      scene,
      email,
    });

    const codeKey = this.keyCode(scene, email);
    await this.redis.set(codeKey, payload, 'EX', this.mailcfg.ttlSec);
    await this.redis.set(cdKey, '1', 'EX', this.mailcfg.cooldownSec);

    // —— 发邮件（带重试机制）—— //
    const subject = this.subjectByScene(scene);
    const html = this.renderHtmlTemplate(code, this.mailcfg.ttlSec);

    try {
      await this.sendEmailWithRetry(email, subject, html);

      this.logger.log('[EmailCodeService] Email sent successfully', {
        email,
        scene,
      });

      return {
        ok: true,
        ttl: this.mailcfg.ttlSec,
        cooldown: this.mailcfg.cooldownSec,
      };
    } catch (error) {
      this.logger.error('[EmailCodeService] Failed to send email after retries', {
        email,
        scene,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw ExceptionUtil.auth.emailCodeSendFailed({
        email,
        scene,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 发送邮件（带重试机制）
   */
  private async sendEmailWithRetry(
    email: string,
    subject: string,
    html: string,
    maxRetries: number = 3,
  ): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.transporter.sendMail({
          from: this.mailcfg.from,
          to: email,
          subject,
          html,
        });
        return; // 成功发送
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          this.logger.warn(
            `[EmailCodeService] Email send failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`,
            { email, error: lastError.message },
          );
          await this.sleep(delay);
        }
      }
    }

    throw lastError ?? new Error('Failed to send email');
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async verify(email: string, code: string, scene: EmailScene) {
    email = email.trim().toLowerCase();
    code = String(code).trim();

    const codeKey = this.keyCode(scene, email);
    const raw = await this.redis.get(codeKey);
    if (!raw) throw new UnauthorizedException('验证码不正确或已过期');

    const obj = JSON.parse(raw) as { code: string; triesLeft: number };
    if (!obj?.code) throw new UnauthorizedException('验证码不正确或已过期');

    if (obj.code !== code) {
      // 错误尝试 -1
      const ttl = await this.redis.ttl(codeKey);
      const next = {
        ...obj,
        triesLeft: Math.max(
          0,
          Number(obj.triesLeft ?? this.mailcfg.maxTries) - 1,
        ),
      };
      if (next.triesLeft <= 0) {
        await this.redis.del(codeKey);
        throw new UnauthorizedException('尝试次数过多，请重新获取验证码');
      }
      await this.redis.set(
        codeKey,
        JSON.stringify(next),
        'EX',
        Math.max(1, ttl),
      );
      throw new UnauthorizedException('验证码不正确');
    }

    // 正确：删除验证码
    await this.redis.del(codeKey);
  }

  private subjectByScene(scene: EmailScene) {
    switch (scene) {
      case 'register':
        return '注册验证码';
      case 'login':
        return '登录验证码';
      case 'reset':
        return '重置密码验证码';
      default:
        return '验证码';
    }
  }

  private renderHtmlTemplate(code: string, ttlSec: number) {
    return `
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333">
        <p>您好！</p>
        <p>您的验证码是：</p>
        <p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p>
        <p>有效期 <b>${Math.floor(ttlSec / 60)}</b> 分钟，请尽快完成验证。</p>
        <p style="color:#999">如果不是您本人操作，请忽略本邮件。</p>
      </div>
    `;
  }
}
