import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { OAuthProvider } from './user-identity.entity';

export type Gender = 'unknown' | 'male' | 'female' | 'other';
export type UserStatus = 'active' | 'inactive' | 'banned' | 'deleted';

@Entity('users')
@Index('uniq_users_username', ['username'], { unique: true })
@Index('uniq_users_email', ['email'], { unique: true })
@Index('uniq_users_phone', ['phone'], { unique: true })
export class User {
  @ApiProperty({ description: '自增ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '业务用 UID（可暴露给前端）' })
  @Column({ type: 'varchar', length: 32, unique: true })
  uid: string;

  @ApiProperty({ description: '用户名' })
  @Column({ type: 'varchar', length: 50, nullable: true })
  username: string | null;

  @ApiProperty({ description: '邮箱' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string | null;

  @ApiProperty({ description: '手机号（含区号）', example: '+86-13800000000' })
  @Column({ type: 'varchar', length: 32, nullable: true })
  phone: string | null;

  @ApiProperty({ description: '密码哈希' })
  @Exclude()
  @Column({ type: 'varchar', length: 255 })
  password: string;

  @ApiProperty({ description: '密码版本（修改密码+1，用于失效旧token）' })
  @Column({ type: 'int', default: 1 })
  password_version: number;

  @ApiProperty({ description: '昵称' })
  @Column({ type: 'varchar', length: 50, nullable: true })
  nickname: string | null;

  @ApiProperty({ description: '头像URL' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  avatar_url: string | null;

  @ApiProperty({ description: '性别' })
  @Column({
    type: 'enum',
    enum: ['unknown', 'male', 'female', 'other'],
    default: 'unknown',
  })
  gender: Gender;

  @ApiProperty({ description: '生日（YYYY-MM-DD）' })
  @Column({ type: 'date', nullable: true })
  birthday: string | null;

  @ApiProperty({ description: '国家/地区码', example: 'CN' })
  @Column({ type: 'char', length: 2, nullable: true })
  country: string | null;

  @ApiProperty({ description: '语言', example: 'zh-CN' })
  @Column({ type: 'varchar', length: 10, nullable: true })
  locale: string | null;

  @ApiProperty({ description: '时区', example: 'Asia/Shanghai' })
  @Column({ type: 'varchar', length: 40, nullable: true })
  time_zone: string | null;

  @ApiProperty({
    description: '注册渠道',
    example: 'email|sms|apple|google|wechat',
  })
  @Column({ type: 'varchar', length: 32, default: 'email' })
  register_channel: string | OAuthProvider;

  @ApiProperty({ description: '是否验证邮箱' })
  @Column({ type: 'boolean', default: false })
  email_verified: boolean;

  @ApiProperty({ description: '邮箱验证时间' })
  @Column({ type: 'datetime', nullable: true })
  email_verified_at: Date | null;

  @ApiProperty({ description: '是否验证手机号' })
  @Column({ type: 'boolean', default: false })
  phone_verified: boolean;

  @ApiProperty({ description: '手机号验证时间' })
  @Column({ type: 'datetime', nullable: true })
  phone_verified_at: Date | null;

  @ApiProperty({ description: '营销/通知同意' })
  @Column({ type: 'boolean', default: false })
  marketing_consent: boolean;

  @ApiProperty({ description: '用户状态' })
  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'banned', 'deleted'],
    default: 'active',
  })
  status: UserStatus;

  @ApiProperty({ description: '上次登录时间' })
  @Column({ type: 'datetime', nullable: true })
  last_login_at: Date | null;

  @ApiProperty({ description: '上次登录IP' })
  @Column({ type: 'varchar', length: 45, nullable: true })
  last_login_ip: string | null;

  @ApiProperty({ description: '密码最后修改时间' })
  @Column({ type: 'datetime', nullable: true })
  password_changed_at: Date | null;

  @ApiProperty({ description: '风控标记' })
  @Column({ type: 'json', nullable: true })
  risk_flags: Record<string, any> | null;

  @ApiProperty({ description: '扩展信息' })
  @Column({ type: 'json', nullable: true })
  meta: Record<string, any> | null;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  created_at: Date;

  @ApiProperty({ description: '更新时间' })
  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updated_at: Date;

  @ApiProperty({ description: '软删除时间' })
  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  deleted_at: Date | null;
}
