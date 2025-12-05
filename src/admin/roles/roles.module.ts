import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminRole } from '@/admin/roles/entities/role.entity';
import { AdminRolesService } from '@/admin/roles/roles.service';
import { AdminRolesController } from '@/admin/roles/roles.controller';
import { AdminPermissionsModule } from '@/admin/permissions/permissions.module';

@Module({
  imports: [TypeOrmModule.forFeature([AdminRole]), AdminPermissionsModule],
  providers: [AdminRolesService],
  controllers: [AdminRolesController],
  exports: [AdminRolesService],
})
export class AdminRolesModule {}
