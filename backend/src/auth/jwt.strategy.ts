import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        config.get<string>('app.jwtAccessSecret') ?? 'dev-access-secret',
    });
  }

  /**
   * Re-checks account state on every request so a suspended, deleted or
   * de-activated user loses access immediately instead of at token expiry,
   * and so a role change takes effect without waiting for a new token.
   */
  async validate(payload: {
    sub: string;
    email: string;
    role: string;
    organizationId: string | null;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        organizationId: true,
        deletedAt: true,
        organization: { select: { status: true } },
      },
    });
    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }
    if (user.organization && user.organization.status !== 'ACTIVE') {
      throw new UnauthorizedException('Organization is not active');
    }
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };
  }
}
