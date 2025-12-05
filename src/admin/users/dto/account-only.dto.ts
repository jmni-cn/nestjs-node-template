// dto/account-only.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  isEmail,
} from 'class-validator';

const USERNAME_RE = /^[a-zA-Z0-9_]+$/;

export function IsAccount(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsAccount',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, _args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          const v = String(value).trim().toLowerCase();
          if (!v) return false;
          // 1) email
          if (isEmail(v)) return true;
          // 2) username: 3..50, [a-zA-Z0-9_]+
          if (v.length >= 3 && v.length <= 50 && USERNAME_RE.test(v))
            return true;
          return false;
        },
        defaultMessage() {
          return 'account 必须为有效邮箱或 3-50 位的用户名（字母/数字/下划线）';
        },
      },
    });
  };
}

export class AccountOnlyDto {
  @ApiProperty({
    description: '登录账号（邮箱或用户名）',
    example: 'john@example.com 或 john_doe',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsAccount()
  account: string;
}
