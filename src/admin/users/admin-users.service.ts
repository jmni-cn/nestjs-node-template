import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Like, MoreThan, Repository } from 'typeorm';

import { AdminUser } from './entities/admin-user.entity';
import { AdminSession } from './entities/admin-session.entity';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';

import * as bcrypt from 'bcryptjs';
import { AdminRolesService } from '@/admin/roles/roles.service';
import { AdminPermissionsService } from '@/admin/permissions/permissions.service';
import { generateNumericUid } from '@/common/utils/uid-generator';

type ConcurrencyPolicy = 'replace' | 'limit';
const BCRYPT_ROUNDS = 12;

interface ListQuery {
  keyword?: string;
  status?: 'active' | 'inactive' | 'banned';
  page?: number;
  pageSize?: number;
}

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly userRepo: Repository<AdminUser>,
    @InjectRepository(AdminSession)
    private readonly sessionRepo: Repository<AdminSession>,
    private adminRolesService: AdminRolesService,
    private adminPermissionsService: AdminPermissionsService,
  ) {}

  private rethrowUnique(e: any): never {
    const msg = String(e?.message ?? '');
    if (
      e?.code === 'ER_DUP_ENTRY' ||
      msg.includes('duplicate key') ||
      msg.includes('Unique') ||
      msg.includes('UNIQUE')
    ) {
      if (msg.includes('username')) throw new ConflictException('用户名已存在');
      if (msg.includes('email')) throw new ConflictException('邮箱已存在');
      throw new ConflictException('管理员已存在');
    }
    throw e;
  }

  toSafeUser(u: AdminUser) {
    return {
      id: u.id,
      uid: u.uid,
      username: u.username,
      email: u.email,
      nickname: u.nickname,
      status: u.status,
      roles:
        u.roles?.map((r) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          permissions: r.permissions?.map((p) => p.code),
        })) || [],
      last_login_at: u.last_login_at,
      created_at: u.created_at,
      updated_at: u.updated_at,
    };
  }

  async getById(id: number) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['roles', 'roles.permissions'],
    });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  // CREATE
  async create(dto: AdminCreateUserDto) {
    const username = dto.username.trim().toLowerCase();
    const email = dto.email ? dto.email.trim().toLowerCase() : null;

    // 唯一性
    const exists = await this.userRepo.findOne({
      where: [{ username }, ...(email ? [{ email }] : [])],
    });
    if (exists) throw new BadRequestException('用户名或邮箱已存在');

    const hashed = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // 角色（按 roleCodes 全量设置；缺省则空数组）
    let roles = [];
    if (dto.roleCodes?.length) {
      // 用 rolesService 的 findByCode 单个查，避免直接依赖 roleRepo
      const codes = [
        ...new Set(dto.roleCodes.map((c) => c.trim().toLowerCase())),
      ];
      roles = await Promise.all(
        codes.map((c) => this.adminRolesService.findByCode(c)),
      );
    }

    try {
      const user = this.userRepo.create({
        uid: generateNumericUid(10),
        username,
        email,
        nickname: dto.nickname ?? null,
        password: hashed,
        roles,
      });
      return await this.userRepo.save(user);
    } catch (e) {
      this.rethrowUnique(e);
    }
  }

  // LIST
  async findAll(q: ListQuery = {}) {
    const where: any[] = [];

    if (q.keyword) {
      const kw = `%${q.keyword.trim()}%`;
      where.push(
        { username: Like(kw) },
        { email: Like(kw) },
        { nickname: Like(kw) },
      );
    }

    if (!where.length) {
      // 无搜索时单条件
      const [items, total] = await this.userRepo.findAndCount({
        where: q.status ? { status: q.status } : undefined,
        order: { id: 'DESC' },
        relations: ['roles'],
        skip: ((q.page || 1) - 1) * (q.pageSize || 20),
        take: q.pageSize || 20,
      });
      return {
        total,
        items: items.map(this.toSafeUser),
        page: q.page || 1,
        pageSize: q.pageSize || 20,
      };
    }

    // 有搜索时 OR 查询
    const [items, total] = await this.userRepo.findAndCount({
      where: where.map((w) => (q.status ? { ...w, status: q.status } : w)),
      order: { id: 'DESC' },
      relations: ['roles'],
      skip: ((q.page || 1) - 1) * (q.pageSize || 20),
      take: q.pageSize || 20,
    });

    return {
      total,
      items: items.map(this.toSafeUser),
      page: q.page || 1,
      pageSize: q.pageSize || 20,
    };
  }

  // LOGIN 用：按 username/email 登录
  async findForLogin(identifier: { username?: string; email?: string }) {
    const where: any[] = [];
    if (identifier.username)
      where.push({ username: identifier.username.trim().toLowerCase() });
    if (identifier.email)
      where.push({ email: identifier.email.trim().toLowerCase() });
    if (!where.length) throw new BadRequestException('缺少登录标识');
    const user = await this.userRepo.findOne({ where, relations: ['roles'] });
    if (!user) throw new NotFoundException('管理员不存在');
    return user;
  }

  async findByIdWithRolesAndPerms(uid: string) {
    return this.userRepo.findOne({
      where: { uid },
      relations: ['roles', 'roles.permissions'],
    });
  }
  async updateLastLogin(user: AdminUser, ip?: string) {
    await this.userRepo.update(user.id, {
      last_login_at: new Date(),
      last_login_ip: ip ?? null,
    });
  }

  // UPDATE（目标管理员）
  async updateProfile(userId: number, dto: AdminUpdateUserDto) {
    const u = await this.getById(userId);

    // 唯一性：email（如有传）
    if (typeof dto.email !== 'undefined' && dto.email !== u.email) {
      const email = dto.email?.trim().toLowerCase() ?? null;
      if (email) {
        const exists = await this.userRepo.findOne({ where: { email } });
        if (exists && exists.id !== u.id)
          throw new ConflictException('邮箱已存在');
      }
    }

    const patch: Partial<AdminUser> = {};
    if (typeof dto.nickname !== 'undefined')
      patch.nickname = dto.nickname ?? null;
    if (typeof dto.email !== 'undefined')
      patch.email = dto.email ? dto.email.trim().toLowerCase() : null;
    if (typeof dto.status !== 'undefined') patch.status = dto.status;

    try {
      await this.userRepo.update(u.id, patch);
      return this.getById(u.id);
    } catch (e) {
      this.rethrowUnique(e);
    }
  }

  // 自己修改密码（验证旧密码）
  async changePasswordChecked(
    userId: number,
    currentPlain: string,
    newPlain: string,
  ) {
    const u = await this.getById(userId);
    const ok = await bcrypt.compare(currentPlain, u.password);
    if (!ok) throw new UnauthorizedException('当前密码不正确');

    const hashed = await bcrypt.hash(newPlain, BCRYPT_ROUNDS);
    await this.userRepo
      .createQueryBuilder()
      .update(AdminUser)
      .set({
        password: hashed,
        password_version: () => 'password_version + 1',
        password_changed_at: () => 'CURRENT_TIMESTAMP',
      })
      .where('id = :id', { id: userId })
      .execute();
  }

  // 删除/批量删除
  async remove(id: number) {
    const res = await this.userRepo.delete(id);
    if (!res.affected)
      throw new NotFoundException(`管理员(${id}) 不存在或已删除`);
    return { affected: res.affected };
  }

  async batchRemove(ids: number[]) {
    if (!Array.isArray(ids) || ids.length === 0)
      throw new BadRequestException('ids 不能为空');
    const res = await this.userRepo.delete(ids);
    return { affected: res.affected || 0 };
  }

  // 为管理员设置角色（按 codes 全量覆盖）
  async assignRoles(userId: number, roleCodes: string[]) {
    if (!Array.isArray(roleCodes) || roleCodes.length === 0) {
      throw new BadRequestException('roleCodes 不能为空');
    }
    const user = await this.getById(userId);
    const codes = [...new Set(roleCodes.map((c) => c.trim().toLowerCase()))];

    // 逐个查，确保不存在的 code 能抛 404
    const roles = await Promise.all(
      codes.map((c) => this.adminRolesService.findByCode(c)),
    );

    user.roles = roles;
    await this.userRepo.save(user);
    return this.toSafeUser(await this.getById(userId));
  }

  // —— 会话 JTI（与 C 端一致的更严格策略）—— //

  async createSessionJTI(params: {
    userId: string;
    jti: string;
    refreshTokenPlain: string;
    deviceId?: string | null;
    deviceName?: string | null;
    platform?: string;
    userAgent?: string | null;
    ip?: string | null;
    expiresAt: Date;
    policy: ConcurrencyPolicy;
    maxActiveSessions?: number;
  }) {
    const {
      userId,
      jti,
      refreshTokenPlain,
      deviceId,
      deviceName,
      platform,
      userAgent,
      ip,
      expiresAt,
      policy,
      maxActiveSessions = 1,
    } = params;

    if (policy === 'replace' && deviceId) {
      await this.sessionRepo
        .createQueryBuilder()
        .update(AdminSession)
        .set({
          revoked_at: () => 'CURRENT_TIMESTAMP',
          revoked_reason: 'replaced',
        })
        .where('user_id = :userId', { userId })
        .andWhere('device_id = :deviceId', { deviceId })
        .andWhere('revoked_at IS NULL')
        .execute();
    } else if (policy === 'limit') {
      const activeCount = await this.sessionRepo.count({
        where: {
          user_id: userId,
          revoked_at: IsNull(),
          expires_at: MoreThan(new Date()),
        },
      });
      if (activeCount >= maxActiveSessions) {
        const oldest = await this.sessionRepo.find({
          where: {
            user_id: userId,
            revoked_at: IsNull(),
            expires_at: MoreThan(new Date()),
          },
          order: { created_at: 'ASC' },
          take: 1,
        });
        if (oldest[0]) {
          await this.sessionRepo.update(oldest[0].id, {
            revoked_at: new Date(),
            revoked_reason: 'limit_eviction',
          });
        }
      }
    }

    const token_hash = await bcrypt.hash(refreshTokenPlain, 10);
    const session = this.sessionRepo.create({
      user_id: userId,
      jti,
      token_hash,
      device_id: deviceId ?? null,
      device_name: deviceName ?? null,
      platform: platform ?? 'web',
      user_agent: userAgent ?? null,
      ip: ip ?? null,
      expires_at: expiresAt,
    });
    return this.sessionRepo.save(session);
  }

  async findSessionByUserAndJTI(userId: string, jti: string) {
    return this.sessionRepo.findOne({ where: { user_id: userId, jti } });
  }

  async rotateSessionJTI(
    userId: string,
    oldJti: string,
    newJti: string,
    newRefreshTokenPlain: string,
    newExpiresAt: Date,
  ) {
    const old = await this.findSessionByUserAndJTI(userId, oldJti);
    if (!old) return null;

    await this.sessionRepo.update(old.id, {
      revoked_at: new Date(),
      revoked_reason: 'rotated',
    });

    const token_hash = await bcrypt.hash(newRefreshTokenPlain, 10);
    const next = this.sessionRepo.create({
      user_id: userId,
      jti: newJti,
      token_hash,
      device_id: old.device_id,
      device_name: old.device_name,
      platform: old.platform,
      user_agent: old.user_agent,
      ip: old.ip,
      expires_at: newExpiresAt,
    });
    return this.sessionRepo.save(next);
  }

  async revokeAllSessionsByUser(
    userId: string,
    reason: string = 'reuse_detected',
  ) {
    await this.sessionRepo
      .createQueryBuilder()
      .update(AdminSession)
      .set({ revoked_at: () => 'CURRENT_TIMESTAMP', revoked_reason: reason })
      .where('user_id = :userId', { userId })
      .andWhere('revoked_at IS NULL')
      .execute();
  }

  // —— 可选：下发权限集合给前端（方便做菜单/按钮鉴权缓存） —— //
  async listRoles() {
    return this.adminRolesService.findAll();
  }
  async listPermissions() {
    return this.adminPermissionsService.findAll();
  }
}
