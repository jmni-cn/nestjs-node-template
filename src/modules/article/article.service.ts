// src/modules/article/article.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';

import { Article } from '@/admin/article/entities/article.entity';
import {
  PublicArticleListVO,
  PublicArticleListItemVO,
  PublicArticleDetailVO,
} from './vo/ArticleVO';
import { QueryPublicArticleDto } from './dto/query-article.dto';

/**
 * 用户端文章服务
 * 提供公开的文章读取功能
 */
@Injectable()
export class PublicArticleService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
  ) {}

  /**
   * 实体转公开列表项 VO
   */
  private toListItemVO(entity: Article): PublicArticleListItemVO {
    return {
      uid: entity.uid,
      title: entity.title,
      subTitle: entity.subTitle,
      summary: entity.summary,
      coverUrl: entity.coverUrl,
      categoryId: entity.categoryId,
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
  private toDetailVO(entity: Article): PublicArticleDetailVO {
    return {
      ...this.toListItemVO(entity),
      content: entity.content,
      contentFormat: entity.contentFormat,
      seoTitle: entity.seoTitle,
      seoKeywords: entity.seoKeywords,
      seoDescription: entity.seoDescription,
    };
  }

  /**
   * 查询已发布的文章列表
   */
  async findPublished(query: QueryPublicArticleDto): Promise<PublicArticleListVO> {
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

    // 关键字搜索
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
      items: items.map((item) => this.toListItemVO(item)),
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取推荐文章
   */
  async findFeatured(limit: number = 10): Promise<PublicArticleListItemVO[]> {
    const items = await this.articleRepo.find({
      where: { isDeleted: false, status: 'published', isFeatured: true },
      order: { sortOrder: 'DESC', publishedAt: 'DESC' },
      take: limit,
    });
    return items.map((item) => this.toListItemVO(item));
  }

  /**
   * 获取置顶文章
   */
  async findTop(limit: number = 5): Promise<PublicArticleListItemVO[]> {
    const items = await this.articleRepo.find({
      where: { isDeleted: false, status: 'published', isTop: true },
      order: { sortOrder: 'DESC', publishedAt: 'DESC' },
      take: limit,
    });
    return items.map((item) => this.toListItemVO(item));
  }

  /**
   * 根据 UID 获取已发布文章详情（并增加阅读量）
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

    return this.toDetailVO(entity);
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
