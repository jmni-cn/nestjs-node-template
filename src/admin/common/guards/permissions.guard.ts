import { AdminAuthUser } from '@/types/payload.type';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AdminAuthUser | undefined;

    if (!user) throw new ForbiddenException('Unauthorized');
    if (user.isAdmin) return true; // 管理员直通（可按需删除）

    // OR 语义
    const ok =
      requiredPermissions.length === 0 ||
      requiredPermissions.some((p) => user.permissions.includes(p));
    if (!ok) throw new ForbiddenException('Insufficient permissions');
    return true;

    // // 获取用户所有权限
    // const userPermissions = user.permissions

    // // 检查用户是否拥有所有所需权限
    // const hasAllPermissions = requiredPermissions.every(permission =>
    //   userPermissions.includes(permission)
    // );

    // if (!hasAllPermissions) {
    //   throw new ForbiddenException('权限不足');
    // }

    // return true;
  }
}
