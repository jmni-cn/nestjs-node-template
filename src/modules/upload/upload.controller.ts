import {
  Controller,
  Post,
  Get,
  Delete,
  UseGuards,
  Query,
  Param,
  BadRequestException,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt.guard';
import { UploadService } from './upload.service';
import { UploadImageResponseDto, UploadImageQueryDto } from './dto/upload-image.dto';
import { GetUserFilesQueryDto, FileListResponseDto } from './dto/get-user-files.dto';
import { LoggerService } from '@/common/logger/logger.service';
import { RateLimit, NormalRateLimit, StrictRateLimit } from '@/common/guards/rate-limit.guard';
import type { FastifyRequest } from 'fastify';

/**
 * 图片上传控制器
 *
 * 提供图片上传相关的 API 接口
 *
 * 限流说明：
 * - 上传接口：10 次/分钟（防止滥用）
 * - 查询接口：60 次/分钟
 * - 删除接口：10 次/分钟
 */
@ApiTags('图片上传')
@Controller('upload')
@NormalRateLimit() // 类级别默认限流：60 次/分钟
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 上传单张图片
   *
   * 注意：
   * - 需要 JWT 认证
   * - 仅支持 jpg, png, gif, webp 格式
   * - 文件大小最大 5MB
   * - 使用 multipart/form-data 格式上传
   * - 字段名必须为 'file'
   *
   * 限流：10 次/分钟
   */
  @Post('image')
  @UseGuards(JwtAuthGuard)
  @StrictRateLimit() // 上传限流：10 次/分钟
  @ApiBearerAuth()
  @ApiOperation({
    summary: '上传图片',
    description: '上传单张图片，支持 jpg/png/gif/webp 格式，最大5MB。字段名必须为 file。',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '图片文件',
        },
      },
      required: ['file'],
    },
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: '图片分类：avatar（头像）, other（其他）',
    example: 'avatar',
  })
  @ApiResponse({
    status: 201,
    description: '上传成功',
    type: UploadImageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '请求错误（文件类型不支持、文件过大等）',
  })
  @ApiResponse({
    status: 401,
    description: '未授权（缺少或无效的 JWT Token）',
  })
  async uploadImage(
    @Req() request: FastifyRequest,
    @Query() query: UploadImageQueryDto,
  ): Promise<UploadImageResponseDto> {
    try {
      // 获取当前用户ID
      const user = (request as any).user;
      if (!user || !user.sub) {
        throw new BadRequestException('无法上传');
      }

      // 获取上传的文件
      const data = await request.file();

      if (!data) {
        throw new BadRequestException('未找到上传的文件。请确保字段名为 file');
      }

      // 处理文件上传
      const result = await this.uploadService.saveFile(data, user.sub, query.category);

      this.logger.log(`用户 ${user.sub} 上传图片成功: ${result.filename}`);

      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`图片上传失败: ${errorMessage}`, {
        stack: errorStack,
      });

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('图片上传失败，请检查文件格式和大小');
    }
  }

  /**
   * 获取当前用户的文件列表
   */
  @Get('my-files')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '获取我的文件列表',
    description: '获取当前登录用户上传的所有文件',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: FileListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  async getMyFiles(
    @Req() request: FastifyRequest,
    @Query() query: GetUserFilesQueryDto,
  ): Promise<FileListResponseDto> {
    const user = (request as any).user;
    if (!user || !user.sub) {
      throw new BadRequestException('无法获取用户信息');
    }

    return this.uploadService.getUserFiles(
      user.sub,
      query.category,
      query.page || 1,
      query.limit || 20,
    );
  }

  /**
   * 删除文件
   * 限流：10 次/分钟
   */
  @Delete(':fileId')
  @UseGuards(JwtAuthGuard)
  @StrictRateLimit() // 删除限流：10 次/分钟
  @ApiBearerAuth()
  @ApiOperation({
    summary: '删除文件',
    description: '删除指定的文件（仅允许上传者删除）',
  })
  @ApiParam({
    name: 'fileId',
    description: '文件ID',
  })
  @ApiResponse({
    status: 200,
    description: '删除成功',
  })
  @ApiResponse({
    status: 400,
    description: '文件不存在或无权删除',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  async deleteFile(
    @Req() request: FastifyRequest,
    @Param('fileId') fileId: string,
  ): Promise<{ message: string }> {
    const user = (request as any).user;
    if (!user || !user.sub) {
      throw new BadRequestException('无法获取用户信息');
    }

    await this.uploadService.deleteFile(fileId, user.sub);

    return {
      message: '文件删除成功',
    };
  }

  /**
   * 获取文件详情
   */
  @Get(':fileId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '获取文件详情',
    description: '获取指定文件的详细信息',
  })
  @ApiParam({
    name: 'fileId',
    description: '文件ID',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
  })
  @ApiResponse({
    status: 404,
    description: '文件不存在',
  })
  async getFileById(@Param('fileId') fileId: string) {
    const file = await this.uploadService.getFileById(fileId);

    if (!file) {
      throw new BadRequestException('文件不存在');
    }

    return file;
  }
}
