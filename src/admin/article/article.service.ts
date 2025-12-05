// src/admin/article/article.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Like,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
  FindOptionsWhere,
} from 'typeorm';

import { Article } from './entities/article.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { QueryArticleDto } from './dto/query-article.dto';
import {
  ArticleListItemVO,
  ArticleDetailVO,
  ArticleListVO,
  ArticleStatsVO,
  PublicArticleListItemVO,
  PublicArticleDetailVO,
} from './vo/ArticleVO';
import { generateNumericUid } from '@/common/utils/uid-generator';
import { OperationLoggerService } from '@/admin/operation-logger/operation-logger.service';
import { OperationAction, ChangeLog } from '@/admin/operation-logger/types';
import { AdminAuthUser } from '@/types/payload.type';
import { ClientMeta } from '@/types/client-meta.type';

/**
 * 文章服务
 * 提供文章的 CRUD、查询、统计等功能
 */
@Injectable()
export class ArticleService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    private readonly opLogger: OperationLoggerService,
  ) {}

  // ==================== 操作日志辅助方法 ====================

  /**
   * 异步记录操作日志（不阻塞主流程）
   */
  private logOperation(params: {
    user: AdminAuthUser;
    client?: ClientMeta;
    action: OperationAction;
    targetId: string;
    description: string;
    changes?: ChangeLog;
  }) {
    const { user, client, action, targetId, description, changes } = params;

    this.opLogger.createAsync({
      adminId: user.id,
      adminUid: user.uid,
      adminUsername: user.username,
      module: '文章管理',
      action,
      targetType: 'ARTICLE',
      targetId,
      description,
      httpMethod: 'POST',
      requestPath: '/admin/articles',
      ip: client?.ip || '0.0.0.0',
      userAgent: client?.platform,
      traceId: client?.requestId,
      changes: changes || null,
    });
  }

  /**
   * 生成字段变更记录
   */
  private buildChanges(oldEntity: Article, dto: UpdateArticleDto): ChangeLog | undefined {
    const changes: ChangeLog = {};
    let hasChanges = false;

    const trackFields: Array<{ key: keyof UpdateArticleDto; label: string }> = [
      { key: 'title', label: '标题' },
      { key: 'subTitle', label: '子标题' },
      { key: 'summary', label: '摘要' },
      { key: 'status', label: '状态' },
      { key: 'categoryName', label: '分类' },
      { key: 'isTop', label: '置顶' },
      { key: 'isFeatured', label: '推荐' },
      { key: 'sortOrder', label: '排序权重' },
    ];

    for (const { key, label } of trackFields) {
      if (dto[key] !== undefined && dto[key] !== (oldEntity as any)[key]) {
        changes[label] = {
          old: (oldEntity as any)[key],
          new: dto[key],
        };
        hasChanges = true;
      }
    }

    // 内容变更只记录摘要
    if (dto.content !== undefined && dto.content !== oldEntity.content) {
      changes['内容'] = {
        summary: '文章内容已更新',
        old_hash: '',
        new_hash: '',
        size_change: `${dto.content.length - oldEntity.content.length > 0 ? '+' : ''}${dto.content.length - oldEntity.content.length} 字符`,
      };
      hasChanges = true;
    }

    return hasChanges ? changes : undefined;
  }

  // ==================== 转换方法 ====================

  /**
   * 实体转列表项 VO
   */
  private toListItemVO(entity: Article): ArticleListItemVO {
    return {
      id: entity.id,
      uid: entity.uid,
      title: entity.title,
      subTitle: entity.subTitle,
      summary: entity.summary,
      coverUrl: entity.coverUrl,
      categoryId: entity.categoryId,
      categoryName: entity.categoryName,
      tags: entity.tags,
      status: entity.status,
      isTop: Boolean(entity.isTop),
      isFeatured: Boolean(entity.isFeatured),
      sortOrder: entity.sortOrder,
      viewCount: entity.viewCount,
      likeCount: entity.likeCount,
      createdBy: entity.createdBy,
      createdByUsername: entity.createdByUsername,
      publishedAt: entity.publishedAt?.toISOString() || null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  /**
   * 实体转详情 VO
   */
  private toDetailVO(entity: Article): ArticleDetailVO {
    return {
      ...this.toListItemVO(entity),
      content: entity.content,
      contentFormat: entity.contentFormat,
      seoTitle: entity.seoTitle,
      seoKeywords: entity.seoKeywords,
      seoDescription: entity.seoDescription,
      createdByUid: entity.createdByUid,
      updatedBy: entity.updatedBy,
      updatedByUid: entity.updatedByUid,
      updatedByUsername: entity.updatedByUsername,
      isDeleted: Boolean(entity.isDeleted),
    };
  }

  /**
   * 实体转公开列表项 VO
   */
  private toPublicListItemVO(entity: Article): PublicArticleListItemVO {
    return {
      uid: entity.uid,
      title: entity.title,
      subTitle: entity.subTitle,
      summary: entity.summary,
      coverUrl: entity.coverUrl,
      categoryName: entity.categoryName,
      tags: entity.tags,
      isTop: Boolean(entity.isTop),
      isFeatured: Boolean(entity.isFeatured),
      viewCount: entity.viewCount,
      likeCount: entity.likeCount,
      publishedAt: entity.publishedAt?.toISOString() || null,
    };
  }

  /**
   * 实体转公开详情 VO
   */
  private toPublicDetailVO(entity: Article): PublicArticleDetailVO {
    return {
      ...this.toPublicListItemVO(entity),
      content: entity.content,
      contentFormat: entity.contentFormat,
      seoTitle: entity.seoTitle,
      seoKeywords: entity.seoKeywords,
      seoDescription: entity.seoDescription,
    };
  }

  // ==================== 创建方法 ====================

  /**
   * 创建文章
   */
  async create(
    dto: CreateArticleDto,
    user: AdminAuthUser,
    client?: ClientMeta,
  ): Promise<ArticleDetailVO> {
    const entity = this.articleRepo.create({
      uid: generateNumericUid(12),
      title: dto.title,
      subTitle: dto.subTitle || null,
      summary: dto.summary || '',
      content: dto.content,
      contentFormat: dto.contentFormat || 'markdown',
      coverUrl: dto.coverUrl || null,
      categoryId: dto.categoryId || null,
      categoryName: dto.categoryName || '',
      tags: dto.tags || null,
      status: dto.status || 'draft',
      isTop: dto.isTop || false,
      isFeatured: dto.isFeatured || false,
      sortOrder: dto.sortOrder || 0,
      seoTitle: dto.seoTitle || '',
      seoKeywords: dto.seoKeywords || '',
      seoDescription: dto.seoDescription || '',
      createdBy: user.id,
      createdByUid: user.uid,
      createdByUsername: user.username,
      updatedBy: user.id,
      updatedByUid: user.uid,
      updatedByUsername: user.username,
      publishedAt: dto.status === 'published' ? new Date() : null,
    });

    const saved = await this.articleRepo.save(entity);

    // 记录操作日志
    this.logOperation({
      user,
      client,
      action: 'CREATE',
      targetId: String(saved.id),
      description: `创建文章「${saved.title}」`,
    });

    return this.toDetailVO(saved);
  }

  // ==================== 更新方法 ====================

  /**
   * 更新文章
   */
  async update(
    id: number,
    dto: UpdateArticleDto,
    user: AdminAuthUser,
    client?: ClientMeta,
  ): Promise<ArticleDetailVO> {
    const article = await this.findEntityById(id);

    // 生成变更记录
    const changes = this.buildChanges(article, dto);

    // 状态变更处理
    const statusChanged = dto.status !== undefined && dto.status !== article.status;
    const isPublishing = statusChanged && dto.status === 'published' && !article.publishedAt;

    // 更新字段
    const patch: Partial<Article> = {
      updatedBy: user.id,
      updatedByUid: user.uid,
      updatedByUsername: user.username,
    };

    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.subTitle !== undefined) patch.subTitle = dto.subTitle;
    if (dto.summary !== undefined) patch.summary = dto.summary;
    if (dto.content !== undefined) patch.content = dto.content;
    if (dto.contentFormat !== undefined) patch.contentFormat = dto.contentFormat;
    if (dto.coverUrl !== undefined) patch.coverUrl = dto.coverUrl;
    if (dto.categoryId !== undefined) patch.categoryId = dto.categoryId;
    if (dto.categoryName !== undefined) patch.categoryName = dto.categoryName;
    if (dto.tags !== undefined) patch.tags = dto.tags;
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.isTop !== undefined) patch.isTop = dto.isTop;
    if (dto.isFeatured !== undefined) patch.isFeatured = dto.isFeatured;
    if (dto.sortOrder !== undefined) patch.sortOrder = dto.sortOrder;
    if (dto.seoTitle !== undefined) patch.seoTitle = dto.seoTitle;
    if (dto.seoKeywords !== undefined) patch.seoKeywords = dto.seoKeywords;
    if (dto.seoDescription !== undefined) patch.seoDescription = dto.seoDescription;

    // 首次发布时设置发布时间
    if (isPublishing) {
      patch.publishedAt = new Date();
    }

    await this.articleRepo.update(id, patch);

    // 记录操作日志
    this.logOperation({
      user,
      client,
      action: 'UPDATE',
      targetId: String(id),
      description: `更新文章「${article.title}」`,
      changes,
    });

    return this.findOne(id);
  }

  /**
   * 发布文章
   */
  async publish(id: number, user: AdminAuthUser, client?: ClientMeta): Promise<ArticleDetailVO> {
    const article = await this.findEntityById(id);
    if (article.status === 'published') {
      throw new BadRequestException('文章已发布');
    }

    const oldStatus = article.status;

    await this.articleRepo.update(id, {
      status: 'published',
      publishedAt: article.publishedAt || new Date(),
      updatedBy: user.id,
      updatedByUid: user.uid,
      updatedByUsername: user.username,
    });

    // 记录操作日志
    this.logOperation({
      user,
      client,
      action: 'ENABLE',
      targetId: String(id),
      description: `发布文章「${article.title}」`,
      changes: { 状态: { old: oldStatus, new: 'published' } },
    });

    return this.findOne(id);
  }

  /**
   * 下线文章
   */
  async offline(id: number, user: AdminAuthUser, client?: ClientMeta): Promise<ArticleDetailVO> {
    const article = await this.findEntityById(id);
    if (article.status === 'offline') {
      throw new BadRequestException('文章已下线');
    }

    const oldStatus = article.status;

    await this.articleRepo.update(id, {
      status: 'offline',
      updatedBy: user.id,
      updatedByUid: user.uid,
      updatedByUsername: user.username,
    });

    // 记录操作日志
    this.logOperation({
      user,
      client,
      action: 'DISABLE',
      targetId: String(id),
      description: `下线文章「${article.title}」`,
      changes: { 状态: { old: oldStatus, new: 'offline' } },
    });

    return this.findOne(id);
  }

  /**
   * 设置/取消置顶
   */
  async setTop(
    id: number,
    isTop: boolean,
    user: AdminAuthUser,
    client?: ClientMeta,
  ): Promise<ArticleDetailVO> {
    const article = await this.findEntityById(id);
    const oldIsTop = article.isTop;

    await this.articleRepo.update(id, {
      isTop,
      updatedBy: user.id,
      updatedByUid: user.uid,
      updatedByUsername: user.username,
    });

    // 记录操作日志
    this.logOperation({
      user,
      client,
      action: 'UPDATE',
      targetId: String(id),
      description: isTop ? `置顶文章「${article.title}」` : `取消置顶文章「${article.title}」`,
      changes: { 置顶: { old: oldIsTop, new: isTop } },
    });

    return this.findOne(id);
  }

  /**
   * 设置/取消推荐
   */
  async setFeatured(
    id: number,
    isFeatured: boolean,
    user: AdminAuthUser,
    client?: ClientMeta,
  ): Promise<ArticleDetailVO> {
    const article = await this.findEntityById(id);
    const oldIsFeatured = article.isFeatured;

    await this.articleRepo.update(id, {
      isFeatured,
      updatedBy: user.id,
      updatedByUid: user.uid,
      updatedByUsername: user.username,
    });

    // 记录操作日志
    this.logOperation({
      user,
      client,
      action: 'UPDATE',
      targetId: String(id),
      description: isFeatured
        ? `设为推荐文章「${article.title}」`
        : `取消推荐文章「${article.title}」`,
      changes: { 推荐: { old: oldIsFeatured, new: isFeatured } },
    });

    return this.findOne(id);
  }

  // ==================== 删除方法 ====================

  /**
   * 软删除文章
   */
  async remove(
    id: number,
    user: AdminAuthUser,
    client?: ClientMeta,
  ): Promise<{ affected: number }> {
    const article = await this.findEntityById(id);

    await this.articleRepo.update(id, {
      isDeleted: true,
      updatedBy: user.id,
      updatedByUid: user.uid,
      updatedByUsername: user.username,
    });

    // 记录操作日志
    this.logOperation({
      user,
      client,
      action: 'DELETE',
      targetId: String(id),
      description: `删除文章「${article.title}」`,
    });

    return { affected: 1 };
  }

  /**
   * 批量软删除
   */
  async batchRemove(
    ids: number[],
    user: AdminAuthUser,
    client?: ClientMeta,
  ): Promise<{ affected: number }> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('ids 不能为空');
    }

    const result = await this.articleRepo
      .createQueryBuilder()
      .update(Article)
      .set({
        isDeleted: true,
        updatedBy: user.id,
        updatedByUid: user.uid,
        updatedByUsername: user.username,
      })
      .whereInIds(ids)
      .execute();

    // 记录操作日志
    this.logOperation({
      user,
      client,
      action: 'DELETE',
      targetId: ids.join(','),
      description: `批量删除 ${ids.length} 篇文章`,
    });

    return { affected: result.affected || 0 };
  }

  /**
   * 恢复已删除的文章
   */
  async restore(id: number, user: AdminAuthUser, client?: ClientMeta): Promise<ArticleDetailVO> {
    const article = await this.articleRepo.findOne({ where: { id } });
    if (!article) {
      throw new NotFoundException(`文章(${id})不存在`);
    }
    if (!article.isDeleted) {
      throw new BadRequestException('文章未被删除');
    }

    await this.articleRepo.update(id, {
      isDeleted: false,
      updatedBy: user.id,
      updatedByUid: user.uid,
      updatedByUsername: user.username,
    });

    // 记录操作日志
    this.logOperation({
      user,
      client,
      action: 'UPDATE',
      targetId: String(id),
      description: `恢复文章「${article.title}」`,
      changes: { 删除状态: { old: true, new: false } },
    });

    return this.findOne(id);
  }

  // ==================== 查询方法 ====================

  /**
   * 根据 ID 获取实体（内部使用）
   */
  private async findEntityById(id: number): Promise<Article> {
    const entity = await this.articleRepo.findOne({
      where: { id, isDeleted: false },
    });
    if (!entity) {
      throw new NotFoundException(`文章(${id})不存在`);
    }
    return entity;
  }

  /**
   * 根据 ID 查询详情
   */
  async findOne(id: number): Promise<ArticleDetailVO> {
    const entity = await this.findEntityById(id);
    return this.toDetailVO(entity);
  }

  /**
   * 根据 UID 查询详情
   */
  async findByUid(uid: string): Promise<ArticleDetailVO> {
    const entity = await this.articleRepo.findOne({
      where: { uid, isDeleted: false },
    });
    if (!entity) {
      throw new NotFoundException(`文章(${uid})不存在`);
    }
    return this.toDetailVO(entity);
  }

  /**
   * 分页查询文章列表
   */
  async findAll(query: QueryArticleDto): Promise<ArticleListVO> {
    const page = query.page || 1;
    const pageSize = Math.min(Math.max(query.pageSize || 20, 1), 100);
    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const where: FindOptionsWhere<Article> = {};

    // 默认不包含已删除
    if (!query.includeDeleted) {
      where.isDeleted = false;
    }

    if (query.status) {
      where.status = query.status;
    }
    if (query.categoryId !== undefined) {
      where.categoryId = query.categoryId;
    }
    if (query.isTop !== undefined) {
      where.isTop = query.isTop;
    }
    if (query.isFeatured !== undefined) {
      where.isFeatured = query.isFeatured;
    }
    if (query.createdBy !== undefined) {
      where.createdBy = query.createdBy;
    }

    // 时间范围
    if (query.startTime && query.endTime) {
      where.createdAt = Between(query.startTime, query.endTime);
    } else if (query.startTime) {
      where.createdAt = MoreThanOrEqual(query.startTime);
    } else if (query.endTime) {
      where.createdAt = LessThanOrEqual(query.endTime);
    }

    // 关键字搜索
    let whereConditions: FindOptionsWhere<Article>[] = [where];
    if (query.keyword) {
      const kw = `%${query.keyword}%`;
      whereConditions = [
        { ...where, title: Like(kw) },
        { ...where, summary: Like(kw) },
      ];
    }

    // 排序
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'DESC';

    const [items, total] = await this.articleRepo.findAndCount({
      where: whereConditions,
      order: { [sortBy]: sortOrder },
      skip,
      take: pageSize,
    });

    return {
      total,
      items: items.map((item) => this.toListItemVO(item)),
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // ==================== 统计方法 ====================

  /**
   * 获取文章统计数据
   */
  async getStats(): Promise<ArticleStatsVO> {
    const [totalCount, draftCount, publishedCount, offlineCount, topCount, featuredCount] =
      await Promise.all([
        this.articleRepo.count({ where: { isDeleted: false } }),
        this.articleRepo.count({ where: { isDeleted: false, status: 'draft' } }),
        this.articleRepo.count({ where: { isDeleted: false, status: 'published' } }),
        this.articleRepo.count({ where: { isDeleted: false, status: 'offline' } }),
        this.articleRepo.count({ where: { isDeleted: false, isTop: true } }),
        this.articleRepo.count({ where: { isDeleted: false, isFeatured: true } }),
      ]);

    // 总阅读量和点赞数
    const statsResult = await this.articleRepo
      .createQueryBuilder('article')
      .select('SUM(article.viewCount)', 'totalViewCount')
      .addSelect('SUM(article.likeCount)', 'totalLikeCount')
      .where('article.isDeleted = :isDeleted', { isDeleted: false })
      .getRawOne();

    // 分类统计
    const categoryStatsRaw = await this.articleRepo
      .createQueryBuilder('article')
      .select('article.categoryId', 'categoryId')
      .addSelect('article.categoryName', 'categoryName')
      .addSelect('COUNT(*)', 'count')
      .where('article.isDeleted = :isDeleted', { isDeleted: false })
      .groupBy('article.categoryId')
      .addGroupBy('article.categoryName')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      totalCount,
      draftCount,
      publishedCount,
      offlineCount,
      topCount,
      featuredCount,
      totalViewCount: parseInt(statsResult?.totalViewCount || '0', 10),
      totalLikeCount: parseInt(statsResult?.totalLikeCount || '0', 10),
      categoryStats: categoryStatsRaw.map((item) => ({
        categoryId: item.categoryId,
        categoryName: item.categoryName || '未分类',
        count: parseInt(item.count, 10),
      })),
    };
  }

  // ==================== 公开接口方法 ====================

  /**
   * 公开查询已发布的文章列表
   */
  async findPublished(
    query: QueryArticleDto,
  ): Promise<{ total: number; items: PublicArticleListItemVO[] }> {
    const page = query.page || 1;
    const pageSize = Math.min(Math.max(query.pageSize || 20, 1), 100);
    const skip = (page - 1) * pageSize;

    const where: FindOptionsWhere<Article> = {
      isDeleted: false,
      status: 'published',
    };

    if (query.categoryId !== undefined) {
      where.categoryId = query.categoryId;
    }

    let whereConditions: FindOptionsWhere<Article>[] = [where];
    if (query.keyword) {
      const kw = `%${query.keyword}%`;
      whereConditions = [
        { ...where, title: Like(kw) },
        { ...where, summary: Like(kw) },
      ];
    }

    const [items, total] = await this.articleRepo.findAndCount({
      where: whereConditions,
      order: { isTop: 'DESC', sortOrder: 'DESC', publishedAt: 'DESC' },
      skip,
      take: pageSize,
    });

    return {
      total,
      items: items.map((item) => this.toPublicListItemVO(item)),
    };
  }

  /**
   * 公开查询文章详情（并增加阅读量）
   */
  async findPublishedByUid(uid: string): Promise<PublicArticleDetailVO> {
    const entity = await this.articleRepo.findOne({
      where: { uid, isDeleted: false, status: 'published' },
    });
    if (!entity) {
      throw new NotFoundException('文章不存在或未发布');
    }

    // 异步增加阅读量
    this.articleRepo.increment({ id: entity.id }, 'viewCount', 1).catch(() => {});

    return this.toPublicDetailVO(entity);
  }

  /**
   * 点赞文章
   */
  async like(uid: string): Promise<{ likeCount: number }> {
    const entity = await this.articleRepo.findOne({
      where: { uid, isDeleted: false, status: 'published' },
    });
    if (!entity) {
      throw new NotFoundException('文章不存在或未发布');
    }

    await this.articleRepo.increment({ id: entity.id }, 'likeCount', 1);
    return { likeCount: entity.likeCount + 1 };
  }
}
