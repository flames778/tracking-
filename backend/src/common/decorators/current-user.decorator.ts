import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  sub: string;
  email: string;
  role: string;
  organizationId: string | null;
}

/** @CurrentUser() -> JWT payload user */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as AuthUser;
  },
);

/** @OrgId() -> tenant id from JWT (never trust client-supplied org id) */
export const OrgId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const req = ctx.switchToHttp().getRequest();
    return (req.user?.organizationId as string | null) ?? null;
  },
);
