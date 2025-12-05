import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { UploadFile } from './entities/upload-file.entity';
import { LoggerModule } from '@/common/logger/logger.module';
import { ConfigModule } from '@nestjs/config';
import { uploadConfig } from '@/config';

/**
 * 图片上传模块
 *
 * 提供图片上传和管理功能
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([UploadFile]),
    LoggerModule,
    ConfigModule.forFeature(uploadConfig),
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
