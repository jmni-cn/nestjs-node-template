import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, MoreThan, IsNull, In } from 'typeorm';
import { User } from './entities/user.entity';
import { UserSession } from './entities/user-session.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
/* 收集记录 */
import { QueryCacheService } from '@/admin/common/modules/services/query-cache.service';
/* 收集记录 */
import { SlowQueryMonitorService } from '@/admin/common/modules/services/slow-query-monitor.service';
import { generateNumericUid } from '@/common/utils/uid-generator';

type ConcurrencyPolicy = 'replace' | 'limit';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(UserSession)
    private readonly sessionRepo: Repository<UserSession>,
    private readonly queryCache: QueryCacheService,
    private readonly slowQueryMonitor: SlowQueryMonitorService,
  ) {}

  /** 根据ID查找用户（带缓存） */
  async findById(id: number): Promise<User | null> {
    const result = await this.queryCache.getOrSet(
      'user:by_id',
      { id },
      async () => {
        return this.userRepo.findOne({ where: { id } });
      },
      { ttl: 600 }, // 10分钟缓存
    );

    return result.data;
  }

  /** 根据邮箱查找用户（带缓存） */
  async findByEmail(email: string): Promise<User | null> {
    const result = await this.queryCache.getOrSet(
      'user:by_email',
      { email },
      async () => {
        return this.userRepo.findOne({ where: { email } });
      },
      { ttl: 300 }, // 5分钟缓存
    );

    return result.data;
  }

  /** 根据用户名查找用户（带缓存） */
  async findByUsername(username: string): Promise<User | null> {
    const result = await this.queryCache.getOrSet(
      'user:by_username',
      { username },
      async () => {
        return this.userRepo.findOne({ where: { username } });
      },
      { ttl: 300 }, // 5分钟缓存
    );

    return result.data;
  }

  /** 根据UID查找用户（带缓存） */
  async findByUid(uid: string): Promise<User | null> {
    const result = await this.queryCache.getOrSet(
      'user:by_uid',
      { uid },
      async () => {
        return this.userRepo.findOne({ where: { uid } });
      },
      { ttl: 600 }, // 10分钟缓存
    );

    return result.data;
  }

  /**
   * 批量查询用户（支持缓存）
   * ✅ 新增: 提供批量查询能力，减少数据库往返
   */
  async findByIds(ids: number[]): Promise<Map<number, User>> {
    if (ids.length === 0) return new Map();

    const result = new Map<number, User>();
    const uncachedIds: number[] = [];

    // 1. 尝试从缓存获取
    for (const id of ids) {
      const user = await this.findById(id);
      if (user) {
        result.set(id, user);
      } else {
        uncachedIds.push(id);
      }
    }

    // 2. 批量查询未缓存的用户
    if (uncachedIds.length > 0) {
      const users = await this.userRepo.find({
        where: { id: In(uncachedIds) },
      });

      // 3. 回填缓存和结果
      for (const user of users) {
        result.set(user.id, user);
        // 异步回填缓存，不等待
        this.queryCache
          .set('user:by_id', { id: user.id }, user, { ttl: 600 })
          .catch(() => {
            /* 忽略缓存错误 */
          });
      }
    }

    return result;
  }

  /**
   * 批量查询用户（通过邮箱）
   * ✅ 新增: 批量邮箱查询
   */
  async findByEmails(emails: string[]): Promise<Map<string, User>> {
    if (emails.length === 0) return new Map();

    const normalizedEmails = emails.map((e) => e.trim().toLowerCase());
    const users = await this.userRepo.find({
      where: { email: In(normalizedEmails) },
    });

    const result = new Map<string, User>();
    for (const user of users) {
      if (user.email) {
        result.set(user.email, user);
        // 异步回填缓存
        this.queryCache
          .set('user:by_email', { email: user.email }, user, { ttl: 300 })
          .catch(() => {
            /* 忽略缓存错误 */
          });
      }
    }

    return result;
  }

  /** 输出给前端的精简用户对象 */
  toSafeUser(u: User) {
    return {
      uid: u.uid,
      username: u.username,
      email: u.email,
      phone: u.phone,
      nickname: u.nickname,
      avatar_url: u.avatar_url,
      gender: u.gender,
      birthday: u.birthday,
      country: u.country,
      // locale: u.locale,
      // time_zone: u.time_zone,
      // register_channel: u.register_channel,
      // email_verified: u.email_verified,
      // phone_verified: u.phone_verified,
      // status: u.status,
      // created_at: u.created_at,
      // updated_at: u.updated_at,
      // last_login_at: u.last_login_at,
    };
  }

  /** 失效用户相关缓存 */
  private async invalidateUserCache(user: User): Promise<void> {
    await Promise.all([
      this.queryCache.delete('user:by_id', { id: user.id }),
      user.email &&
        this.queryCache.delete('user:by_email', { email: user.email }),
      user.username &&
        this.queryCache.delete('user:by_username', { username: user.username }),
      this.queryCache.delete('user:by_uid', { uid: user.uid }),
    ]);
  }

  /**
   * 根据ID获取用户（使用缓存优化性能）
   * ✅ 性能优化：使用带缓存的 findById
   */
  async getById(id: number) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async create(dto: CreateUserDto) {
    // 唯一性校验
    const checkExists = async (
      where: FindOptionsWhere<User>,
    ): Promise<boolean> => {
      const count = await this.userRepo.count({ where });
      return count > 0;
    };

    const username = dto.username ? dto.username.trim().toLowerCase() : null;
    const email = dto.email ? dto.email.trim().toLowerCase() : null;
    const phone = dto.phone ? dto.phone.trim() : null;

    if (username) {
      const exists = await checkExists({ username });
      if (exists) throw new BadRequestException('用户名已存在');
    }
    if (email) {
      const exists = await checkExists({ email });
      if (exists) throw new BadRequestException('邮箱已存在');
    }
    if (phone) {
      const exists = await checkExists({ phone });
      if (exists) throw new BadRequestException('手机号已存在');
    }

    const hashed = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = this.userRepo.create({
      uid: generateNumericUid(),
      username,
      email,
      phone,
      nickname: dto.nickname ?? null,
      password: hashed,
      // password_version 走默认 1
    });
    return this.userRepo.save(user);
  }

  async findForLogin(identifier: {
    username?: string;
    email?: string;
    phone?: string;
  }) {
    const where: FindOptionsWhere<User>[] = [];
    if (identifier.username)
      where.push({ username: identifier.username.trim().toLowerCase() });
    if (identifier.email)
      where.push({ email: identifier.email.trim().toLowerCase() });
    if (identifier.phone) where.push({ phone: identifier.phone.trim() });
    if (where.length === 0) throw new BadRequestException('缺少登录标识');
    const user = await this.userRepo.findOne({ where, withDeleted: false });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async verifyPassword(user: User, plain: string) {
    return bcrypt.compare(plain, user.password);
  }

  async updateLastLogin(user: User, ip?: string) {
    await this.userRepo.update(user.id, {
      last_login_at: new Date(),
      last_login_ip: ip ?? null,
    });
  }

  /** 更新个人资料（白名单字段） */
  async updateProfile(userId: number, dto: UpdateUserDto) {
    const user = await this.getById(userId);

    const patch: Partial<User> = {};
    if (typeof dto.nickname !== 'undefined')
      patch.nickname = dto.nickname ?? null;
    if (typeof dto.avatar_url !== 'undefined')
      patch.avatar_url = dto.avatar_url ?? null;
    if (typeof dto.gender !== 'undefined')
      patch.gender = dto.gender as unknown as User['gender'];
    if (typeof dto.birthday !== 'undefined')
      patch.birthday = dto.birthday ?? null;
    if (typeof dto.country !== 'undefined')
      patch.country = (dto.country || null) as unknown as User['country'];
    if (typeof dto.locale !== 'undefined') patch.locale = dto.locale ?? null;
    if (typeof dto.time_zone !== 'undefined')
      patch.time_zone = dto.time_zone ?? null;
    if (typeof dto.marketing_consent !== 'undefined')
      patch.marketing_consent = !!dto.marketing_consent;

    await this.userRepo.update(user.id, patch);

    // 失效相关缓存
    await this.invalidateUserCache(user);

    return this.getById(user.id);
  }

  /** 修改密码（校验旧密码 + bcrypt 新哈希 + pv 自增 + 记录 changed_at） */
  async changePasswordChecked(
    userId: number,
    currentPlain: string,
    newPlain: string,
  ) {
    const user = await this.getById(userId);
    const ok = await bcrypt.compare(currentPlain, user.password);
    if (!ok) throw new UnauthorizedException('当前密码不正确');

    const hashed = await bcrypt.hash(newPlain, BCRYPT_ROUNDS);
    await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set({
        password: hashed,
        password_version: () => 'password_version + 1',
        password_changed_at: () => 'CURRENT_TIMESTAMP',
      })
      .where('id = :id', { id: userId })
      .execute();

    // 失效相关缓存
    await this.invalidateUserCache(user);

    // 可选：也可在这里 revokeAllSessionsByUser(userId) 做更快的"全端下线"
  }

  /**
   * 创建会话（JTI + SHA256 token_hash），含并发策略
   *
   * ✅ 优化: 使用SHA256替代bcrypt (性能提升1000倍)
   * - bcrypt: ~100ms per hash
   * - SHA256: ~0.1ms per hash
   * - JWT token本身已经足够安全，不需要bcrypt的慢哈希
   */
  async createSessionJTI(params: {
    userId: string;
    jti: string;
    refreshTokenPlain: string;
    deviceId?: string | null;
    deviceName?: string | null;
    platform?: string;
    userAgent?: string | null;
    ip?: string | null;
    expiresAt: Date; // 与 JWT exp 对齐
    policy: ConcurrencyPolicy;
    maxActiveSessions?: number; // policy=limit 时有效
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
      maxActiveSessions = 5,
    } = params;

    // 并发策略
    if (policy === 'replace' && deviceId) {
      await this.sessionRepo
        .createQueryBuilder()
        .update(UserSession)
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

    // ✅ 使用SHA256替代bcrypt（性能提升1000倍）
    const token_hash = crypto
      .createHash('sha256')
      .update(refreshTokenPlain)
      .digest('hex');

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

  /**
   * 刷新轮换：撤销旧 JTI，复制设备信息创建新会话
   *
   * ✅ 优化: 使用SHA256替代bcrypt
   */
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

    // ✅ 使用SHA256替代bcrypt（性能提升1000倍）
    const token_hash = crypto
      .createHash('sha256')
      .update(newRefreshTokenPlain)
      .digest('hex');

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

  /** 一键清空用户所有活动会话（复用检测触发） */
  async revokeAllSessionsByUser(
    userId: string,
    reason: string = 'reuse_detected',
  ) {
    await this.sessionRepo
      .createQueryBuilder()
      .update(UserSession)
      .set({ revoked_at: () => 'CURRENT_TIMESTAMP', revoked_reason: reason })
      .where('user_id = :userId', { userId })
      .andWhere('revoked_at IS NULL')
      .execute();
  }
}
