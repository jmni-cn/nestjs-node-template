// src/admin/common/modules/vo/common.vo.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 操作成功响应
 */
export class SuccessResponse {
  @ApiProperty({ description: '操作是否成功', example: true })
  success: boolean;
}

/**
 * 分页响应元数据
 */
export class PaginationMeta {
  @ApiProperty({ description: '当前页码', example: 1 })
  page: number;

  @ApiProperty({ description: '每页数量', example: 10 })
  limit: number;

  @ApiProperty({ description: '总记录数', example: 100 })
  total: number;

  @ApiProperty({ description: '总页数', example: 10 })
  totalPages: number;
}

/**
 * 分页响应基础类
 */
export class PaginatedResponse<T> {
  @ApiProperty({ description: '数据列表' })
  data: T[];

  @ApiProperty({ description: '分页信息', type: PaginationMeta })
  meta: PaginationMeta;
}

/**
 * 带时间戳的响应基础类
 */
export class TimestampedResponse {
  @ApiProperty({ description: '时间戳', example: 1704067200000 })
  timestamp: number;
}

