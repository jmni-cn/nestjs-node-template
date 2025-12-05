// src/admin/credentials/credentials.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiCredential } from '@/security/entities/api-credential.entity';
import { AdminCredentialsService } from './credentials.service';
import { AdminCredentialsController } from './credentials.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ApiCredential])],
  providers: [AdminCredentialsService],
  controllers: [AdminCredentialsController],
  exports: [AdminCredentialsService],
})
export class AdminCredentialsModule {}
