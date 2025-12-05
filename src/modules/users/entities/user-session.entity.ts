// src/users/entities/user-session.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

@Entity('user_sessions')
@Index('uniq_sessions_user_jti', ['user_id', 'jti'], { unique: true })
@Index('idx_sessions_user_device', ['user_id', 'device_id'])
@Index('idx_sessions_user_revoked_expires', [
  'user_id',
  'revoked_at',
  'expires_at',
])
export class UserSession {
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '用户ID' })
  @Index()
  @Column({ type: 'varchar', length: 32 })
  user_id: string;

  @ApiProperty({ description: 'JTI (JWT ID)' })
  @Column({ type: 'varchar', length: 36 })
  jti: string;

  @ApiProperty({ description: 'RefreshToken 的 bcrypt 哈希' })
  @Exclude()
  @Column({ type: 'varchar', length: 100 })
  token_hash: string;

  @ApiProperty({ description: '刷新成功时更新' })
  @Column({ type: 'datetime', nullable: true })
  last_seen_at: Date | null;

  @ApiProperty({ description: '累计刷新' })
  @Column({ type: 'int', default: 0 })
  refresh_count: number;

  @ApiProperty({ description: '设备ID（前端指纹或本地生成）' })
  @Column({ type: 'varchar', length: 64, nullable: true })
  device_id: string | null;

  @ApiProperty({ description: '设备名', example: 'iPhone 14 Pro' })
  @Column({ type: 'varchar', length: 64, nullable: true })
  device_name: string | null;

  @ApiProperty({ description: '平台', example: 'ios|android|web|desktop' })
  @Column({ type: 'varchar', length: 16, default: 'web' })
  platform: string;

  @ApiProperty({ description: 'APP版本/浏览器版本' })
  @Column({ type: 'varchar', length: 32, nullable: true })
  app_version: string | null;

  @ApiProperty({ description: 'User-Agent' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  user_agent: string | null;

  @ApiProperty({ description: '登录IP' })
  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @ApiProperty({ description: '地理信息' })
  @Column({ type: 'json', nullable: true })
  geo: Record<string, any> | null;

  @ApiProperty({ description: '过期时间（与 JWT exp 一致）' })
  @Column({ type: 'datetime' })
  expires_at: Date;

  @ApiProperty({ description: '撤销时间' })
  @Column({ type: 'datetime', nullable: true })
  revoked_at: Date | null;

  @ApiProperty({ description: '撤销原因' })
  @Column({ type: 'varchar', length: 128, nullable: true })
  revoked_reason: string | null;

  @ApiProperty({ description: '扩展信息' })
  @Column({ type: 'json', nullable: true })
  meta: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updated_at: Date;
}
