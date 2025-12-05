// src/admin/users/entities/admin-session.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('admin_sessions')
@Index(['user_id', 'jti'], { unique: true })
@Index(['user_id', 'device_id'], { where: 'device_id IS NOT NULL' })
@Index(['user_id', 'revoked_at', 'expires_at'])
export class AdminSession {
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '管理员 ID' })
  @Index()
  @Column({ type: 'varchar', length: 32 })
  user_id: string;

  @ApiProperty({ description: 'JTI' })
  @Column({ type: 'varchar', length: 36 })
  jti: string;

  @ApiProperty({ description: 'RefreshToken 的 bcrypt 哈希' })
  @Column({ type: 'varchar', length: 100 })
  token_hash: string;

  @ApiProperty({ description: '刷新成功时更新', required: false })
  @Column({ type: 'datetime', nullable: true })
  last_seen_at: Date | null;

  @ApiProperty({ description: '累计刷新', required: false })
  @Column({ type: 'int', default: 0 })
  refresh_count: number;

  @ApiProperty({ description: '设备 ID', required: false })
  @Column({ type: 'varchar', length: 64, nullable: true })
  device_id: string | null;

  @ApiProperty({ description: '设备名', required: false })
  @Column({ type: 'varchar', length: 64, nullable: true })
  device_name: string | null;

  @ApiProperty({ description: '平台', example: 'web' })
  @Column({ type: 'varchar', length: 16, default: 'web' })
  platform: string;

  @ApiProperty({ description: 'UA', required: false })
  @Column({ type: 'varchar', length: 255, nullable: true })
  user_agent: string | null;

  @ApiProperty({ description: 'IP', required: false })
  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @ApiProperty({ description: '过期时间' })
  @Column({ type: 'datetime' })
  expires_at: Date;

  @ApiProperty({ description: '撤销时间', required: false })
  @Column({ type: 'datetime', nullable: true })
  revoked_at: Date | null;

  @ApiProperty({ description: '撤销原因', required: false })
  @Column({ type: 'varchar', length: 128, nullable: true })
  revoked_reason: string | null;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  created_at: Date;

  @ApiProperty({ description: '更新时间' })
  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updated_at: Date;
}
