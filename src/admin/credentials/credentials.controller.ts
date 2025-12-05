// src/admin/credentials/credentials.controller.ts
import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AdminCredentialsService } from './credentials.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';
import { RotateCredentialDto } from './dto/rotate-credential.dto';
import { RevokeCredentialDto } from './dto/revoke-credential.dto';
import { CredentialVO, CredentialRotateVO } from './vo/CredentialVO';
import { AdminJwtAuthGuard } from '@/admin/auth/admin-jwt.guard';
import { PermissionsGuard } from '@/admin/common/guards/permissions.guard';
import { Permissions } from '@/admin/common/decorators/permissions.decorator';
import { SkipSignature } from '@/common/decorators/skip-signature.decorator';

@ApiTags('admin-credentials')
@ApiBearerAuth()
@Controller('admin/credentials')
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@SkipSignature()
export class AdminCredentialsController {
  constructor(private readonly svc: AdminCredentialsService) {}

  @Post('create')
  @Permissions('credentials:write')
  @ApiOperation({ summary: '创建凭据（激活）' })
  @ApiResponse({ status: 201, description: '创建成功', type: CredentialVO })
  @ApiResponse({ status: 400, description: '参数错误或凭据已存在' })
  async create(@Body() dto: CreateCredentialDto): Promise<CredentialVO> {
    return this.svc.create(dto);
  }

  @Get()
  @Permissions('credentials:read', 'credentials:write')
  @ApiOperation({ summary: '查询凭据列表（可按 appId 过滤）' })
  @ApiQuery({ name: 'appId', required: false, description: '应用 ID' })
  @ApiResponse({ status: 200, description: '查询成功', type: [CredentialVO] })
  async list(@Query('appId') appId?: string): Promise<CredentialVO[]> {
    return this.svc.list(appId);
  }

  @Post('update')
  @Permissions('credentials:write')
  @ApiOperation({ summary: '更新凭据（状态/时间窗/IP 白名单等）' })
  @ApiQuery({ name: 'appId', required: true, description: '应用 ID' })
  @ApiQuery({ name: 'kid', required: true, description: '密钥 ID' })
  @ApiResponse({ status: 200, description: '更新成功', type: CredentialVO })
  @ApiResponse({ status: 404, description: '凭据不存在' })
  async update(
    @Query('appId') appId: string,
    @Query('kid') kid: string,
    @Body() dto: UpdateCredentialDto,
  ): Promise<CredentialVO> {
    return this.svc.update(appId, kid, dto);
  }

  @Post('revoke')
  @Permissions('credentials:write')
  @ApiOperation({ summary: '吊销凭据' })
  @ApiResponse({ status: 200, description: '吊销成功', type: CredentialVO })
  @ApiResponse({ status: 404, description: '凭据不存在' })
  async revoke(@Body() dto: RevokeCredentialDto): Promise<CredentialVO> {
    return this.svc.revoke(dto);
  }

  @Post('rotate')
  @Permissions('credentials:write')
  @ApiOperation({ summary: '轮换密钥（新增 newKid 并可吊销旧的）' })
  @ApiResponse({ status: 200, description: '轮换成功', type: CredentialRotateVO })
  @ApiResponse({ status: 404, description: '原凭据不存在' })
  async rotate(@Body() dto: RotateCredentialDto): Promise<CredentialRotateVO> {
    return this.svc.rotate(dto);
  }
}
