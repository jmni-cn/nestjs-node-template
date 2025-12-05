// src/admin/credentials/credentials.controller.ts
import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminCredentialsService } from './credentials.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';
import { RotateCredentialDto } from './dto/rotate-credential.dto';
import { RevokeCredentialDto } from './dto/revoke-credential.dto';
// 可接入你的 AdminJwtAuthGuard / PermissionsGuard
// import { AdminJwtAuthGuard } from '@/admin/auth/admin-jwt.guard';
// import { PermissionsGuard } from '@/admin/common/guards/permissions.guard';
// import { Permissions } from '@/admin/common/decorators/permissions.decorator';

@ApiTags('admin-credentials')
@ApiBearerAuth()
@Controller('admin/credentials')
// @UseGuards(AdminJwtAuthGuard, PermissionsGuard)
export class AdminCredentialsController {
  constructor(private readonly svc: AdminCredentialsService) {}

  @Post('create')
  @ApiOperation({ summary: '创建凭据（激活）' })
  create(@Body() dto: CreateCredentialDto) {
    return this.svc.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '查询凭据列表（可按 appId 过滤）' })
  list(@Query('appId') appId?: string) {
    return this.svc.list(appId);
  }

  @Post('update')
  @ApiOperation({ summary: '更新凭据（状态/时间窗/IP 白名单等）' })
  update(
    @Query('appId') appId: string,
    @Query('kid') kid: string,
    @Body() dto: UpdateCredentialDto,
  ) {
    return this.svc.update(appId, kid, dto);
  }

  @Post('revoke')
  @ApiOperation({ summary: '吊销凭据' })
  revoke(@Body() dto: RevokeCredentialDto) {
    return this.svc.revoke(dto);
  }

  @Post('rotate')
  @ApiOperation({ summary: '轮换密钥（新增 newKid 并可吊销旧的）' })
  rotate(@Body() dto: RotateCredentialDto) {
    return this.svc.rotate(dto);
  }
}
