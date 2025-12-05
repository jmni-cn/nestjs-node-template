import { AuthGuard } from '@nestjs/passport';
export class AdminJwtRefreshGuard extends AuthGuard('admin-jwt-refresh') {}
