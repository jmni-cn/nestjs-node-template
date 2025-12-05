// src/admin/permission/entities/permission.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { AdminRole } from '@/admin/roles/entities/role.entity';

export type PermType = 'api' | 'menu' | 'action';

@Entity('admin_permissions')
@Index(['code'], { unique: true })
export class AdminPermission {
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '权限名称' })
  @Column({ length: 64, type: 'varchar' })
  name: string;

  @ApiProperty({ description: '权限编码（唯一）' })
  @Column({ length: 64, type: 'varchar', unique: true })
  code: string;

  @ApiProperty({ description: '类型', default: 'api' })
  @Column({ type: 'enum', enum: ['api', 'menu', 'action'], default: 'api' })
  type: PermType;

  @ApiProperty({ description: 'HTTP 方法', required: false })
  @Column({ type: 'varchar', length: 10, nullable: true })
  http_method: string | null;

  @ApiProperty({ description: 'HTTP 路径', required: false })
  @Column({ type: 'varchar', length: 255, nullable: true })
  http_path: string | null;

  @ApiProperty({ description: '描述', required: false })
  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @ManyToMany(() => AdminRole, (role) => role.permissions)
  roles: AdminRole[];

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  created_at: Date;

  @ApiProperty({ description: '更新时间' })
  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updated_at: Date;
}
