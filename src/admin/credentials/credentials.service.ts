// src/admin/credentials/credentials.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ApiCredential } from '@/security/entities/api-credential.entity';
import { encryptSecret } from '@/security/secret-crypto.util';
import { ConfigType } from '@nestjs/config';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';
import { RotateCredentialDto } from './dto/rotate-credential.dto';
import { RevokeCredentialDto } from './dto/revoke-credential.dto';
import { appConfig } from '@/config';

@Injectable()
export class AdminCredentialsService {
  constructor(
    @InjectRepository(ApiCredential)
    private readonly repo: Repository<ApiCredential>,
    @Inject(appConfig.KEY)
    private readonly appCfg: ConfigType<typeof appConfig>,
  ) {}

  async create(dto: CreateCredentialDto) {
    const exists = await this.repo.exist({
      where: { app_id: dto.appId, kid: dto.kid },
    });
    if (exists) throw new ConflictException('appId+kid 已存在');

    const kek = this.appCfg.app_sig_enc_key ?? '';
    const row = this.repo.create({
      app_id: dto.appId,
      kid: dto.kid,
      secret: encryptSecret(dto.secret, kek),
      alg: dto.alg,
      enc: dto.enc,
      not_before: dto.notBefore ? new Date(dto.notBefore) : null,
      expires_at: dto.expiresAt ? new Date(dto.expiresAt) : null,
      allow_ips: dto.allowIps ?? null,
      status: 'active',
    });
    return this.repo.save(row);
  }

  async list(appId?: string) {
    const where: FindOptionsWhere<ApiCredential> | {} = appId
      ? { app_id: appId }
      : {};
    return this.repo.find({ where, order: { created_at: 'DESC' } });
  }

  async get(appId: string, kid: string) {
    const row = await this.repo.findOne({ where: { app_id: appId, kid } });
    if (!row) throw new NotFoundException('凭据不存在');
    return row;
  }

  async update(appId: string, kid: string, patch: UpdateCredentialDto) {
    const row = await this.get(appId, kid);
    if (typeof patch.status !== 'undefined') row.status = patch.status;
    if (typeof patch.notBefore !== 'undefined')
      row.not_before = patch.notBefore ? new Date(patch.notBefore) : null;
    if (typeof patch.expiresAt !== 'undefined')
      row.expires_at = patch.expiresAt ? new Date(patch.expiresAt) : null;
    if (typeof patch.allowIps !== 'undefined')
      row.allow_ips = patch.allowIps ?? null;
    if (typeof patch.description !== 'undefined')
      row.description = patch.description ?? null;
    return this.repo.save(row);
  }

  async revoke(dto: RevokeCredentialDto) {
    const row = await this.get(dto.appId, dto.kid);
    row.status = 'revoked';
    row.description = dto.reason ?? row.description;
    return this.repo.save(row);
  }

  /** 轮换：新增 newKid 的 active，旧的置为 revoked（可配置） */
  async rotate(dto: RotateCredentialDto) {
    // 新建
    await this.create({
      appId: dto.appId,
      kid: dto.newKid,
      secret: dto.newSecret,
      alg: 'sha256',
      enc: 'hex',
    });

    if (dto.revokeOld) {
      // 若明确给 oldKid，就用它；否则尝试把除 newKid 外的 active/inactive 旧记录全部标记
      const q = this.repo
        .createQueryBuilder()
        .update(ApiCredential)
        .set({ status: 'revoked' })
        .where('app_id = :appId', { appId: dto.appId })
        .andWhere('kid != :newKid', { newKid: dto.newKid })
        .andWhere('status IN (:...sts)', { sts: ['active', 'inactive'] });

      if (dto.oldKid) q.andWhere('kid = :oldKid', { oldKid: dto.oldKid });

      await q.execute();
    }
    return { success: true };
  }
}
