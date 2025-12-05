import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { AdminPermission } from '@/admin/permissions/entities/permission.entity';
import { AdminUser } from '@/admin/users/entities/admin-user.entity';

@Entity('admin_roles')
@Index(['code'], { unique: true })
export class AdminRole {
  @ApiProperty({ description: '角色ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '角色名称' })
  @Column({ length: 64, type: 'varchar' })
  name: string;

  @ApiProperty({ description: '角色代码', example: 'super_admin' })
  @Column({ length: 64, type: 'varchar', unique: true })
  code: string;

  @ApiProperty({ description: '是否系统内置' })
  @Column({ type: 'boolean', default: false })
  is_system: boolean;

  @ApiProperty({ description: '角色描述', required: false })
  @Column({ nullable: true, length: 255, type: 'varchar' })
  description: string | null;

  @ManyToMany(() => AdminPermission, (permission) => permission.roles, {
    cascade: true,
  })
  @JoinTable({
    name: 'admin_role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: AdminPermission[];

  @ManyToMany(() => AdminUser, (user) => user.roles)
  users: AdminUser[];

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  created_at: Date;

  @ApiProperty({ description: '更新时间' })
  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updated_at: Date;
}
