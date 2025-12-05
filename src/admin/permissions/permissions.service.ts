import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { AdminPermission } from '@/admin/permissions/entities/permission.entity';

interface ListQuery {
  keyword?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class AdminPermissionsService {
  constructor(
    @InjectRepository(AdminPermission)
    private readonly permissionRepo: Repository<AdminPermission>,
  ) {}

  private rethrowUnique(e: any): never {
    const msg = String(e?.message ?? '');
    if (
      e?.code === 'ER_DUP_ENTRY' ||
      msg.includes('duplicate key') ||
      msg.includes('Unique') ||
      msg.includes('UNIQUE')
    ) {
      if (msg.includes('name')) throw new ConflictException('权限名称已存在');
      if (msg.includes('code')) throw new ConflictException('权限代码已存在');
      throw new ConflictException('权限已存在');
    }
    throw e;
  }

  async create(data: Partial<AdminPermission>): Promise<AdminPermission> {
    try {
      if (data.type === 'api') {
        if (!data.http_method || !data.http_path) {
          throw new BadRequestException(
            'API 类型权限必须提供 http_method 与 http_path',
          );
        }
      }

      const entity = this.permissionRepo.create(data);
      return await this.permissionRepo.save(entity);
    } catch (e) {
      this.rethrowUnique(e);
    }
  }

  async findAll(q: ListQuery = {}) {
    const where = q.keyword
      ? [{ name: ILike(`%${q.keyword}%`) }, { code: ILike(`%${q.keyword}%`) }]
      : undefined;

    const [items, total] = await this.permissionRepo.findAndCount({
      where,
      order: { id: 'DESC' },
      skip: ((q.page || 1) - 1) * (q.pageSize || 20),
      take: q.pageSize || 20,
    });

    return { total, items, page: q.page || 1, pageSize: q.pageSize || 20 };
  }

  async findOne(id: number): Promise<AdminPermission> {
    const entity = await this.permissionRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Permission(${id}) 不存在`);
    return entity;
  }

  /** 兼容 TypeORM v0.3：用 In(ids) 替代 findByIds */
  async findByIds(ids: number[]): Promise<AdminPermission[]> {
    if (!ids?.length) return [];
    return this.permissionRepo.find({ where: { id: In(ids) } });
  }

  async findByCode(code: string): Promise<AdminPermission> {
    const entity = await this.permissionRepo.findOne({ where: { code } });
    if (!entity) throw new NotFoundException(`Permission code(${code}) 不存在`);
    return entity;
  }

  async update(
    id: number,
    updateData: Partial<AdminPermission>,
  ): Promise<AdminPermission> {
    const entity = await this.findOne(id);
    const finalType = updateData.type ?? entity.type;
    if (finalType === 'api') {
      const method = updateData.http_method ?? entity.http_method;
      const path = updateData.http_path ?? entity.http_path;
      if (!method || !path) {
        throw new BadRequestException(
          'API 类型权限必须具备合法的 http_method 与 http_path',
        );
      }
    }

    Object.assign(entity, updateData);
    try {
      return await this.permissionRepo.save(entity);
    } catch (e) {
      this.rethrowUnique(e);
    }
  }

  async remove(id: number): Promise<{ affected: number }> {
    const res = await this.permissionRepo.delete(id);
    if (!res.affected)
      throw new NotFoundException(`Permission(${id}) 不存在或已删除`);
    return { affected: res.affected };
  }

  async batchRemove(ids: number[]): Promise<{ affected: number }> {
    if (!Array.isArray(ids) || ids.length === 0)
      throw new BadRequestException('ids 不能为空');
    const res = await this.permissionRepo.delete(ids);
    return { affected: res.affected || 0 };
  }
}
