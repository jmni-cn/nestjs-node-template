import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '@/modules/auth/jwt.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SkipSignature } from '@/common/decorators/skip-signature.decorator';
import { NormalRateLimit, StrictRateLimit } from '@/common/guards/rate-limit.guard';
import { ApiAuthUser } from '@/types/payload.type';

type ReqWithUser = {
  user: ApiAuthUser;
};

/**
 * 用户信息控制器
 *
 * 限流说明：
 * - 获取用户信息：60 次/分钟
 * - 更新用户资料：10 次/分钟
 * - 修改密码：5 次/分钟（严格，防止暴力破解）
 */
@ApiTags('users')
@Controller('users')
@NormalRateLimit() // 类级别默认限流：60 次/分钟
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 可选：后台/测试创建；C 端正常走 /auth/register
  // @ApiOperation({ summary: '（可选）创建用户（后台/测试用）' })
  // @Post()
  // async create(@Body() dto: CreateUserDto) {
  //   const u = await this.usersService.create(dto);
  //   return this.usersService.toSafeUser(u);
  // }

  /**
   * 获取当前用户信息
   */
  @ApiBearerAuth()
  @SkipSignature()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取我的信息' })
  @Get('me')
  async me(@Req() req: ReqWithUser) {
    const user = await this.usersService.getById(req.user.id);
    return this.usersService.toSafeUser(user);
  }

  /**
   * 更新用户资料
   * 限流：10 次/分钟
   */
  @ApiBearerAuth()
  @SkipSignature()
  @UseGuards(JwtAuthGuard)
  @StrictRateLimit() // 更新限流：10 次/分钟
  @ApiOperation({ summary: '更新我的资料（POST 语义：执行一次更新动作）' })
  @Post('me/update')
  async updateMe(@Req() req: ReqWithUser, @Body() dto: UpdateUserDto) {
    const user = await this.usersService.updateProfile(req.user.id, dto);
    return this.usersService.toSafeUser(user);
  }

  /**
   * 修改密码
   * 限流：5 次/分钟（严格，防止暴力破解）
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @StrictRateLimit() // 修改密码限流：10 次/分钟
  @ApiOperation({ summary: '修改密码（旧密码校验 + pv 自增）' })
  @Post('me/password')
  async changePassword(@Req() req: ReqWithUser, @Body() dto: ChangePasswordDto) {
    await this.usersService.changePasswordChecked(req.user.id, dto.current, dto.new);
    return { success: true };
  }
}
