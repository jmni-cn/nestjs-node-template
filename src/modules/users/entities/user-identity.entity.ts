// src/api/users/entities/user-identity.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/** 三方提供方，按需要增删 */
export type OAuthProvider =
  | 'wechat_mp' // 公众号
  | 'wechat_oa' // 服务号（同上可合并）
  | 'wechat_open' // 开放平台（可拿 unionid 的“统一身份”）
  | 'github'
  | 'microsoft'
  | 'qq'
  | 'google'
  | 'apple';

@Entity('user_identities')
@Unique('uniq_provider_subject', ['provider', 'subject'])
@Index('idx_user_id', ['user_id'])
@Index('idx_unionid', ['unionid'])
@Index('idx_provider_app_openid', ['provider', 'app_id', 'openid'])
export class UserIdentity {
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '用户ID（FK -> users.id）' })
  @Column({ type: 'int' })
  user_id: number;

  @ApiProperty({
    description: '第三方提供方',
    enum: [
      'wechat_mp',
      'wechat_oa',
      'wechat_open',
      'github',
      'microsoft',
      'qq',
      'google',
      'apple',
    ],
  })
  // @Column({ type: 'enum', enum: [
  //   'wechat_mp','wechat_oa','wechat_open','github','microsoft','qq','google','apple'
  // ] })
  @Column({ type: 'varchar', length: 128, nullable: true })
  provider: string;

  /**
   * 统一“主体唯一ID”，作为真正的唯一键的一部分（与 provider 组合）。
   * 规范化策略（建议在 Service 层实现）：
   * - 微信优先使用 unionid；拿不到则使用 `${app_id}:${openid}`
   * - 其他平台直接用其全局唯一ID（如 GitHub id、Microsoft oid/sub、QQ openid）
   */
  @ApiProperty({ description: '规范化后的唯一主体ID（用于唯一性约束）' })
  @Column({ type: 'varchar', length: 160 })
  subject: string;

  // —— 平台原生ID信息（便于追踪/迁移/排障） —— //
  @ApiProperty({
    description: '平台下用户唯一ID（如 openid/sub）',
    required: false,
  })
  @Column({ type: 'varchar', length: 128, nullable: true })
  openid: string | null;

  @ApiProperty({
    description: '跨应用统一ID（如微信 unionid）',
    required: false,
  })
  @Column({ type: 'varchar', length: 128, nullable: true })
  unionid: string | null;

  @ApiProperty({
    description: '第三方应用ID（如微信 appid；微软可放租户/客户端）',
    required: false,
  })
  @Column({ type: 'varchar', length: 64, nullable: true })
  app_id: string | null;

  @ApiProperty({
    description: '第三方租户/空间ID（微软/企业微信等可用）',
    required: false,
  })
  @Column({ type: 'varchar', length: 64, nullable: true })
  tenant_id: string | null;

  // —— 便于初次注册完善资料 —— //
  @ApiProperty({ description: '昵称', required: false })
  @Column({ type: 'varchar', length: 128, nullable: true })
  nickname: string | null;

  @ApiProperty({ description: '头像URL', required: false })
  @Column({ type: 'varchar', length: 255, nullable: true })
  avatar_url: string | null;

  @ApiProperty({ description: '邮箱（若平台返回）', required: false })
  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string | null;

  @ApiProperty({ description: '邮箱是否已在平台侧验证', required: false })
  @Column({ type: 'boolean', default: false })
  email_verified: boolean;

  // —— 审计/可观测 —— //
  @ApiProperty({ description: '最近一次使用时间', required: false })
  @Column({ type: 'datetime', nullable: true })
  last_used_at: Date | null;

  @ApiProperty({ description: '最近一次使用IP', required: false })
  @Column({ type: 'varchar', length: 45, nullable: true })
  last_used_ip: string | null;

  // —— 原始档案/元数据 —— //
  @ApiProperty({
    description: '三方返回的原始档案（去除敏感token）',
    required: false,
  })
  @Column({ type: 'json', nullable: true, select: false })
  raw_profile: Record<string, any> | null;

  @ApiProperty({ description: '扩展信息（自定义）', required: false })
  @Column({ type: 'json', nullable: true })
  meta: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updated_at: Date;
}
