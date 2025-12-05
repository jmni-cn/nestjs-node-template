// src/security/security.controller.ts
import { Controller, Post, UseGuards, Req, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiCredential } from '@/security/entities/api-credential.entity';
import { JwtAuthGuard } from '@/modules/auth/jwt.guard';
import { randomBytes } from 'crypto';
import { appConfig } from '@/config';
import { ConfigType } from '@nestjs/config';
import { SkipSignature } from '@/common/decorators/skip-signature.decorator';
import { generateNumericUid } from '@/common/utils/uid-generator';

class IssueEphemeralRespDto {
  appId: string;
  kid: string;
  secret: string; // 只返回一次！
  alg: 'sha256' | 'sha512';
  enc: 'hex' | 'base64';
  expiresAt: string; // ISO
}

@ApiTags('security')
@ApiBearerAuth()
@Controller('security')
export class SecurityController {
  constructor(
    @InjectRepository(ApiCredential)
    private readonly credRepo: Repository<ApiCredential>,
    @Inject(appConfig.KEY)
    private readonly appCfg: ConfigType<typeof appConfig>,
  ) {}

  @SkipSignature()
  @UseGuards(JwtAuthGuard)
  @Post('ephemeral-credential')
  @ApiOperation({ summary: '签发短期 HMAC 临时密钥' })
  async issueEphemeral(@Req() req): Promise<IssueEphemeralRespDto> {
    const { uid } = req.user; // 来自 JwtAuthGuard
    const appId = `web:${uid}`;
    const kid = `eph_${generateNumericUid(10)}`;
    const secret = randomBytes(32).toString('hex'); // 32字节

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 60 * 1000);
    const ip = (req.headers['x-forwarded-for'] as string) || (req.ip as string);

    await this.credRepo.save(
      this.credRepo.create({
        app_id: appId,
        kid,
        secret, // 若有 KMS，可存密文
        alg: 'sha256',
        enc: 'hex',
        status: 'active',
        not_before: now,
        expires_at: expiresAt,
        allow_ips: ip ? [ip] : null, // 可选绑定 IP
        description: 'ephemeral web secret',
      }),
    );

    return {
      appId,
      kid,
      secret, // ⚠️ 只返这一次！
      alg: 'sha256',
      enc: 'hex',
      expiresAt: expiresAt.toISOString(),
    };
  }
}
