import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';
import { AdminRole } from '@/admin/roles/entities/role.entity';
import { AdminPermissionsService } from '@/admin/permissions/permissions.service';

interface ListQuery {
  keyword?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class AdminRolesService {
  constructor(
    @InjectRepository(AdminRole)
    private readonly roleRepo: Repository<AdminRole>,
    private readonly permissionsService: AdminPermissionsService,
  ) {}

  private rethrowUnique(e: any): never {
    const msg = String(e?.message ?? '');
    if (
      e?.code === 'ER_DUP_ENTRY' ||
      msg.includes('duplicate key') ||
      msg.includes('Unique') ||
      msg.includes('UNIQUE')
    ) {
      if (msg.includes('code')) throw new ConflictException('角色代码已存在');
      if (msg.includes('name')) throw new ConflictException('角色名称已存在');
      throw new ConflictException('角色已存在');
    }
    throw e;
  }

  // CREATE
  async create(data: Partial<AdminRole>): Promise<AdminRole> {
    try {
      const entity = this.roleRepo.create(data);
      return await this.roleRepo.save(entity);
    } catch (e) {
      this.rethrowUnique(e);
    }
  }

  // LIST with keyword/page/pageSize
  async findAll(q: ListQuery = {}) {
    const where = q.keyword
      ? [{ name: Like(`%${q.keyword}%`) }, { code: Like(`%${q.keyword}%`) }]
      : undefined;

    const [items, total] = await this.roleRepo.findAndCount({
      where,
      order: { id: 'DESC' },
      relations: ['permissions'],
      skip: ((q.page || 1) - 1) * (q.pageSize || 20),
      take: q.pageSize || 20,
    });

    return { total, items, page: q.page || 1, pageSize: q.pageSize || 20 };
  }

  // DETAIL
  async findOne(id: number): Promise<AdminRole> {
    const role = await this.roleRepo.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!role) throw new NotFoundException(`Role(${id}) 不存在`);
    return role;
  }

  async findByIds(roleIds: number[]): Promise<AdminRole[]> {
    if (!roleIds?.length) return [];
    return this.roleRepo.find({
      where: { id: In(roleIds) },
      relations: ['permissions'],
    });
  }

  async findByCode(code: string): Promise<AdminRole> {
    const role = await this.roleRepo.findOne({
      where: { code },
      relations: ['permissions'],
    });
    if (!role) throw new NotFoundException(`Role(code=${code}) 不存在`);
    return role;
  }

  // UPDATE
  async update(id: number, updateData: Partial<AdminRole>): Promise<AdminRole> {
    const role = await this.findOne(id);
    Object.assign(role, updateData);
    try {
      return await this.roleRepo.save(role);
    } catch (e) {
      this.rethrowUnique(e);
    }
  }

  // DELETE
  async remove(id: number): Promise<{ affected: number }> {
    const res = await this.roleRepo.delete(id);
    if (!res.affected)
      throw new NotFoundException(`Role(${id}) 不存在或已删除`);
    return { affected: res.affected };
  }

  async batchRemove(ids: number[]): Promise<{ affected: number }> {
    if (!Array.isArray(ids) || ids.length === 0)
      throw new BadRequestException('ids 不能为空');
    const res = await this.roleRepo.delete(ids);
    return { affected: res.affected || 0 };
  }

  // ASSIGN PERMISSIONS
  async assignPermissions(
    roleId: number,
    permissionIds: number[],
  ): Promise<AdminRole> {
    if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
      throw new BadRequestException('permissionIds 不能为空');
    }
    const role = await this.findOne(roleId);
    const permissions = await this.permissionsService.findByIds(permissionIds);
    role.permissions = permissions;
    return this.roleRepo.save(role);
  }
}
