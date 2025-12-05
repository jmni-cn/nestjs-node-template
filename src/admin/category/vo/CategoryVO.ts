// src/admin/category/vo/CategoryVO.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryStatus } from '../types';

/**
 * 分类列表项 VO
 */
export class CategoryListItemVO {
  @ApiProperty({ description: '分类 ID', example: 1 })
  id: number;

  @ApiProperty({ description: '分类 UID', example: 'cat_abc123' })
  uid: string;

  @ApiProperty({ description: '模块编码', example: 'article' })
  moduleCode: string;

  @ApiProperty({ description: '分类名称', example: '技术文章' })
  name: string;

  @ApiProperty({ description: 'URL 标识', example: 'tech-articles' })
  slug: string;

  @ApiProperty({ description: '描述' })
  description: string;

  @ApiPropertyOptional({ description: '图标' })
  icon: string | null;

  @ApiPropertyOptional({ description: '封面图 URL' })
  coverUrl: string | null;

  @ApiPropertyOptional({ description: '父分类 ID' })
  parentId: number | null;

  @ApiProperty({ description: '物化路径' })
  path: string;

  @ApiProperty({ description: '层级（根=0）' })
  level: number;

  @ApiProperty({ description: '是否叶子节点' })
  isLeaf: boolean;

  @ApiProperty({ description: '排序权重' })
  sortOrder: number;

  @ApiProperty({
    description: '状态',
    enum: ['enabled', 'disabled'],
    example: 'enabled',
  })
  status: CategoryStatus;

  @ApiPropertyOptional({ description: '创建人 ID' })
  createdBy: number | null;

  @ApiProperty({ description: '创建人用户名' })
  createdByUsername: string;

  @ApiProperty({ description: '创建时间（ISO 8601）' })
  createdAt: string;

  @ApiProperty({ description: '更新时间（ISO 8601）' })
  updatedAt: string;
}

/**
 * 分类详情 VO
 */
export class CategoryDetailVO extends CategoryListItemVO {
  @ApiProperty({ description: '创建人 UID' })
  createdByUid: string;

  @ApiPropertyOptional({ description: '最后修改人 ID' })
  updatedBy: number | null;

  @ApiProperty({ description: '最后修改人 UID' })
  updatedByUid: string;

  @ApiProperty({ description: '最后修改人用户名' })
  updatedByUsername: string;

  @ApiProperty({ description: '是否已删除' })
  isDeleted: boolean;
}

/**
 * 分类树节点 VO
 */
export class CategoryTreeNodeVO extends CategoryListItemVO {
  @ApiPropertyOptional({
    description: '子分类列表',
    type: [CategoryTreeNodeVO],
  })
  children?: CategoryTreeNodeVO[];
}

/**
 * 分类分页列表响应 VO
 */
export class CategoryListVO {
  @ApiProperty({ description: '总记录数', example: 100 })
  total: number;

  @ApiProperty({ description: '分类列表', type: [CategoryListItemVO] })
  items: CategoryListItemVO[];

  @ApiProperty({ description: '当前页码', example: 1 })
  page: number;

  @ApiProperty({ description: '每页条数', example: 20 })
  pageSize: number;

  @ApiProperty({ description: '总页数', example: 5 })
  totalPages: number;
}

/**
 * 分类统计 VO
 */
export class CategoryStatsVO {
  @ApiProperty({ description: '分类总数', example: 50 })
  totalCount: number;

  @ApiProperty({ description: '启用数', example: 45 })
  enabledCount: number;

  @ApiProperty({ description: '禁用数', example: 5 })
  disabledCount: number;

  @ApiProperty({ description: '根分类数', example: 10 })
  rootCount: number;

  @ApiProperty({
    description: '各模块分类统计',
    example: [
      { moduleCode: 'article', count: 10 },
      { moduleCode: 'product', count: 8 },
    ],
  })
  moduleStats: { moduleCode: string; count: number }[];
}

/**
 * 简化的分类选项 VO（用于下拉选择）
 */
export class CategoryOptionVO {
  @ApiProperty({ description: '分类 ID' })
  id: number;

  @ApiProperty({ description: '分类名称' })
  name: string;

  @ApiProperty({ description: '层级' })
  level: number;

  @ApiPropertyOptional({ description: '父分类 ID' })
  parentId: number | null;

  @ApiProperty({ description: '是否禁用' })
  disabled: boolean;
}
