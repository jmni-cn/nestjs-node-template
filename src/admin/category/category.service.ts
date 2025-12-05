// src/admin/category/category.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere, IsNull, In } from 'typeorm';

import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';
import {
  CategoryListItemVO,
  CategoryDetailVO,
  CategoryListVO,
  CategoryStatsVO,
  CategoryTreeNodeVO,
  CategoryOptionVO,
} from './vo/CategoryVO';
import { generateNumericUid } from '@/common/utils/uid-generator';
import { OperationLoggerService } from '@/admin/operation-logger/operation-logger.service';
import { OperationAction, ChangeLog } from '@/admin/operation-logger/types';
import { AdminAuthUser } from '@/types/payload.type';
import { ClientMeta } from '@/types/client-meta.type';

/**
 * 分类服务
 * 提供分类的 CRUD、树形结构、查询、统计等功能
 */
@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
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
      module: '分类管理',
      action,
      targetType: 'CATEGORY',
      targetId,
      description,
      httpMethod: 'POST',
      requestPath: '/admin/category',
      ip: client?.ip || '0.0.0.0',
      userAgent: client?.platform,
      traceId: client?.requestId,
      changes: changes || null,
    });
  }

  /**
   * 生成字段变更记录
   */
  private buildChanges(oldEntity: Category, dto: UpdateCategoryDto): ChangeLog | undefined {
    const changes: ChangeLog = {};
    let hasChanges = false;

    const trackFields: Array<{ key: keyof UpdateCategoryDto; label: string }> = [
      { key: 'name', label: '名称' },
      { key: 'slug', label: 'URL 标识' },
      { key: 'description', label: '描述' },
      { key: 'icon', label: '图标' },
      { key: 'coverUrl', label: '封面图' },
      { key: 'parentId', label: '父分类' },
      { key: 'sortOrder', label: '排序权重' },
      { key: 'status', label: '状态' },
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

    return hasChanges ? changes : undefined;
  }

  // ==================== 转换方法 ====================

  /**
   * 实体转列表项 VO
   */
  private toListItemVO(entity: Category): CategoryListItemVO {
    return {
      id: entity.id,
      uid: entity.uid,
      moduleCode: entity.moduleCode,
      name: entity.name,
      slug: entity.slug,
      description: entity.description,
      icon: entity.icon,
      coverUrl: entity.coverUrl,
      parentId: entity.parentId,
      path: entity.path,
      level: entity.level,
      isLeaf: Boolean(entity.isLeaf),
      sortOrder: entity.sortOrder,
      status: entity.status,
      createdBy: entity.createdBy,
      createdByUsername: entity.createdByUsername,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  /**
   * 实体转详情 VO
   */
  private toDetailVO(entity: Category): CategoryDetailVO {
    return {
      ...this.toListItemVO(entity),
      createdByUid: entity.createdByUid,
      updatedBy: entity.updatedBy,
      updatedByUid: entity.updatedByUid,
      updatedByUsername: entity.updatedByUsername,
      isDeleted: Boolean(entity.isDeleted),
    };
  }

  /**
   * 实体转树节点 VO
   */
  private toTreeNodeVO(entity: Category, children?: CategoryTreeNodeVO[]): CategoryTreeNodeVO {
    return {
      ...this.toListItemVO(entity),
      children,
    };
  }

  /**
   * 实体转选项 VO
   */
  private toOptionVO(entity: Category): CategoryOptionVO {
    return {
      id: entity.id,
      name: entity.name,
      level: entity.level,
      parentId: entity.parentId,
      disabled: entity.status === 'disabled',
    };
  }

  // ==================== 路径计算方法 ====================

  /**
   * 计算分类路径和层级
   */
  private async calculatePathAndLevel(
    parentId: number | null,
  ): Promise<{ path: string; level: number }> {
    if (!parentId) {
      return { path: '', level: 0 };
    }

    const parent = await this.categoryRepo.findOne({
      where: { id: parentId, isDeleted: false },
      select: ['id', 'path', 'level'],
    });

    if (!parent) {
      throw new BadRequestException('父分类不存在');
    }

    return {
      path: `${parent.path}/${parent.id}`,
      level: parent.level + 1,
    };
  }

  /**
   * 更新父分类的 isLeaf 状态
   */
  private async updateParentLeafStatus(parentId: number | null): Promise<void> {
    if (!parentId) return;

    const childCount = await this.categoryRepo.count({
      where: { parentId, isDeleted: false },
    });

    await this.categoryRepo.update(parentId, { isLeaf: childCount === 0 });
  }

  // ==================== 创建方法 ====================

  /**
   * 创建分类
   */
  async create(
    dto: CreateCategoryDto,
    user: AdminAuthUser,
    client?: ClientMeta,
  ): Promise<CategoryDetailVO> {
    // 检查 slug 唯一性
    const existing = await this.categoryRepo.findOne({
      where: { moduleCode: dto.moduleCode, slug: dto.slug, isDeleted: false },
    });
    if (existing) {
      throw new ConflictException(`分类 slug [${dto.slug}] 在模块 [${dto.moduleCode}] 中已存在`);
    }

    // 计算路径和层级
    const { path, level } = await this.calculatePathAndLevel(dto.parentId || null);

    const entity = this.categoryRepo.create({
      uid: generateNumericUid(12),
      moduleCode: dto.moduleCode,
      name: dto.name,
      slug: dto.slug,
      description: dto.description || '',
      icon: dto.icon || null,
      coverUrl: dto.coverUrl || null,
      parentId: dto.parentId || null,
      path,
      level,
      isLeaf: true,
      sortOrder: dto.sortOrder || 0,
      status: dto.status || 'enabled',
      createdBy: user.id,
      createdByUid: user.uid,
      createdByUsername: user.username,
      updatedBy: user.id,
      updatedByUid: user.uid,
      updatedByUsername: user.username,
    });

    const saved = await this.categoryRepo.save(entity);

    // 更新父分类的 isLeaf 状态
    await this.updateParentLeafStatus(dto.parentId || null);

    // 记录操作日志
    this.logOperation({
      user,
      client,
      action: 'CREATE',
      targetId: String(saved.id),
      description: `创建分类「${saved.name}」(${dto.moduleCode})`,
    });

    return this.toDetailVO(saved);
  }

  // ==================== 更新方法 ====================

  /**
   * 更新分类
   */
  async update(
    id: number,
    dto: UpdateCategoryDto,
    user: AdminAuthUser,
    client?: ClientMeta,
  ): Promise<CategoryDetailVO> {
    const category = await this.findEntityById(id);

    // 生成变更记录
    const changes = this.buildChanges(category, dto);

    // 检查 slug 唯一性
    if (dto.slug && dto.slug !== category.slug) {
      const existing = await this.categoryRepo.findOne({
        where: { moduleCode: category.moduleCode, slug: dto.slug, isDeleted: false },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`分类 slug [${dto.slug}] 已存在`);
      }
    }

    // 处理父分类变更
    let pathChanged = false;
    let newPath = category.path;
    let newLevel = category.level;
    const oldParentId = category.parentId;

    if (dto.parentId !== undefined && dto.parentId !== category.parentId) {
      // 不能将分类移动到自己或其子分类下
      if (dto.parentId === id) {
        throw new BadRequestException('不能将分类移动到自己下面');
      }
      if (dto.parentId) {
        const newParent = await this.categoryRepo.findOne({
          where: { id: dto.parentId, isDeleted: false },
        });
        if (!newParent) {
          throw new BadRequestException('目标父分类不存在');
        }
        if (newParent.path.includes(`/${id}/`) || newParent.path.endsWith(`/${id}`)) {
          throw new BadRequestException('不能将分类移动到其子分类下');
        }
      }

      const calculated = await this.calculatePathAndLevel(dto.parentId);
      newPath = calculated.path;
      newLevel = calculated.level;
      pathChanged = true;
    }

    // 更新字段
    const patch: Partial<Category> = {
      updatedBy: user.id,
      updatedByUid: user.uid,
      updatedByUsername: user.username,
    };

    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.slug !== undefined) patch.slug = dto.slug;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.icon !== undefined) patch.icon = dto.icon;
    if (dto.coverUrl !== undefined) patch.coverUrl = dto.coverUrl;
    if (dto.parentId !== undefined) {
      patch.parentId = dto.parentId;
      patch.path = newPath;
      patch.level = newLevel;
    }
    if (dto.sortOrder !== undefined) patch.sortOrder = dto.sortOrder;
    if (dto.status !== undefined) patch.status = dto.status;

    await this.categoryRepo.update(id, patch);

    // 如果路径变更，需要更新所有子分类的路径
    if (pathChanged) {
      await this.updateChildrenPaths(id, newPath, newLevel);
      // 更新新旧父分类的 isLeaf 状态
      await this.updateParentLeafStatus(oldParentId);
      await this.updateParentLeafStatus(dto.parentId || null);
    }

    // 记录操作日志
    this.logOperation({
      user,
      client,
      action: 'UPDATE',
      targetId: String(id),
      description: `更新分类「${category.name}」`,
      changes,
    });

    return this.findOne(id);
  }

  /**
   * 更新子分类的路径
   */
  private async updateChildrenPaths(
    parentId: number,
    parentPath: string,
    parentLevel: number,
  ): Promise<void> {
    const children = await this.categoryRepo.find({
      where: { parentId, isDeleted: false },
    });

    for (const child of children) {
      const newPath = `${parentPath}/${parentId}`;
      const newLevel = parentLevel + 1;

      await this.categoryRepo.update(child.id, { path: newPath, level: newLevel });

      // 递归更新子分类的子分类
      await this.updateChildrenPaths(child.id, newPath, newLevel);
    }
  }

  /**
   * 启用分类
   */
  async enable(id: number, user: AdminAuthUser, client?: ClientMeta): Promise<CategoryDetailVO> {
    const category = await this.findEntityById(id);
    if (category.status === 'enabled') {
      throw new BadRequestException('分类已是启用状态');
    }

    await this.categoryRepo.update(id, {
      status: 'enabled',
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
      description: `启用分类「${category.name}」`,
      changes: { 状态: { old: 'disabled', new: 'enabled' } },
    });

    return this.findOne(id);
  }

  /**
   * 禁用分类
   */
  async disable(id: number, user: AdminAuthUser, client?: ClientMeta): Promise<CategoryDetailVO> {
    const category = await this.findEntityById(id);
    if (category.status === 'disabled') {
      throw new BadRequestException('分类已是禁用状态');
    }

    await this.categoryRepo.update(id, {
      status: 'disabled',
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
      description: `禁用分类「${category.name}」`,
      changes: { 状态: { old: 'enabled', new: 'disabled' } },
    });

    return this.findOne(id);
  }

  /**
   * 移动分类（更改父分类）
   */
  async move(
    id: number,
    newParentId: number | null,
    user: AdminAuthUser,
    client?: ClientMeta,
  ): Promise<CategoryDetailVO> {
    return this.update(id, { parentId: newParentId }, user, client);
  }

  // ==================== 删除方法 ====================

  /**
   * 软删除分类
   */
  async remove(
    id: number,
    user: AdminAuthUser,
    client?: ClientMeta,
  ): Promise<{ affected: number }> {
    const category = await this.findEntityById(id);

    // 检查是否有子分类
    const childCount = await this.categoryRepo.count({
      where: { parentId: id, isDeleted: false },
    });
    if (childCount > 0) {
      throw new BadRequestException('该分类下存在子分类，无法删除');
    }

    const oldParentId = category.parentId;

    await this.categoryRepo.update(id, {
      isDeleted: true,
      updatedBy: user.id,
      updatedByUid: user.uid,
      updatedByUsername: user.username,
    });

    // 更新父分类的 isLeaf 状态
    await this.updateParentLeafStatus(oldParentId);

    // 记录操作日志
    this.logOperation({
      user,
      client,
      action: 'DELETE',
      targetId: String(id),
      description: `删除分类「${category.name}」`,
    });

    return { affected: 1 };
  }

  /**
   * 批量软删除（只删除叶子节点）
   */
  async batchRemove(
    ids: number[],
    user: AdminAuthUser,
    client?: ClientMeta,
  ): Promise<{ affected: number; skipped: number }> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('ids 不能为空');
    }

    // 检查哪些是叶子节点
    const categories = await this.categoryRepo.find({
      where: { id: In(ids), isDeleted: false },
    });

    const leafIds: number[] = [];
    const parentIds = new Set<number | null>();

    for (const cat of categories) {
      const childCount = await this.categoryRepo.count({
        where: { parentId: cat.id, isDeleted: false },
      });
      if (childCount === 0) {
        leafIds.push(cat.id);
        parentIds.add(cat.parentId);
      }
    }

    if (leafIds.length === 0) {
      return { affected: 0, skipped: ids.length };
    }

    const result = await this.categoryRepo
      .createQueryBuilder()
      .update(Category)
      .set({
        isDeleted: true,
        updatedBy: user.id,
        updatedByUid: user.uid,
        updatedByUsername: user.username,
      })
      .whereInIds(leafIds)
      .execute();

    // 更新父分类的 isLeaf 状态
    for (const parentId of parentIds) {
      await this.updateParentLeafStatus(parentId);
    }

    // 记录操作日志
    this.logOperation({
      user,
      client,
      action: 'DELETE',
      targetId: leafIds.join(','),
      description: `批量删除 ${leafIds.length} 个分类`,
    });

    return { affected: result.affected || 0, skipped: ids.length - leafIds.length };
  }

  /**
   * 恢复已删除的分类
   */
  async restore(id: number, user: AdminAuthUser, client?: ClientMeta): Promise<CategoryDetailVO> {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`分类(${id})不存在`);
    }
    if (!category.isDeleted) {
      throw new BadRequestException('分类未被删除');
    }

    await this.categoryRepo.update(id, {
      isDeleted: false,
      updatedBy: user.id,
      updatedByUid: user.uid,
      updatedByUsername: user.username,
    });

    // 更新父分类的 isLeaf 状态
    await this.updateParentLeafStatus(category.parentId);

    // 记录操作日志
    this.logOperation({
      user,
      client,
      action: 'UPDATE',
      targetId: String(id),
      description: `恢复分类「${category.name}」`,
      changes: { 删除状态: { old: true, new: false } },
    });

    return this.findOne(id);
  }

  // ==================== 查询方法 ====================

  /**
   * 根据 ID 获取实体（内部使用）
   */
  private async findEntityById(id: number): Promise<Category> {
    const entity = await this.categoryRepo.findOne({
      where: { id, isDeleted: false },
    });
    if (!entity) {
      throw new NotFoundException(`分类(${id})不存在`);
    }
    return entity;
  }

  /**
   * 根据 ID 查询详情
   */
  async findOne(id: number): Promise<CategoryDetailVO> {
    const entity = await this.findEntityById(id);
    return this.toDetailVO(entity);
  }

  /**
   * 根据 UID 查询详情
   */
  async findByUid(uid: string): Promise<CategoryDetailVO> {
    const entity = await this.categoryRepo.findOne({
      where: { uid, isDeleted: false },
    });
    if (!entity) {
      throw new NotFoundException(`分类(${uid})不存在`);
    }
    return this.toDetailVO(entity);
  }

  /**
   * 根据 moduleCode + slug 查询
   */
  async findBySlug(moduleCode: string, slug: string): Promise<CategoryDetailVO> {
    const entity = await this.categoryRepo.findOne({
      where: { moduleCode, slug, isDeleted: false },
    });
    if (!entity) {
      throw new NotFoundException(`分类 [${moduleCode}/${slug}] 不存在`);
    }
    return this.toDetailVO(entity);
  }

  /**
   * 分页查询分类列表
   */
  async findAll(query: QueryCategoryDto): Promise<CategoryListVO> {
    const page = query.page || 1;
    const pageSize = Math.min(Math.max(query.pageSize || 20, 1), 100);
    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const where: FindOptionsWhere<Category> = {};

    if (!query.includeDeleted) {
      where.isDeleted = false;
    }

    if (query.moduleCode) {
      where.moduleCode = query.moduleCode;
    }
    if (query.parentId !== undefined) {
      where.parentId = query.parentId === 0 ? IsNull() : query.parentId;
    }
    if (query.status) {
      where.status = query.status;
    }

    // 关键字搜索
    let whereConditions: FindOptionsWhere<Category>[] = [where];
    if (query.keyword) {
      const kw = `%${query.keyword}%`;
      whereConditions = [{ ...where, name: Like(kw) }];
    }

    // 排序
    const sortBy = query.sortBy || 'sortOrder';
    const sortOrder = query.sortOrder || 'DESC';

    const [items, total] = await this.categoryRepo.findAndCount({
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

  /**
   * 获取指定模块的分类树
   */
  async getTree(moduleCode: string, onlyEnabled = false): Promise<CategoryTreeNodeVO[]> {
    const where: FindOptionsWhere<Category> = {
      moduleCode,
      isDeleted: false,
    };
    if (onlyEnabled) {
      where.status = 'enabled';
    }

    const allCategories = await this.categoryRepo.find({
      where,
      order: { sortOrder: 'DESC', id: 'ASC' },
    });

    // 构建树形结构
    const map = new Map<number, CategoryTreeNodeVO>();
    const roots: CategoryTreeNodeVO[] = [];

    // 先转换为 VO
    for (const cat of allCategories) {
      map.set(cat.id, this.toTreeNodeVO(cat, []));
    }

    // 构建父子关系
    for (const cat of allCategories) {
      const node = map.get(cat.id)!;
      if (cat.parentId && map.has(cat.parentId)) {
        const parent = map.get(cat.parentId)!;
        parent.children = parent.children || [];
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  /**
   * 获取分类选项列表（用于下拉选择）
   */
  async getOptions(moduleCode: string): Promise<CategoryOptionVO[]> {
    const categories = await this.categoryRepo.find({
      where: { moduleCode, isDeleted: false },
      order: { level: 'ASC', sortOrder: 'DESC', id: 'ASC' },
      select: ['id', 'name', 'level', 'parentId', 'status'],
    });

    return categories.map((cat) => this.toOptionVO(cat));
  }

  // ==================== 统计方法 ====================

  /**
   * 获取分类统计数据
   */
  async getStats(): Promise<CategoryStatsVO> {
    const [totalCount, enabledCount, disabledCount, rootCount] = await Promise.all([
      this.categoryRepo.count({ where: { isDeleted: false } }),
      this.categoryRepo.count({ where: { isDeleted: false, status: 'enabled' } }),
      this.categoryRepo.count({ where: { isDeleted: false, status: 'disabled' } }),
      this.categoryRepo.count({ where: { isDeleted: false, parentId: IsNull() } }),
    ]);

    // 各模块分类统计
    const moduleStatsRaw = await this.categoryRepo
      .createQueryBuilder('category')
      .select('category.moduleCode', 'moduleCode')
      .addSelect('COUNT(*)', 'count')
      .where('category.isDeleted = :isDeleted', { isDeleted: false })
      .groupBy('category.moduleCode')
      .orderBy('count', 'DESC')
      .getRawMany();

    return {
      totalCount,
      enabledCount,
      disabledCount,
      rootCount,
      moduleStats: moduleStatsRaw.map((item) => ({
        moduleCode: item.moduleCode,
        count: parseInt(item.count, 10),
      })),
    };
  }
}
