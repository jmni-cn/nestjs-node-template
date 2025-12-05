import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminUser } from './entities/admin-user.entity';
import { AdminRolesModule } from '../roles/roles.module';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminPermissionsModule } from '../permissions/permissions.module';
import { AdminSession } from './entities/admin-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminUser, AdminSession]),
    AdminRolesModule,
    AdminPermissionsModule,
  ],
  controllers: [AdminUsersController],
  providers: [AdminUsersService],
  exports: [AdminUsersService],
})
export class AdminUsersModule {}
