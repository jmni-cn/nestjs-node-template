// src/modules/config/vo/ConfigVO.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 公开配置值 VO
 */
export class PublicConfigValueVO {
  @ApiProperty({ description: '配置项 key', example: 'max_article_count' })
  itemKey: string;

  @ApiProperty({ description: '配置值', example: '100' })
  value: string;

  @ApiProperty({
    description: '值类型',
    enum: ['switch', 'number', 'text', 'json', 'select', 'multiselect'],
    example: 'number',
  })
  itemType: string;
}

/**
 * 公开配置项 VO
 */
export class PublicConfigItemVO extends PublicConfigValueVO {
  @ApiProperty({ description: '配置项名称', example: '最大文章数量' })
  itemName: string;

  @ApiPropertyOptional({
    description: '可选值列表（用于 select/multiselect 类型）',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        label: { type: 'string' },
        value: { type: 'string' },
      },
    },
  })
  options: Array<{ label: string; value: string }> | null;

  @ApiProperty({ description: '配置说明', example: '系统允许的最大文章数量' })
  description: string;
}
