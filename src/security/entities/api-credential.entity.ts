// src/security/entities/api-credential.entity.ts
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

export type HmacAlg = 'sha256' | 'sha512';
export type SigEnc = 'hex' | 'base64';
export type CredStatus = 'active' | 'inactive' | 'revoked';

@Entity('api_credentials')
@Unique('uniq_app_kid', ['app_id', 'kid'])
@Index('idx_app', ['app_id'])
@Index('idx_status', ['status'])
@Index('idx_expires_at', ['expires_at'])
export class ApiCredential {
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '应用ID（前端携带 x-app-id）' })
  @Column({ type: 'varchar', length: 64 })
  app_id: string;

  @ApiProperty({
    description: '密钥ID（前端可选携带 x-kid；用于轮换）',
    default: 'k1',
  })
  @Column({ type: 'varchar', length: 32, default: 'k1' })
  kid: string;

  /**
   * 强烈建议：该字段存“密文”或经 KMS 加密后的密文；
   * 如果必须明文，请降低 DB 访问权限并做好审计。
   * select: false -> 默认查询不会取出，需要 resolver 显式 addSelect。
   */
  @ApiProperty({ description: 'HMAC 密钥（建议加密存储）', writeOnly: true })
  @Column({ type: 'varchar', length: 255, select: false })
  secret: string;

  @ApiProperty({
    description: 'HMAC 算法',
    enum: ['sha256', 'sha512'],
    default: 'sha256',
  })
  @Column({ type: 'enum', enum: ['sha256', 'sha512'], default: 'sha256' })
  alg: HmacAlg;

  @ApiProperty({
    description: '签名编码',
    enum: ['hex', 'base64'],
    default: 'hex',
  })
  @Column({ type: 'enum', enum: ['hex', 'base64'], default: 'hex' })
  enc: SigEnc;

  @ApiProperty({
    description: '状态',
    enum: ['active', 'inactive', 'revoked'],
    default: 'active',
  })
  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'revoked'],
    default: 'active',
  })
  status: CredStatus;

  @ApiProperty({ description: '生效时间（未到则拒绝）', required: false })
  @Column({ type: 'datetime', nullable: true })
  not_before: Date | null;

  @ApiProperty({ description: '过期时间（已过则拒绝）', required: false })
  @Column({ type: 'datetime', nullable: true })
  expires_at: Date | null;

  @ApiProperty({ description: '允许的调用IP白名单（可选）', required: false })
  @Column({ type: 'json', nullable: true })
  allow_ips: string[] | null;

  @ApiProperty({ description: '描述', required: false })
  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @ApiProperty({ description: '最后一次使用时间', required: false })
  @Column({ type: 'datetime', nullable: true })
  last_used_at: Date | null;

  @ApiProperty({ description: '最近一次使用IP', required: false })
  @Column({ type: 'varchar', length: 45, nullable: true })
  last_used_ip: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updated_at: Date;
}
