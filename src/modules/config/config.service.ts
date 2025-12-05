// src/modules/config/config.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

import { ModuleConfig } from '@/admin/module-config/entities/module-config.entity';
import { PublicConfigValueVO, PublicConfigItemVO } from './vo/ConfigVO';

/**
 * 用户端配置服务
 * 提供公开的配置读取功能
 */
@Injectable()
export class PublicConfigService {
  constructor(
    @InjectRepository(ModuleConfig)
    private readonly configRepo: Repository<ModuleConfig>,
  ) {}

  /**
   * 实体转配置项 VO
   */
  private toItemVO(entity: ModuleConfig): PublicConfigItemVO {
    return {
      itemKey: entity.itemKey,
      itemName: entity.itemName,
      itemType: entity.itemType,
      value: entity.value,
      options: entity.options,
      description: entity.description,
    };
  }

  /**
   * 实体转配置值 VO
   */
  private toValueVO(entity: ModuleConfig): PublicConfigValueVO {
    return {
      itemKey: entity.itemKey,
      value: entity.value,
      itemType: entity.itemType,
    };
  }

  /**
   * 获取指定模块的所有启用配置
   */
  async findByModule(moduleCode: string): Promise<PublicConfigItemVO[]> {
    const items = await this.configRepo.find({
      where: {
        moduleCode,
        isDeleted: false,
        status: 'enabled',
      },
      order: { sortOrder: 'DESC', id: 'ASC' },
    });
    return items.map((item) => this.toItemVO(item));
  }

  /**
   * 获取指定模块的配置值列表
   */
  async getModuleValues(moduleCode: string): Promise<PublicConfigValueVO[]> {
    const items = await this.configRepo.find({
      where: {
        moduleCode,
        isDeleted: false,
        status: 'enabled',
      },
      select: ['itemKey', 'value', 'itemType'],
    });
    return items.map((item) => this.toValueVO(item));
  }

  /**
   * 获取单个配置值
   */
  async getValue(moduleCode: string, itemKey: string): Promise<string | null> {
    const entity = await this.configRepo.findOne({
      where: {
        moduleCode,
        itemKey,
        isDeleted: false,
        status: 'enabled',
      },
      select: ['value'],
    });
    return entity?.value ?? null;
  }

  /**
   * 批量获取配置值
   */
  async getBatchValues(
    moduleCode: string,
    itemKeys: string[],
  ): Promise<Record<string, string | null>> {
    if (!itemKeys || itemKeys.length === 0) {
      return {};
    }

    const items = await this.configRepo.find({
      where: {
        moduleCode,
        itemKey: In(itemKeys),
        isDeleted: false,
        status: 'enabled',
      },
      select: ['itemKey', 'value'],
    });

    const result: Record<string, string | null> = {};
    for (const key of itemKeys) {
      const item = items.find((i) => i.itemKey === key);
      result[key] = item?.value ?? null;
    }
    return result;
  }

  /**
   * 获取配置值（带类型转换）
   */
  async getTypedValue<T = string>(
    moduleCode: string,
    itemKey: string,
    defaultValue: T,
  ): Promise<T> {
    const entity = await this.configRepo.findOne({
      where: {
        moduleCode,
        itemKey,
        isDeleted: false,
        status: 'enabled',
      },
      select: ['value', 'itemType'],
    });

    if (!entity) {
      return defaultValue;
    }

    const { value, itemType } = entity;

    try {
      switch (itemType) {
        case 'number':
          return Number(value) as T;
        case 'switch':
          return (value === 'true' || value === '1') as T;
        case 'json':
          return JSON.parse(value) as T;
        default:
          return value as T;
      }
    } catch {
      return defaultValue;
    }
  }
}
