// src/security/api-credentials.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiCredential } from './entities/api-credential.entity';
import { DbSecretResolverService } from './db-secret-resolver.service';
import { SECRET_RESOLVER } from './tokens';
import { SecurityController } from './security.controller';

/**
 * ApiCredentialsModule - API凭证管理模块
 *
 * 职责:
 * - 管理 API 凭证（AppId、Secret、算法、编码）
 * - 提供签名验证所需的密钥解析服务
 * - 支持 HMAC-SHA256 签名算法
 *
 * 核心功能:
 * - DbSecretResolverService: 从数据库解析 API 凭证
 * - SecurityController: API 凭证管理接口
 *
 * 导出内容:
 * - SECRET_RESOLVER: 密钥解析器（供 SignatureGuard 使用）
 * - TypeOrmModule: API凭证实体仓库
 *
 * @module ApiCredentialsModule
 * @since 1.0.0
 */
@Module({
  imports: [TypeOrmModule.forFeature([ApiCredential])],
  providers: [
    DbSecretResolverService,
    { provide: SECRET_RESOLVER, useExisting: DbSecretResolverService },
  ],
  controllers: [SecurityController],
  exports: [TypeOrmModule, SECRET_RESOLVER],
})
export class ApiCredentialsModule {}
