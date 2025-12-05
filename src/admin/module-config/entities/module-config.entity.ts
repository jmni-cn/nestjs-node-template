// src/admin/module-config/entities/module-config.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { AdminUser } from '@/admin/users/entities/admin-user.entity';
import { ModuleConfigStatus, ModuleConfigItemType } from '../types';

/**
 * 模块配置实体
 * 用于管理后台的模块级别配置项
 * - 支持按 moduleCode + itemKey 细粒度控制
 * - value 统一用字符串/JSON 字符串存储
 */
@Entity('admin_module_config')
@Index('idx_module_config_module', ['moduleCode'])
@Index('idx_module_config_key', ['moduleCode', 'itemKey'], { unique: true })
@Index('idx_module_config_status', ['status'])
@Index('idx_module_config_uid', ['uid'], { unique: true })
export class ModuleConfig {
  @ApiProperty({ description: '自增主键' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '业务 UID（审计用）' })
  @Column({ type: 'varchar', length: 32, unique: true })
  uid: string;

  @ApiProperty({ description: '模块编码，如 article / user / auth' })
  @Column({ type: 'varchar', length: 64 })
  moduleCode: string;

  @ApiProperty({ description: '模块名称（冗余，便于展示）' })
  @Column({ type: 'varchar', length: 64, default: '' })
  moduleName: string;

  @ApiProperty({ description: '配置项 key（模块内唯一）' })
  @Column({ type: 'varchar', length: 64 })
  itemKey: string;

  @ApiProperty({ description: '配置项名称（便于展示）' })
  @Column({ type: 'varchar', length: 128, default: '' })
  itemName: string;

  @ApiProperty({
    description: '配置项类型',
    enum: ['switch', 'number', 'text', 'json', 'select', 'multiselect'],
  })
  @Column({ type: 'varchar', length: 32, default: 'text' })
  itemType: ModuleConfigItemType;

  @ApiProperty({ description: '配置值（字符串或 JSON 字符串）' })
  @Column({ type: 'text', comment: '配置值（字符串或 JSON 字符串）' })
  value: string;

  @ApiProperty({ description: '默认值（字符串或 JSON 字符串）', required: false })
  @Column({ type: 'text', nullable: true, comment: '默认值' })
  defaultValue: string | null;

  @ApiProperty({
    description: '可选值列表（用于 select/multiselect 类型）',
    required: false,
  })
  @Column({ type: 'json', nullable: true, comment: '可选值列表 JSON' })
  options: Array<{ label: string; value: string }> | null;

  @ApiProperty({ description: '状态', enum: ['enabled', 'disabled'] })
  @Column({ type: 'varchar', length: 16, default: 'enabled' })
  status: ModuleConfigStatus;

  @ApiProperty({ description: '配置项说明', required: false })
  @Column({ type: 'varchar', length: 512, default: '' })
  description: string;

  @ApiProperty({ description: '配置项备注（内部使用）', required: false })
  @Column({ type: 'varchar', length: 255, default: '' })
  remark: string;

  @ApiProperty({ description: '排序权重（数字越大越靠前）' })
  @Column({ type: 'int', unsigned: true, default: 0 })
  sortOrder: number;

  @ApiProperty({ description: '是否系统内置（内置配置不可删除）' })
  @Column({ type: 'tinyint', width: 1, default: 0 })
  isSystem: boolean;

  // ========== 审计字段：与 AdminUser 对应 ==========

  @ApiProperty({ description: '创建人 ID（AdminUser.id）', required: false })
  @Column({ type: 'int', unsigned: true, nullable: true })
  createdBy: number | null;

  @ApiProperty({ description: '创建人 UID（AdminUser.uid）' })
  @Column({ type: 'varchar', length: 32, default: '' })
  createdByUid: string;

  @ApiProperty({ description: '创建人用户名（冗余）' })
  @Column({ type: 'varchar', length: 50, default: '' })
  createdByUsername: string;

  @ManyToOne(() => AdminUser, { nullable: true })
  @JoinColumn({ name: 'createdBy', referencedColumnName: 'id' })
  createdByUser?: AdminUser | null;

  @ApiProperty({ description: '最后修改人 ID（AdminUser.id）', required: false })
  @Column({ type: 'int', unsigned: true, nullable: true })
  updatedBy: number | null;

  @ApiProperty({ description: '最后修改人 UID' })
  @Column({ type: 'varchar', length: 32, default: '' })
  updatedByUid: string;

  @ApiProperty({ description: '最后修改人用户名（冗余）' })
  @Column({ type: 'varchar', length: 50, default: '' })
  updatedByUsername: string;

  @ManyToOne(() => AdminUser, { nullable: true })
  @JoinColumn({ name: 'updatedBy', referencedColumnName: 'id' })
  updatedByUser?: AdminUser | null;

  @ApiProperty({ description: '逻辑删除标记' })
  @Column({ type: 'tinyint', width: 1, default: 0 })
  isDeleted: boolean;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ type: 'datetime', precision: 6 })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  @UpdateDateColumn({ type: 'datetime', precision: 6 })
  updatedAt: Date;
}
