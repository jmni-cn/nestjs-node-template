import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPermission } from '@/admin/permissions/entities/permission.entity';
import { AdminPermissionsService } from '@/admin/permissions/permissions.service';
import { AdminPermissionsController } from '@/admin/permissions/permissions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AdminPermission])],
  providers: [AdminPermissionsService],
  controllers: [AdminPermissionsController],
  exports: [AdminPermissionsService],
})
export class AdminPermissionsModule {}
