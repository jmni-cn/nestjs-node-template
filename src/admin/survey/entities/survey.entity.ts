// src/admin/survey/entities/survey.entity.ts
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
import { SurveyStatus, SupportedLocale, LocaleText } from '../types';

/**
 * 问卷调查实体
 * 支持多语言、多种问题类型、时间限制等配置
 */
@Entity('admin_surveys')
@Index('idx_survey_uid', ['uid'], { unique: true })
@Index('idx_survey_status', ['status'])
@Index('idx_survey_category', ['categoryId'])
@Index('idx_survey_is_deleted', ['isDeleted'])
@Index('idx_survey_is_archived', ['isArchived'])
@Index('idx_survey_created_by', ['createdBy'])
@Index('idx_survey_created_at', ['createdAt'])
export class Survey {
  @ApiProperty({ description: '自增主键' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '业务 UID（对外、公用、审计）' })
  @Column({ type: 'varchar', length: 32, unique: true })
  uid: string;

  @ApiProperty({
    description: '问卷状态：draft 草稿 / active 收集中 / closed 已截止',
    enum: ['draft', 'active', 'closed'],
    default: 'draft',
  })
  @Column({
    type: 'varchar',
    length: 16,
    default: 'draft',
  })
  status: SurveyStatus;

  @ApiProperty({
    description: '问卷标题（多语言 JSON）',
    example: { zhCN: '问卷标题', enUS: 'Survey Title' },
  })
  @Column({
    type: 'json',
    nullable: true,
    comment: '问卷标题（多语言）',
  })
  title: LocaleText | null;

  @ApiProperty({
    description: '问卷描述（多语言 JSON）',
    example: { zhCN: '问卷描述', enUS: 'Survey Description' },
    required: false,
  })
  @Column({
    type: 'json',
    nullable: true,
    comment: '问卷描述（多语言）',
  })
  description: LocaleText | null;

  @ApiProperty({
    description: '问卷结构（题目列表配置 JSON schema）',
    required: false,
  })
  @Column({
    type: 'json',
    nullable: true,
    comment: '问卷题目配置（schema JSON）',
  })
  topics: any | null;

  @ApiProperty({
    description: '答卷结束提示语（多语言 JSON）',
    example: { zhCN: '感谢参与', enUS: 'Thanks for your participation' },
    required: false,
  })
  @Column({
    type: 'json',
    nullable: true,
    comment: '结束语（多语言）',
  })
  endMessage: LocaleText | null;

  @ApiProperty({
    description: '启用的多语言列表',
    example: ['zhCN', 'enUS'],
  })
  @Column({
    type: 'json',
    nullable: true,
    comment: '启用的多语言列表',
  })
  languagesList: SupportedLocale[] | null;

  @ApiProperty({
    description: '主题主色',
    example: '#409EFF',
    required: false,
  })
  @Column({
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  themeColor: string | null;

  @ApiProperty({ description: '是否需要登录才可答题', default: false })
  @Column({
    type: 'tinyint',
    width: 1,
    default: 0,
  })
  loginRequired: boolean;

  @ApiProperty({
    description: '是否限制答题时间（配合 startTime / endTime）',
    default: false,
  })
  @Column({
    type: 'tinyint',
    width: 1,
    default: 0,
  })
  answerLimitDate: boolean;

  @ApiProperty({ description: '是否显示题目编号', default: true })
  @Column({
    type: 'tinyint',
    width: 1,
    default: 1,
  })
  showQuestionIndex: boolean;

  @ApiProperty({
    description: '问卷开始时间（为空则不限制）',
    required: false,
  })
  @Column({
    type: 'datetime',
    nullable: true,
  })
  startTime: Date | null;

  @ApiProperty({
    description: '问卷截止时间（为空则不限制）',
    required: false,
  })
  @Column({
    type: 'datetime',
    nullable: true,
  })
  endTime: Date | null;

  @ApiProperty({
    description: '时间范围冗余字段 [start, end]',
    required: false,
  })
  @Column({
    type: 'json',
    nullable: true,
    comment: '时间范围冗余（[start, end]）',
  })
  datetimeRange: string[] | null;

  @ApiProperty({ description: '是否已归档', default: false })
  @Column({
    type: 'tinyint',
    width: 1,
    default: 0,
  })
  isArchived: boolean;

  @ApiProperty({
    description: '归档类别 ID',
    required: false,
  })
  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  archiveCategoryId: string | null;

  @ApiProperty({ description: '逻辑删除标记', default: false })
  @Column({
    type: 'tinyint',
    width: 1,
    default: 0,
  })
  isDeleted: boolean;

  @ApiProperty({
    description: '每个用户最多可提交次数（0 表示不限制）',
    default: 0,
  })
  @Column({
    type: 'int',
    unsigned: true,
    default: 0,
  })
  maxSubmitTimesPerUser: number;

  @ApiProperty({ description: '是否要求填写前绑定游戏账号', default: false })
  @Column({
    type: 'tinyint',
    width: 1,
    default: 0,
  })
  requireGameBinding: boolean;

  @ApiProperty({ description: '排序权重（数字越大越靠前）', default: 0 })
  @Column({
    type: 'int',
    unsigned: true,
    default: 0,
  })
  sortOrder: number;

  @ApiProperty({ description: '分类 ID（关联 admin_categories）', required: false })
  @Column({
    type: 'int',
    unsigned: true,
    nullable: true,
  })
  categoryId: number | null;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'categoryId', referencedColumnName: 'id' })
  category?: Category | null;

  @ApiProperty({ description: '分类名称（冗余，便于展示）' })
  @Column({
    type: 'varchar',
    length: 64,
    default: '',
  })
  categoryName: string;

  @ApiProperty({ description: '提交次数统计', default: 0 })
  @Column({
    type: 'int',
    unsigned: true,
    default: 0,
  })
  submitCount: number;

  @ApiProperty({ description: '浏览次数统计', default: 0 })
  @Column({
    type: 'int',
    unsigned: true,
    default: 0,
  })
  viewCount: number;

  // ========== 审计字段：与 AdminUser 对应 ==========

  @ApiProperty({ description: '创建人 ID（AdminUser.id）', required: false })
  @Column({
    type: 'int',
    unsigned: true,
    nullable: true,
  })
  createdBy: number | null;

  @ApiProperty({ description: '创建人 UID（AdminUser.uid，用于审计追溯）' })
  @Column({
    type: 'varchar',
    length: 32,
    default: '',
  })
  createdByUid: string;

  @ApiProperty({ description: '创建人用户名（冗余，便于展示）' })
  @Column({
    type: 'varchar',
    length: 50,
    default: '',
  })
  createdByUsername: string;

  @ManyToOne(() => AdminUser, { nullable: true })
  @JoinColumn({ name: 'createdBy', referencedColumnName: 'id' })
  createdByUser?: AdminUser | null;

  @ApiProperty({ description: '最后修改人 ID（AdminUser.id）', required: false })
  @Column({
    type: 'int',
    unsigned: true,
    nullable: true,
  })
  updatedBy: number | null;

  @ApiProperty({ description: '最后修改人 UID（AdminUser.uid）' })
  @Column({
    type: 'varchar',
    length: 32,
    default: '',
  })
  updatedByUid: string;

  @ApiProperty({ description: '最后修改人用户名（冗余）' })
  @Column({
    type: 'varchar',
    length: 50,
    default: '',
  })
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
