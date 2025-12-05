// src/admin/category/entities/category.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { AdminUser } from '@/admin/users/entities/admin-user.entity';
import { CategoryStatus } from '../types';

/**
 * 分类实体
 * 支持多模块、树形层级结构（邻接表 + 物化路径）
 */
@Entity('admin_categories')
@Index('idx_category_uid', ['uid'], { unique: true })
@Index('idx_category_module', ['moduleCode'])
@Index('idx_category_parent', ['moduleCode', 'parentId'])
@Index('idx_category_status', ['status'])
@Index('idx_category_sort', ['sortOrder'])
@Index('idx_category_slug', ['moduleCode', 'slug'], { unique: true })
export class Category {
  @ApiProperty({ description: '自增主键' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '业务 UID（对外、审计使用）' })
  @Column({ type: 'varchar', length: 32, unique: true })
  uid: string;

  @ApiProperty({
    description: '模块编码，用于按模块分组',
    example: 'article',
  })
  @Column({ type: 'varchar', length: 64 })
  moduleCode: string;

  @ApiProperty({ description: '分类名称' })
  @Column({ type: 'varchar', length: 64 })
  name: string;

  @ApiProperty({ description: 'URL 标识/别名（同一模块内唯一）' })
  @Column({ type: 'varchar', length: 128 })
  slug: string;

  @ApiProperty({ description: '描述', required: false })
  @Column({ type: 'varchar', length: 255, default: '' })
  description: string;

  @ApiProperty({ description: '图标（可选）', required: false })
  @Column({ type: 'varchar', length: 128, nullable: true })
  icon: string | null;

  @ApiProperty({ description: '封面图 URL（可选）', required: false })
  @Column({ type: 'varchar', length: 512, nullable: true })
  coverUrl: string | null;

  // ========== 层级结构（邻接表 + 物化路径）==========

  @ApiProperty({ description: '父分类 ID（根节点为空）', required: false })
  @Column({ type: 'int', unsigned: true, nullable: true })
  parentId: number | null;

  @ManyToOne(() => Category, (c) => c.children, { nullable: true })
  @JoinColumn({ name: 'parentId', referencedColumnName: 'id' })
  parent?: Category | null;

  @OneToMany(() => Category, (c) => c.parent)
  children?: Category[];

  @ApiProperty({
    description: '物化路径（示例："/1/3/5/"）',
  })
  @Column({ type: 'varchar', length: 255, default: '' })
  path: string;

  @ApiProperty({ description: '层级（根=0）' })
  @Column({ type: 'tinyint', unsigned: true, default: 0 })
  level: number;

  @ApiProperty({ description: '是否叶子节点' })
  @Column({ type: 'tinyint', width: 1, default: 1 })
  isLeaf: boolean;

  // ========== 展示与状态 ==========

  @ApiProperty({ description: '排序权重（数字越大越靠前）' })
  @Column({ type: 'int', unsigned: true, default: 0 })
  sortOrder: number;

  @ApiProperty({
    description: '状态',
    enum: ['enabled', 'disabled'],
    default: 'enabled',
  })
  @Column({ type: 'varchar', length: 16, default: 'enabled' })
  status: CategoryStatus;

  @ApiProperty({ description: '逻辑删除标记' })
  @Column({ type: 'tinyint', width: 1, default: 0 })
  isDeleted: boolean;

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

  @ApiProperty({ description: '最后修改人 UID（AdminUser.uid）' })
  @Column({ type: 'varchar', length: 32, default: '' })
  updatedByUid: string;

  @ApiProperty({ description: '最后修改人用户名（冗余）' })
  @Column({ type: 'varchar', length: 50, default: '' })
  updatedByUsername: string;

  @ManyToOne(() => AdminUser, { nullable: true })
  @JoinColumn({ name: 'updatedBy', referencedColumnName: 'id' })
  updatedByUser?: AdminUser | null;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ type: 'datetime', precision: 6 })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  @UpdateDateColumn({ type: 'datetime', precision: 6 })
  updatedAt: Date;
}
