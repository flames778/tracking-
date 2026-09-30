import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/**
 * Tenant isolation guard.
 * - SUPER_ADMIN with `x-org-id` header may scope to any org (admin use).
 * - All other users are pinned to their JWT organizationId.
 * - Attaches `req.organizationId` for services to use — never trust body/query org id.
 */
@Injectable()
export class OrgScopeGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as
      | { role: string; organizationId: string | null }
      | undefined;
    if (!user) throw new ForbiddenException('Missing authentication');
    if (user.role === 'SUPER_ADMIN') {
      const headerOrg = req.headers?.['x-org-id'] as string | undefined;
      req.organizationId = headerOrg ?? user.organizationId ?? null;
      return true;
    }
    if (!user.organizationId) {
      throw new ForbiddenException('User has no organization');
    }
    req.organizationId = user.organizationId;
    return true;
  }
}
