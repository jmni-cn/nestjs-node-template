// src/admin/module-config/module-config.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere, In } from 'typeorm';

import { ModuleConfig } from './entities/module-config.entity';
import { CreateModuleConfigDto } from './dto/create-module-config.dto';
import { UpdateModuleConfigDto } from './dto/update-module-config.dto';
import { QueryModuleConfigDto } from './dto/query-module-config.dto';
import {
  ModuleConfigListItemVO,
  ModuleConfigDetailVO,
  ModuleConfigListVO,
  ModuleConfigStatsVO,
  ModuleConfigGroupVO,
  ModuleConfigValueVO,
} from './vo/ModuleConfigVO';
import { generateNumericUid } from '@/common/utils/uid-generator';
import { OperationLoggerService } from '@/admin/operation-logger/operation-logger.service';
import { OperationAction, ChangeLog } from '@/admin/operation-logger/types';
import { AdminAuthUser } from '@/types/payload.type';
import { ClientMeta } from '@/types/client-meta.type';

/**
 * 模块配置服务
 * 提供模块级别配置的 CRUD、查询、统计等功能
 */
@Injectable()
export class ModuleConfigService {
  constructor(
    @InjectRepository(ModuleConfig)
    private readonly configRepo: Repository<ModuleConfig>,
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
      module: '模块配置',
      action,
      targetType: 'CONFIG',
      targetId,
      description,
      httpMethod: 'POST',
      requestPath: '/admin/module-config',
      ip: client?.ip || '0.0.0.0',
      userAgent: client?.platform,
      traceId: client?.requestId,
      changes: changes || null,
    });
  }

  /**
   * 生成字段变更记录
   */
  private buildChanges(oldEntity: ModuleConfig, dto: UpdateModuleConfigDto): ChangeLog | undefined {
    const changes: ChangeLog = {};
    let hasChanges = false;

    const trackFields: Array<{ key: keyof UpdateModuleConfigDto; label: string }> = [
      { key: 'moduleName', label: '模块名称' },
      { key: 'itemName', label: '配置项名称' },
      { key: 'itemType', label: '配置项类型' },
      { key: 'value', label: '配置值' },
      { key: 'defaultValue', label: '默认值' },
      { key: 'status', label: '状态' },
      { key: 'description', label: '说明' },
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

    // options 变更
    if (dto.options !== undefined) {
      const oldOptions = JSON.stringify(oldEntity.options || []);
      const newOptions = JSON.stringify(dto.options || []);
      if (oldOptions !== newOptions) {
        changes['可选值列表'] = {
          summary: '可选值列表已更新',
          old_hash: '',
          new_hash: '',
          size_change: '',
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
  private toListItemVO(entity: ModuleConfig): ModuleConfigListItemVO {
    return {
      id: entity.id,
      uid: entity.uid,
      moduleCode: entity.moduleCode,
      moduleName: entity.moduleName,
      itemKey: entity.itemKey,
      itemName: entity.itemName,
      itemType: entity.itemType,
      value: entity.value,
      defaultValue: entity.defaultValue,
      status: entity.status,
      description: entity.description,
      sortOrder: entity.sortOrder,
      isSystem: Boolean(entity.isSystem),
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  /**
   * 实体转详情 VO
   */
  private toDetailVO(entity: ModuleConfig): ModuleConfigDetailVO {
    return {
      ...this.toListItemVO(entity),
      options: entity.options,
      remark: entity.remark,
      createdBy: entity.createdBy,
      createdByUid: entity.createdByUid,
      createdByUsername: entity.createdByUsername,
      updatedBy: entity.updatedBy,
      updatedByUid: entity.updatedByUid,
      updatedByUsername: entity.updatedByUsername,
      isDeleted: Boolean(entity.isDeleted),
    };
  }

  /**
   * 实体转简化配置值 VO
   */
  private toValueVO(entity: ModuleConfig): ModuleConfigValueVO {
    return {
      itemKey: entity.itemKey,
      value: entity.value,
      itemType: entity.itemType,
      enabled: entity.status === 'enabled',
    };
  }

  // ==================== 创建方法 ====================

  /**
   * 创建配置项
   */
  async create(
    dto: CreateModuleConfigDto,
    user: AdminAuthUser,
    client?: ClientMeta,
  ): Promise<ModuleConfigDetailVO> {
    // 检查 moduleCode + itemKey 唯一性
    const existing = await this.configRepo.findOne({
      where: {
        moduleCode: dto.moduleCode,
        itemKey: dto.itemKey,
        isDeleted: false,
      },
    });
    if (existing) {
      throw new ConflictException(`配置项 [${dto.moduleCode}.${dto.itemKey}] 已存在`);
    }

    const entity = this.configRepo.create({
      uid: generateNumericUid(12),
      moduleCode: dto.moduleCode,
      moduleName: dto.moduleName || '',
      itemKey: dto.itemKey,
      itemName: dto.itemName || '',
      itemType: dto.itemType || 'text',
      value: dto.value,
      defaultValue: dto.defaultValue || null,
      options: dto.options || null,
      status: dto.status || 'enabled',
      description: dto.description || '',
      remark: dto.remark || '',
      sortOrder: dto.sortOrder || 0,
      isSystem: dto.isSystem || false,
      createdBy: user.id,
      createdByUid: user.uid,
      createdByUsername: user.username,
      updatedBy: user.id,
      updatedByUid: user.uid,
      updatedByUsername: user.username,
    });

    const saved = await this.configRepo.save(entity);

    // 记录操作日志
    this.logOperation({
      user,
      client,
      action: 'CREATE',
      targetId: String(saved.id),
      description: `创建配置项「${dto.moduleCode}.${dto.itemKey}」`,
    });

    return this.toDetailVO(saved);
  }

  // ==================== 更新方法 ====================

  /**
   * 更新配置项
   */
  async update(
    id: number,
    dto: UpdateModuleConfigDto,
    user: AdminAuthUser,
    client?: ClientMeta,
  ): Promise<ModuleConfigDetailVO> {
    const config = await this.findEntityById(id);

    // 生成变更记录
    const changes = this.buildChanges(config, dto);

    // 更新字段
    const patch: Partial<ModuleConfig> = {
      updatedBy: user.id,
      updatedByUid: user.uid,
      updatedByUsername: user.username,
    };

    if (dto.moduleName !== undefined) patch.moduleName = dto.moduleName;
    if (dto.itemName !== undefined) patch.itemName = dto.itemName;
    if (dto.itemType !== undefined) patch.itemType = dto.itemType;
    if (dto.value !== undefined) patch.value = dto.value;
    if (dto.defaultValue !== undefined) patch.defaultValue = dto.defaultValue;
    if (dto.options !== undefined) patch.options = dto.options;
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.remark !== undefined) patch.remark = dto.remark;
    if (dto.sortOrder !== undefined) patch.sortOrder = dto.sortOrder;

    await this.configRepo.update(id, patch);

    // 记录操作日志
    this.logOperation({
      user,
      client,
      action: 'UPDATE',
      targetId: String(id),
      description: `更新配置项「${config.moduleCode}.${config.itemKey}」`,
      changes,
    });

    return this.findOne(id);
  }

  /**
   * 更新配置值（简化方法，仅更新 value）
   */
  async updateValue(
    id: number,
    value: string,
    user: AdminAuthUser,
    client?: ClientMeta,
  ): Promise<ModuleConfigDetailVO> {
    const config = await this.findEntityById(id);
    const oldValue = config.value;

    await this.configRepo.update(id, {
      value,
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
      description: `更新配置项「${config.moduleCode}.${config.itemKey}」的值`,
      changes: { 配置值: { old: oldValue, new: value } },
    });

    return this.findOne(id);
  }

  /**
   * 启用配置项
   */
  async enable(
    id: number,
    user: AdminAuthUser,
    client?: ClientMeta,
  ): Promise<ModuleConfigDetailVO> {
    const config = await this.findEntityById(id);
    if (config.status === 'enabled') {
      throw new BadRequestException('配置项已是启用状态');
    }

    await this.configRepo.update(id, {
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
      description: `启用配置项「${config.moduleCode}.${config.itemKey}」`,
      changes: { 状态: { old: 'disabled', new: 'enabled' } },
    });

    return this.findOne(id);
  }

  /**
   * 禁用配置项
   */
  async disable(
    id: number,
    user: AdminAuthUser,
    client?: ClientMeta,
  ): Promise<ModuleConfigDetailVO> {
    const config = await this.findEntityById(id);
    if (config.status === 'disabled') {
      throw new BadRequestException('配置项已是禁用状态');
    }

    await this.configRepo.update(id, {
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
      description: `禁用配置项「${config.moduleCode}.${config.itemKey}」`,
      changes: { 状态: { old: 'enabled', new: 'disabled' } },
    });

    return this.findOne(id);
  }

  /**
   * 重置为默认值
   */
  async resetToDefault(
    id: number,
    user: AdminAuthUser,
    client?: ClientMeta,
  ): Promise<ModuleConfigDetailVO> {
    const config = await this.findEntityById(id);
    if (config.defaultValue === null) {
      throw new BadRequestException('该配置项没有设置默认值');
    }

    const oldValue = config.value;

    await this.configRepo.update(id, {
      value: config.defaultValue,
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
      description: `重置配置项「${config.moduleCode}.${config.itemKey}」为默认值`,
      changes: { 配置值: { old: oldValue, new: config.defaultValue } },
    });

    return this.findOne(id);
  }

  // ==================== 删除方法 ====================

  /**
   * 软删除配置项
   */
  async remove(
    id: number,
    user: AdminAuthUser,
    client?: ClientMeta,
  ): Promise<{ affected: number }> {
    const config = await this.findEntityById(id);

    // 系统内置配置不可删除
    if (config.isSystem) {
      throw new BadRequestException('系统内置配置不可删除');
    }

    await this.configRepo.update(id, {
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
      description: `删除配置项「${config.moduleCode}.${config.itemKey}」`,
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
  ): Promise<{ affected: number; skipped: number }> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('ids 不能为空');
    }

    // 过滤掉系统内置的配置
    const configs = await this.configRepo.find({
      where: { id: In(ids), isDeleted: false },
    });

    const deletableIds = configs.filter((c) => !c.isSystem).map((c) => c.id);
    const skippedCount = ids.length - deletableIds.length;

    if (deletableIds.length === 0) {
      return { affected: 0, skipped: skippedCount };
    }

    const result = await this.configRepo
      .createQueryBuilder()
      .update(ModuleConfig)
      .set({
        isDeleted: true,
        updatedBy: user.id,
        updatedByUid: user.uid,
        updatedByUsername: user.username,
      })
      .whereInIds(deletableIds)
      .execute();

    // 记录操作日志
    this.logOperation({
      user,
      client,
      action: 'DELETE',
      targetId: deletableIds.join(','),
      description: `批量删除 ${deletableIds.length} 个配置项`,
    });

    return { affected: result.affected || 0, skipped: skippedCount };
  }

  /**
   * 恢复已删除的配置项
   */
  async restore(
    id: number,
    user: AdminAuthUser,
    client?: ClientMeta,
  ): Promise<ModuleConfigDetailVO> {
    const config = await this.configRepo.findOne({ where: { id } });
    if (!config) {
      throw new NotFoundException(`配置项(${id})不存在`);
    }
    if (!config.isDeleted) {
      throw new BadRequestException('配置项未被删除');
    }

    await this.configRepo.update(id, {
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
      description: `恢复配置项「${config.moduleCode}.${config.itemKey}」`,
      changes: { 删除状态: { old: true, new: false } },
    });

    return this.findOne(id);
  }

  // ==================== 查询方法 ====================

  /**
   * 根据 ID 获取实体（内部使用）
   */
  private async findEntityById(id: number): Promise<ModuleConfig> {
    const entity = await this.configRepo.findOne({
      where: { id, isDeleted: false },
    });
    if (!entity) {
      throw new NotFoundException(`配置项(${id})不存在`);
    }
    return entity;
  }

  /**
   * 根据 ID 查询详情
   */
  async findOne(id: number): Promise<ModuleConfigDetailVO> {
    const entity = await this.findEntityById(id);
    return this.toDetailVO(entity);
  }

  /**
   * 根据 UID 查询详情
   */
  async findByUid(uid: string): Promise<ModuleConfigDetailVO> {
    const entity = await this.configRepo.findOne({
      where: { uid, isDeleted: false },
    });
    if (!entity) {
      throw new NotFoundException(`配置项(${uid})不存在`);
    }
    return this.toDetailVO(entity);
  }

  /**
   * 根据 moduleCode + itemKey 查询
   */
  async findByKey(moduleCode: string, itemKey: string): Promise<ModuleConfigDetailVO> {
    const entity = await this.configRepo.findOne({
      where: { moduleCode, itemKey, isDeleted: false },
    });
    if (!entity) {
      throw new NotFoundException(`配置项 [${moduleCode}.${itemKey}] 不存在`);
    }
    return this.toDetailVO(entity);
  }

  /**
   * 获取配置值（快速方法）
   */
  async getValue(moduleCode: string, itemKey: string): Promise<string | null> {
    const entity = await this.configRepo.findOne({
      where: { moduleCode, itemKey, isDeleted: false, status: 'enabled' },
      select: ['value'],
    });
    return entity?.value ?? null;
  }

  /**
   * 分页查询配置列表
   */
  async findAll(query: QueryModuleConfigDto): Promise<ModuleConfigListVO> {
    const page = query.page || 1;
    const pageSize = Math.min(Math.max(query.pageSize || 20, 1), 100);
    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const where: FindOptionsWhere<ModuleConfig> = {};

    // 默认不包含已删除
    if (!query.includeDeleted) {
      where.isDeleted = false;
    }

    if (query.moduleCode) {
      where.moduleCode = query.moduleCode;
    }
    if (query.itemKey) {
      where.itemKey = query.itemKey;
    }
    if (query.itemType) {
      where.itemType = query.itemType;
    }
    if (query.status) {
      where.status = query.status;
    }

    // 关键字搜索
    let whereConditions: FindOptionsWhere<ModuleConfig>[] = [where];
    if (query.keyword) {
      const kw = `%${query.keyword}%`;
      whereConditions = [
        { ...where, moduleName: Like(kw) },
        { ...where, itemName: Like(kw) },
        { ...where, description: Like(kw) },
      ];
    }

    // 排序
    const sortBy = query.sortBy || 'sortOrder';
    const sortOrder = query.sortOrder || 'DESC';

    const [items, total] = await this.configRepo.findAndCount({
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
   * 获取某个模块的所有配置
   */
  async findByModule(moduleCode: string): Promise<ModuleConfigListItemVO[]> {
    const items = await this.configRepo.find({
      where: { moduleCode, isDeleted: false, status: 'enabled' },
      order: { sortOrder: 'DESC', id: 'ASC' },
    });
    return items.map((item) => this.toListItemVO(item));
  }

  /**
   * 获取某个模块的所有配置值（键值对形式）
   */
  async getModuleValues(moduleCode: string): Promise<ModuleConfigValueVO[]> {
    const items = await this.configRepo.find({
      where: { moduleCode, isDeleted: false },
      select: ['itemKey', 'value', 'itemType', 'status'],
    });
    return items.map((item) => this.toValueVO(item));
  }

  /**
   * 按模块分组获取所有配置
   */
  async findGroupedByModule(): Promise<ModuleConfigGroupVO[]> {
    const items = await this.configRepo.find({
      where: { isDeleted: false },
      order: { moduleCode: 'ASC', sortOrder: 'DESC', id: 'ASC' },
    });

    const groupMap = new Map<string, ModuleConfigGroupVO>();

    for (const item of items) {
      if (!groupMap.has(item.moduleCode)) {
        groupMap.set(item.moduleCode, {
          moduleCode: item.moduleCode,
          moduleName: item.moduleName,
          items: [],
        });
      }
      groupMap.get(item.moduleCode)!.items.push(this.toListItemVO(item));
    }

    return Array.from(groupMap.values());
  }

  // ==================== 统计方法 ====================

  /**
   * 获取配置统计数据
   */
  async getStats(): Promise<ModuleConfigStatsVO> {
    const [totalCount, enabledCount, disabledCount, systemCount] = await Promise.all([
      this.configRepo.count({ where: { isDeleted: false } }),
      this.configRepo.count({ where: { isDeleted: false, status: 'enabled' } }),
      this.configRepo.count({ where: { isDeleted: false, status: 'disabled' } }),
      this.configRepo.count({ where: { isDeleted: false, isSystem: true } }),
    ]);

    // 各模块配置统计
    const moduleStatsRaw = await this.configRepo
      .createQueryBuilder('config')
      .select('config.moduleCode', 'moduleCode')
      .addSelect('config.moduleName', 'moduleName')
      .addSelect('COUNT(*)', 'count')
      .where('config.isDeleted = :isDeleted', { isDeleted: false })
      .groupBy('config.moduleCode')
      .addGroupBy('config.moduleName')
      .orderBy('count', 'DESC')
      .getRawMany();

    return {
      totalCount,
      enabledCount,
      disabledCount,
      systemCount,
      moduleStats: moduleStatsRaw.map((item) => ({
        moduleCode: item.moduleCode,
        moduleName: item.moduleName || item.moduleCode,
        count: parseInt(item.count, 10),
      })),
    };
  }
}
