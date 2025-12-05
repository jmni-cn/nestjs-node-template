// src/admin/users/entities/admin-user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { AdminRole } from '@/admin/roles/entities/role.entity';

export type AdminStatus = 'active' | 'inactive' | 'banned';

@Entity('admin_users')
@Index(['username'], { unique: true })
@Index(['email'], { unique: true, where: 'email IS NOT NULL' })
export class AdminUser {
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '业务 UID（审计）' })
  @Column({ type: 'varchar', length: 32, unique: true })
  uid: string;

  @ApiProperty({ description: '用户名' })
  @Column({ type: 'varchar', length: 50 })
  username: string;

  @ApiProperty({ description: '邮箱', required: false })
  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string | null;

  @ApiProperty({ description: '密码（bcrypt 哈希）' })
  @Column({ type: 'varchar', length: 255 })
  password: string;

  @ApiProperty({ description: '密码版本（改密 +1）' })
  @Column({ type: 'int', default: 1 })
  password_version: number;

  @ApiProperty({ description: '昵称', required: false })
  @Column({ type: 'varchar', length: 50, nullable: true })
  nickname: string | null;

  @ApiProperty({ description: '状态' })
  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'banned'],
    default: 'active',
  })
  status: AdminStatus;

  @ApiProperty({ description: '上次登录时间', required: false })
  @Column({ type: 'datetime', nullable: true })
  last_login_at: Date | null;

  @ApiProperty({ description: '上次登录 IP', required: false })
  @Column({ type: 'varchar', length: 45, nullable: true })
  last_login_ip: string | null;

  @ApiProperty({ description: '密码变更时间', required: false })
  @Column({ type: 'datetime', nullable: true })
  password_changed_at: Date | null;

  @ManyToMany(() => AdminRole, (r) => r.users, {
    cascade: ['insert', 'update'],
  })
  @JoinTable({
    name: 'admin_user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: AdminRole[];

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  created_at: Date;

  @ApiProperty({ description: '更新时间' })
  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updated_at: Date;
}
