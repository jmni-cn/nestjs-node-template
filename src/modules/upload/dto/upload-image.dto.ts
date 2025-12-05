import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 图片上传响应 DTO
 */
export class UploadImageResponseDto {
  @ApiProperty({ description: '文件ID' })
  id: string;

  @ApiProperty({ description: '文件名' })
  filename: string;

  @ApiProperty({ description: '原始文件名' })
  originalName: string;

  @ApiProperty({ description: '文件大小（字节）' })
  size: number;

  @ApiProperty({ description: '文件类型' })
  mimeType: string;

  @ApiProperty({ description: '访问URL' })
  url: string;

  @ApiProperty({ description: '上传时间' })
  uploadedAt: Date;
}

/**
 * 图片上传查询参数 DTO
 */
export class UploadImageQueryDto {
  @ApiProperty({
    description: '图片用途分类（如：avatar, other）',
    required: false,
    example: 'avatar',
  })
  @IsOptional()
  @IsString()
  category?: string;
}
