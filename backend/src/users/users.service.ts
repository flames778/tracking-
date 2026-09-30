import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as argon2 from 'argon2';
import { CreateUserByAdminDto } from '../auth/dto';
import { UpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private scope(organizationId: string | null, isSuper: boolean) {
    return isSuper ? {} : { organizationId: organizationId! };
  }

  list(orgId: string | null, role: string, q: { search?: string; take?: string; skip?: string }) {
    const isSuper = role === 'SUPER_ADMIN';
    const where: any = this.scope(orgId, isSuper);
    if (q.search) {
      where.OR = [
        { fullName: { contains: q.search, mode: 'insensitive' } },
        { email: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(q.take ?? '50', 10) || 50, 200),
      skip: parseInt(q.skip ?? '0', 10) || 0,
    });
  }

  async get(orgId: string | null, role: string, id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (role !== 'SUPER_ADMIN' && user.organizationId !== orgId) {
      throw new ForbiddenException('Cross-organization access denied');
    }
    return user;
  }

  async createByAdmin(
    orgId: string | null,
    actorRole: string,
    actorId: string,
    dto: CreateUserByAdminDto,
  ) {
    const targetOrg = actorRole === 'SUPER_ADMIN' ? orgId : orgId;
    if (!targetOrg) throw new ForbiddenException('Organization scope required');
    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        organizationId: targetOrg,
        fullName: dto.fullName,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        passwordHash,
        role: (dto.role ?? 'FLEET_USER') as any,
        status: 'ACTIVE',
      },
    });
    await this.audit.log({
      organizationId: targetOrg,
      actorId,
      action: 'user.create',
      entity: 'User',
      entityId: user.id,
    });
    return user;
  }

  async update(
    orgId: string | null,
    role: string,
    actorId: string,
    id: string,
    dto: UpdateUserDto,
  ) {
    const existing = await this.get(orgId, role, id);
    if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && dto.role) {
      throw new ForbiddenException('Only admins can change roles');
    }
    const updated = await this.prisma.user.update({
      where: { id: existing.id },
      data: { ...dto },
    });
    await this.audit.log({
      organizationId: updated.organizationId,
      actorId,
      action: 'user.update',
      entity: 'User',
      entityId: updated.id,
    });
    return updated;
  }

  async remove(orgId: string | null, role: string, actorId: string, id: string) {
    const existing = await this.get(orgId, role, id);
    if (existing.id === actorId) throw new ForbiddenException('Cannot delete yourself');
    await this.prisma.user.update({
      where: { id: existing.id },
      data: { status: 'DEACTIVATED' },
    });
    await this.audit.log({
      organizationId: existing.organizationId,
      actorId,
      action: 'user.deactivate',
      entity: 'User',
      entityId: existing.id,
    });
    return { ok: true };
  }
}
