import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

const RANK: Record<Role, number> = {
  VIEWER: 0,
  FLEET_USER: 1,
  FLEET_MANAGER: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
};

/**
 * Hierarchical roles: ADMIN implies all lower roles.
 * SUPER_ADMIN bypasses tenant checks.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as { role: Role } | undefined;
    if (!user) throw new ForbiddenException('Missing authentication');
    const userRank = RANK[user.role] ?? -1;
    const ok = required.some((r) => userRank >= (RANK[r] ?? 99));
    if (!ok) throw new ForbiddenException('Insufficient role');
    return true;
  }
}
