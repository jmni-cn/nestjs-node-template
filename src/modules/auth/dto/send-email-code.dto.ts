// src/api/auth/dto/send-email-code.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsString } from 'class-validator';

export type EmailScene = 'register' | 'login' | 'reset';

export class SendEmailCodeDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: ['register', 'login', 'reset'], default: 'register' })
  @IsString()
  @IsIn(['register', 'login', 'reset'])
  scene: EmailScene;
}
