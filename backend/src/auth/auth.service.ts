import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { LoginDto, RegisterDto } from './dto';

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 48) || 'org'
  );
}

function sha256(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function parseTtl(ttl: string, fallbackMs: number): number {
  const m = ttl.match(/^(\d+)([smhd])$/);
  if (!m) return fallbackMs;
  const n = parseInt(m[1], 10);
  const mult = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;
  return n * mult[m[2] as keyof typeof mult];
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private audit: AuditService,
  ) {}

  private accessSecret() {
    return this.config.get<string>('app.jwtAccessSecret')!;
  }

  private async issueTokens(user: {
    id: string;
    email: string;
    role: string;
    organizationId: string | null;
  }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.accessSecret(),
      expiresIn: (this.config.get<string>('app.jwtAccessTtl') ??
        '15m') as any,
    });
    const refreshToken = randomBytes(48).toString('hex');
    const refreshTtl = this.config.get<string>('app.jwtRefreshTtl') ?? '7d';
    const expiresAt = new Date(
      Date.now() + parseTtl(refreshTtl, 7 * 86_400_000),
    );
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId ?? undefined,
        tokenHash: sha256(refreshToken),
        expiresAt,
      },
    });
    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto, ip?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) throw new ConflictException('Email already registered');

    let organizationId: string | null = null;
    let role: 'ADMIN' | 'FLEET_USER' = 'FLEET_USER';

    if (dto.organizationName) {
      const base = slugify(dto.organizationName);
      let slug = base;
      for (let i = 1; ; i++) {
        const clash = await this.prisma.organization.findUnique({
          where: { slug },
        });
        if (!clash) break;
        slug = `${base}-${i}`;
      }
      const org = await this.prisma.organization.create({
        data: { name: dto.organizationName, slug },
      });
      organizationId = org.id;
      role = 'ADMIN';
      await this.prisma.subscription.create({
        data: { organizationId: org.id, planName: 'FREE', status: 'TRIAL' },
      });
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        organizationId,
        fullName: dto.fullName,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        passwordHash,
        role: role as any,
        status: 'ACTIVE',
      },
    });
    await this.audit.log({
      organizationId,
      actorId: user.id,
      action: 'auth.register',
      entity: 'User',
      entityId: user.id,
      ipAddress: ip,
    });
    const tokens = await this.issueTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    });
    return { user, ...tokens };
  }

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (user.status !== 'ACTIVE')
      throw new UnauthorizedException(`Account is ${user.status}`);
    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    const tokens = await this.issueTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    });
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(tokens.refreshToken) },
      data: { ipAddress: ip, userAgent },
    });
    await this.audit.log({
      organizationId: user.organizationId,
      actorId: user.id,
      action: 'auth.login',
      entity: 'User',
      entityId: user.id,
      ipAddress: ip,
    });
    return { user, ...tokens };
  }

  /** Refresh-token rotation: old token revoked, new token issued. */
  async refresh(refreshToken: string) {
    const hash = sha256(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hash },
      include: { user: true },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (stored.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    // prune other expired tokens for this user (best effort)
    await this.prisma.refreshToken
      .deleteMany({
        where: { userId: stored.userId, expiresAt: { lt: new Date() } },
      })
      .catch(() => null);
    return this.issueTokens({
      id: stored.user.id,
      email: stored.user.email,
      role: stored.user.role,
      organizationId: stored.user.organizationId,
    });
  }

  async logout(refreshToken: string, userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(refreshToken), userId },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async logoutAll(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    // Always return ok to avoid user enumeration
    if (!user) return { ok: true };
    const token = randomBytes(32).toString('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    // TODO: send email via notifications queue. Return token only in dev.
    const isDev =
      (this.config.get<string>('app.nodeEnv') ?? 'development') !==
      'production';
    return isDev ? { ok: true, resetToken: token } : { ok: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: sha256(token) },
    });
    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.user.update({
      where: { id: stored.userId },
      data: { passwordHash },
    });
    await this.prisma.passwordResetToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    });
    await this.logoutAll(stored.userId);
    return { ok: true };
  }

  me(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }
}
