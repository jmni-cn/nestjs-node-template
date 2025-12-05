// src/security/services/db-secret-resolver.service.ts
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull } from 'typeorm';
import { ApiCredential } from '@/security/entities/api-credential.entity';
import { SecretResolver, ResolvedSecret } from '@/security/types';
import { decryptSecret } from './secret-crypto.util';
// import { KmsService } from './kms.service';
import { ConfigType } from '@nestjs/config';
import { appConfig } from '@/config';

@Injectable()
export class DbSecretResolverService implements SecretResolver {
  constructor(
    @InjectRepository(ApiCredential)
    private readonly credRepo: Repository<ApiCredential>,
    @Inject(appConfig.KEY)
    private readonly appCfg: ConfigType<typeof appConfig>,
    // private readonly kms: KmsService,
  ) {}

  async resolve(params: {
    appId: string;
    kid?: string | null;
    now: Date;
    ip?: string | null;
  }): Promise<ResolvedSecret> {
    const { appId, kid = null, now, ip } = params;

    const qb = this.credRepo
      .createQueryBuilder('c')
      .addSelect('c.secret') // 因为实体上 select: false
      .where('c.app_id = :appId', { appId })
      .andWhere('c.status = :st', { st: 'active' });

    if (kid) qb.andWhere('c.kid = :kid', { kid });

    // 时间窗：not_before <= now < expires_at（如果有配置）
    // qb.andWhere('(c.not_before IS NULL OR c.not_before <= :now)', { now })
    qb.andWhere('(c.expires_at IS NULL OR c.expires_at > :now)', { now });

    const cred = await qb.getOne();
    if (!cred) {
      throw new UnauthorizedException('Invalid credential or not active');
    }

    // 3) IP 白名单可选：按 IP 白名单
    if (cred.allow_ips && cred.allow_ips.length > 0 && ip) {
      const allowed = cred.allow_ips.some((cidrOrIp) =>
        ip.startsWith(cidrOrIp),
      );
      if (!allowed) throw new UnauthorizedException('IP not allowed');
    }

    // 4) 解密密钥（enc:v1:... / kms:v1:... / 明文）
    const kek = this.appCfg.app_sig_enc_key;
    const secret = decryptSecret(cred.secret, kek); // 明文或密文都支持
    // if (secret.startsWith('kms:v1:')) {
    //   secret = await this.kms.decrypt(secret);
    // }

    return {
      appId,
      kid: cred.kid,
      secret,
      alg: cred.alg,
      enc: cred.enc,
    };
  }

  async touch(params: {
    appId: string;
    kid?: string | null;
    now: Date;
    ip?: string | null;
  }) {
    const { appId, kid = null, now, ip } = params;
    const where: any = { app_id: appId, status: 'active' };
    if (kid) where.kid = kid;

    await this.credRepo
      .createQueryBuilder()
      .update(ApiCredential)
      .set({ last_used_at: now, last_used_ip: ip ?? null })
      .where(where)
      .execute();
  }
}
