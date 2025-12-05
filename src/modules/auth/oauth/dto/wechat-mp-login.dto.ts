// src/api/auth/oauth/dto/wechat-mp-login.dto.ts
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class WechatMpLoginDto {
  @ApiProperty({ description: 'wx.login 返回的 code' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({
    description:
      'wx.getUserInfo/手机授权返回的 encryptedData（可选用于拿 unionId）',
  })
  @IsOptional()
  @IsString()
  encryptedData?: string;

  @ApiPropertyOptional({ description: '配套 IV（可选）' })
  @IsOptional()
  @IsString()
  iv?: string;
}
