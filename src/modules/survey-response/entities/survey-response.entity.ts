// src/modules/survey-response/entities/survey-response.entity.ts
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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '@/modules/users/entities/user.entity';
import { Survey } from '@/admin/survey/entities/survey.entity';

/**
 * 游戏链接信息类型
 */
export type GamelinkItem = {
  platform?: 'steam' | 'xbox' | 'ps' | 'other';
  region?: string;
  uid?: string;
  extra?: Record<string, any>;
};

/**
 * 问卷响应状态
 */
export type SurveyResponseStatus = 'submitted' | 'reviewing' | 'approved' | 'rejected';

/**
 * 问卷响应实体
 * 存储用户对问卷的回答数据
 */
@Entity('survey_responses')
@Index('idx_survey_responses_survey_uid', ['surveyUid'])
@Index('idx_survey_responses_survey_id', ['surveyId'])
@Index('idx_survey_responses_user_id', ['userId'])
@Index('idx_survey_responses_user_uid', ['userUid'])
@Index('idx_survey_responses_status', ['status'])
@Index('idx_survey_responses_is_effective', ['isEffective'])
@Index('idx_survey_responses_guid', ['guid'])
@Index('idx_survey_responses_email', ['email'])
@Index('idx_survey_responses_created_at', ['createdAt'])
// 唯一约束：同一问卷 + 同一用户只能提交一次（当 userUid 不为空时）
@Index('uniq_survey_uid_user_uid', ['surveyUid', 'userUid'], {
  unique: true,
  where: 'userUid IS NOT NULL AND isDeleted = 0',
})
// 唯一约束：同一问卷 + 同一 guid 只能提交一次（当 guid 不为空时）
@Index('uniq_survey_uid_guid', ['surveyUid', 'guid'], {
  unique: true,
  where: 'guid IS NOT NULL AND isDeleted = 0',
})
export class SurveyResponse {
  @ApiProperty({ description: '自增主键' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '响应业务 UID（可对外暴露）' })
  @Column({ type: 'varchar', length: 32, unique: true })
  uid: string;

  // ==================== 关联维度（问卷 & 用户）====================

  @ApiProperty({ description: '问卷 ID（关联 admin_surveys）' })
  @Column({ type: 'int', unsigned: true })
  surveyId: number;

  @ManyToOne(() => Survey, { nullable: false })
  @JoinColumn({ name: 'surveyId', referencedColumnName: 'id' })
  survey?: Survey;

  @ApiProperty({ description: '问卷 UID（冗余，便于查询）' })
  @Column({ type: 'varchar', length: 32 })
  surveyUid: string;

  @ApiPropertyOptional({ description: '用户 ID（关联 users 表，可空 - 匿名提交）' })
  @Column({ type: 'int', unsigned: true, nullable: true })
  userId: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user?: User | null;

  @ApiPropertyOptional({ description: '用户 UID（User.uid，可空）' })
  @Column({ type: 'varchar', length: 32, nullable: true })
  userUid: string | null;

  @ApiProperty({ description: '用户名（冗余，便于展示）' })
  @Column({ type: 'varchar', length: 50, default: '' })
  username: string;

  // ==================== 答案与元数据 ====================

  @ApiProperty({ description: '问卷答案（JSON）' })
  @Column({ type: 'json', nullable: true })
  answers: Record<string, any> | null;

  @ApiPropertyOptional({ description: '填写时长（秒）' })
  @Column({ type: 'int', unsigned: true, nullable: true })
  durationSeconds: number | null;

  @ApiPropertyOptional({ description: '提交者所选语言（如 zhCN, enUS）' })
  @Column({ type: 'varchar', length: 10, nullable: true })
  locale: string | null;

  @ApiPropertyOptional({ description: '提交者操作系统/平台（如 Windows / iOS）' })
  @Column({ type: 'varchar', length: 32, nullable: true })
  os: string | null;

  @ApiPropertyOptional({ description: '提交时使用的问卷语言（如 zhCN）' })
  @Column({ type: 'varchar', length: 10, nullable: true })
  surveyLanguage: string | null;

  @ApiPropertyOptional({ description: '来源 Referrer' })
  @Column({ type: 'varchar', length: 512, nullable: true })
  referrer: string | null;

  // ==================== 有效性判定 ====================

  @ApiProperty({
    description: '响应状态',
    enum: ['submitted', 'reviewing', 'approved', 'rejected'],
  })
  @Column({ type: 'varchar', length: 16, default: 'submitted' })
  status: SurveyResponseStatus;

  @ApiProperty({ description: '是否有效', default: true })
  @Column({ type: 'tinyint', width: 1, default: 1 })
  isEffective: boolean;

  @ApiPropertyOptional({ description: '无效原因' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  invalidReason: string | null;

  @ApiProperty({ description: '是否已删除', default: false })
  @Column({ type: 'tinyint', width: 1, default: 0 })
  isDeleted: boolean;

  // ==================== 提交者自报信息（业务字段）====================

  @ApiPropertyOptional({ description: '用户昵称（自填）' })
  @Column({ type: 'varchar', length: 50, nullable: true })
  nickname: string | null;

  @ApiPropertyOptional({ description: '用户 KID/GUID（游戏账号标识）' })
  @Column({ type: 'varchar', length: 64, nullable: true })
  guid: string | null;

  @ApiPropertyOptional({ description: '用户游戏链接信息（JSON）' })
  @Column({ type: 'json', nullable: true })
  gamelink: GamelinkItem | null;

  @ApiPropertyOptional({ description: '用户邮箱（自填）' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string | null;

  // ==================== 客户端与网络环境 ====================

  @ApiPropertyOptional({ description: '提交者 IP' })
  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @ApiPropertyOptional({ description: 'IP 解析信息（JSON）' })
  @Column({ type: 'json', nullable: true })
  ipInfo: Record<string, any> | null;

  @ApiPropertyOptional({ description: 'User-Agent 原文' })
  @Column({ type: 'varchar', length: 512, nullable: true })
  userAgentRaw: string | null;

  @ApiPropertyOptional({ description: 'User-Agent 解析结果（JSON）' })
  @Column({ type: 'json', nullable: true })
  userAgent: Record<string, any> | null;

  @ApiPropertyOptional({ description: '提交者时区（如 Asia/Shanghai）' })
  @Column({ type: 'varchar', length: 40, nullable: true })
  timeZone: string | null;

  @ApiPropertyOptional({ description: '设备指纹' })
  @Column({ type: 'varchar', length: 64, nullable: true })
  deviceId: string | null;

  @ApiPropertyOptional({ description: '请求追踪 ID' })
  @Column({ type: 'varchar', length: 64, nullable: true })
  traceId: string | null;

  // ==================== 时间戳 ====================

  @ApiProperty({ description: '创建时间（提交时间）' })
  @CreateDateColumn({ name: 'createdAt', type: 'datetime', precision: 6 })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  @UpdateDateColumn({ name: 'updatedAt', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
