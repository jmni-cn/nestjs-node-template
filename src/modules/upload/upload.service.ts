import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { appConfig, uploadConfig } from '@/config';
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { LoggerService } from '@/common/logger/logger.service';
import type { MultipartFile } from './types/multipart.types';
import { UploadFile } from './entities/upload-file.entity';

/**
 * 图片上传服务
 *
 * 功能：
 * - 验证上传的文件类型和大小
 * - 生成唯一的文件名避免冲突
 * - 保存文件到指定目录
 * - 生成可访问的URL
 */
@Injectable()
export class UploadService {
  // 允许的图片格式
  private readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  constructor(
    @Inject(uploadConfig.KEY)
    private readonly uploadCfg: ConfigType<typeof uploadConfig>,
    @InjectRepository(UploadFile)
    private readonly uploadFileRepository: Repository<UploadFile>,
    private readonly logger: LoggerService,
  ) {
    // 确保上传目录存在
    this.ensureUploadDir();
  }

  /**
   * 确保上传目录存在
   */
  private ensureUploadDir(): void {
    const categories = ['avatar', 'other'];

    if (!fs.existsSync(this.uploadCfg.uploadPath)) {
      fs.mkdirSync(this.uploadCfg.uploadPath, { recursive: true });
      this.logger.log(`创建上传目录: ${this.uploadCfg.uploadPath}`);
    }

    // 创建分类子目录
    categories.forEach((category) => {
      const categoryDir = path.join(this.uploadCfg.uploadPath, category);
      if (!fs.existsSync(categoryDir)) {
        fs.mkdirSync(categoryDir, { recursive: true });
        this.logger.log(`创建分类目录: ${categoryDir}`);
      }
    });
  }

  /**
   * 验证文件类型
   */
  validateFileType(mimeType: string): void {
    if (!this.ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestException(
        `不支持的文件类型: ${mimeType}。仅支持: ${this.ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
  }

  /**
   * 验证文件大小
   */
  validateFileSize(size: number): void {
    const maxFileSize = Number(this.uploadCfg.maxFileSize);
    if (size > maxFileSize) {
      throw new BadRequestException(
        `文件大小超过限制。最大允许: ${maxFileSize / 1024 / 1024}MB`,
      );
    }
  }

  /**
   * 生成唯一的文件名
   */
  generateUniqueFilename(originalFilename: string): string {
    const ext = path.extname(originalFilename);
    const randomString = randomBytes(8).toString('hex');
    const timestamp = Date.now();
    return `${timestamp}-${randomString}${ext}`;
  }

  /**
   * 保存上传的文件
   *
   * @param file - Fastify 文件对象
   * @param userId - 上传用户ID
   * @param category - 文件分类（avatar, other）
   * @returns 文件信息
   */
  async saveFile(
    file: MultipartFile,
    userId: string,
    category: string = 'other',
  ): Promise<{
    id: string;
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
    url: string;
    uploadedAt: Date;
  }> {
    try {
      // 验证文件
      this.validateFileType(file.mimetype);

      // 获取文件数据
      const buffer = await file.toBuffer();
      this.validateFileSize(buffer.length);

      // 生成唯一文件名
      const filename = this.generateUniqueFilename(file.filename);

      // 确定保存目录
      const validCategories = ['avatar', 'other'];
      const fileCategory = validCategories.includes(category)
        ? category
        : 'other';
      const categoryDir = path.join(this.uploadCfg.uploadPath, fileCategory);
      const filePath = path.join(categoryDir, filename);

      // 保存文件
      fs.writeFileSync(filePath, buffer);

      this.logger.log(`文件上传成功: ${filename} (分类: ${fileCategory})`);

      // 生成访问URL
      const url = `/img/${fileCategory}/${filename}`;

      // 保存上传记录到数据库
      const uploadRecord = this.uploadFileRepository.create({
        id: uuidv4(),
        userId,
        originalName: file.filename,
        filename,
        mimeType: file.mimetype,
        size: buffer.length,
        category: fileCategory as 'avatar' | 'other',
        url,
        filePath: filePath,
        status: 'active',
      });

      await this.uploadFileRepository.save(uploadRecord);

      this.logger.log(
        `文件记录已保存到数据库: ${uploadRecord.id} (用户: ${userId})`,
      );

      return {
        id: uploadRecord.id,
        filename,
        originalName: file.filename,
        size: buffer.length,
        mimeType: file.mimetype,
        url,
        uploadedAt: uploadRecord.createdAt,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`文件上传失败: ${errorMessage}`, {
        stack: errorStack,
      });

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('文件上传失败，请重试');
    }
  }

  /**
   * 软删除文件（标记为已删除，不实际删除物理文件）
   *
   * @param fileId - 文件ID
   * @param userId - 操作用户ID（仅允许上传者删除）
   */
  async deleteFile(fileId: string, userId: string): Promise<void> {
    try {
      const file = await this.uploadFileRepository.findOne({
        where: { id: fileId, status: 'active' },
      });

      if (!file) {
        throw new BadRequestException('文件不存在或已被删除');
      }

      // 验证是否是上传者
      if (file.userId !== userId) {
        throw new BadRequestException('无权删除该文件');
      }

      // 软删除（标记为已删除）
      file.status = 'deleted';
      file.deletedAt = new Date();
      await this.uploadFileRepository.save(file);

      this.logger.log(`文件已标记为删除: ${fileId} (用户: ${userId})`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`文件删除失败: ${errorMessage}`, {
        stack: errorStack,
      });

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('文件删除失败');
    }
  }

  /**
   * 获取用户的上传文件列表
   *
   * @param userId - 用户ID
   * @param category - 文件分类（可选）
   * @param page - 页码
   * @param limit - 每页数量
   */
  async getUserFiles(
    userId: string,
    category?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    items: UploadFile[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const where: any = { userId, status: 'active' };
    if (category) {
      where.category = category;
    }

    const [items, total] = await this.uploadFileRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      total,
      page,
      pageSize: limit,
    };
  }

  /**
   * 获取文件详情
   *
   * @param fileId - 文件ID
   */
  async getFileById(fileId: string): Promise<UploadFile | null> {
    return this.uploadFileRepository.findOne({
      where: { id: fileId, status: 'active' },
      relations: ['user'],
    });
  }
}
