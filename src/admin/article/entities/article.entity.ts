// src/admin/article/entities/article.entity.ts
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
import { Category } from '@/admin/category/entities/category.entity';
import { ArticleStatus, ContentFormat } from '../types';

/**
 * 后台文章实体
 * 用于管理后台的文章/公告/内容管理
 */
@Entity('admin_articles')
@Index('idx_article_status', ['status'])
@Index('idx_article_category', ['categoryId'])
@Index('idx_article_published', ['publishedAt'])
@Index('idx_article_top', ['isTop'])
@Index('idx_article_created_by', ['createdBy'])
@Index('idx_article_uid', ['uid'], { unique: true })
export class Article {
  @ApiProperty({ description: '自增主键' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '业务 UID（对外、审计使用）' })
  @Column({ type: 'varchar', length: 32, unique: true })
  uid: string;

  @ApiProperty({ description: '标题' })
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiProperty({ description: '子标题', required: false })
  @Column({ type: 'varchar', length: 255, nullable: true })
  subTitle: string | null;

  @ApiProperty({ description: '摘要' })
  @Column({ type: 'varchar', length: 512, default: '' })
  summary: string;

  @ApiProperty({ description: '文章正文内容（富文本或 Markdown）' })
  @Column({ type: 'longtext', comment: '文章正文内容' })
  content: string;

  @ApiProperty({
    description: '内容格式',
    enum: ['markdown', 'html', 'richtext'],
    default: 'markdown',
  })
  @Column({ type: 'varchar', length: 32, default: 'markdown' })
  contentFormat: ContentFormat;

  @ApiProperty({ description: '封面图 URL', required: false })
  @Column({ type: 'varchar', length: 512, nullable: true })
  coverUrl: string | null;

  @ApiProperty({ description: '分类 ID（关联 admin_categories）', required: false })
  @Column({ type: 'int', unsigned: true, nullable: true })
  categoryId: number | null;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'categoryId', referencedColumnName: 'id' })
  category?: Category | null;

  @ApiProperty({ description: '分类名称（冗余，便于展示）' })
  @Column({ type: 'varchar', length: 64, default: '' })
  categoryName: string;

  @ApiProperty({
    description: '标签列表（JSON 数组）',
    example: ['公告', '更新日志'],
    required: false,
  })
  @Column({ type: 'json', nullable: true, comment: '标签列表 JSON 数组' })
  tags: string[] | null;

  @ApiProperty({
    description: '状态',
    enum: ['draft', 'published', 'offline'],
    default: 'draft',
  })
  @Column({ type: 'varchar', length: 16, default: 'draft' })
  status: ArticleStatus;

  @ApiProperty({ description: '是否置顶' })
  @Column({ type: 'tinyint', width: 1, default: 0 })
  isTop: boolean;

  @ApiProperty({ description: '是否推荐' })
  @Column({ type: 'tinyint', width: 1, default: 0 })
  isFeatured: boolean;

  @ApiProperty({ description: '排序权重（数字越大越靠前）' })
  @Column({ type: 'int', unsigned: true, default: 0 })
  sortOrder: number;

  @ApiProperty({ description: 'SEO 标题', required: false })
  @Column({ type: 'varchar', length: 255, default: '' })
  seoTitle: string;

  @ApiProperty({ description: 'SEO 关键词', required: false })
  @Column({ type: 'varchar', length: 255, default: '' })
  seoKeywords: string;

  @ApiProperty({ description: 'SEO 描述', required: false })
  @Column({ type: 'varchar', length: 512, default: '' })
  seoDescription: string;

  @ApiProperty({ description: '阅读量（PV）' })
  @Column({ type: 'int', unsigned: true, default: 0 })
  viewCount: number;

  @ApiProperty({ description: '点赞数' })
  @Column({ type: 'int', unsigned: true, default: 0 })
  likeCount: number;

  // ========== 审计字段：与 AdminUser 对应 ==========

  @ApiProperty({ description: '创建人 ID（AdminUser.id）', required: false })
  @Column({ type: 'int', unsigned: true, nullable: true })
  createdBy: number | null;

  @ApiProperty({ description: '创建人 UID（AdminUser.uid，用于审计追溯）' })
  @Column({ type: 'varchar', length: 32, default: '' })
  createdByUid: string;

  @ApiProperty({ description: '创建人用户名（冗余，便于展示）' })
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

  @ApiProperty({ description: '发布时间', required: false })
  @Column({ type: 'datetime', nullable: true })
  publishedAt: Date | null;

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
