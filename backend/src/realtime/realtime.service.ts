import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../common/prisma/prisma.service';

export interface AuthenticatedSocket extends Socket {
  user?: { sub: string; role: string; organizationId: string | null };
}

/**
 * Realtime fan-out. Rooms: `org:{orgId}`, `vehicle:{vehicleId}`.
 * Subscription is server-authorized: socket org must match room org.
 * Works single-instance; add the Socket.IO Redis adapter for multi-instance.
 */
@Injectable()
export class RealtimeService {
  private server: Server | null = null;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  attach(server: Server) {
    this.server = server;
    server.use((socket: AuthenticatedSocket, next) => {
      this.authenticate(socket)
        .then(() => next())
        .catch(() => next(new Error('unauthorized')));
    });
    server.on('connection', (socket: AuthenticatedSocket) => {
      socket.on('subscribe:organization', (orgId: string, ack?: (res: any) => void) => {
        if (socket.user?.role !== 'SUPER_ADMIN' && socket.user?.organizationId !== orgId) {
          ack?.({ ok: false, error: 'FORBIDDEN' });
          return;
        }
        socket.join(`org:${orgId}`);
        ack?.({ ok: true });
      });
      socket.on('subscribe:vehicle', async (vehicleId: string, ack?: (res: any) => void) => {
        try {
          const v = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
          if (!v) {
            ack?.({ ok: false, error: 'NOT_FOUND' });
            return;
          }
          if (socket.user?.role !== 'SUPER_ADMIN' && v.organizationId !== socket.user?.organizationId) {
            ack?.({ ok: false, error: 'FORBIDDEN' });
            return;
          }
          socket.join(`vehicle:${vehicleId}`);
          socket.join(`org:${v.organizationId}`);
          ack?.({ ok: true });
        } catch {
          ack?.({ ok: false, error: 'INTERNAL_ERROR' });
        }
      });
    });
  }

  private async authenticate(socket: AuthenticatedSocket): Promise<void> {
    const token =
      (socket.handshake.auth?.token as string) ??
      (socket.handshake.query?.token as string) ??
      extractBearer(socket.handshake.headers?.authorization);
    if (!token) throw new Error('missing token');
    const secret = this.config.get<string>('app.jwtAccessSecret')!;
    const payload = await this.jwt.verifyAsync(token, { secret });
    socket.user = payload;
  }

  async emitToVehicle(organizationId: string, vehicleId: string, event: string, data: unknown) {
    this.server?.to(`vehicle:${vehicleId}`).to(`org:${organizationId}`).emit(event, {
      event,
      data,
    });
  }

  async emitToOrg(organizationId: string, event: string, data: unknown) {
    this.server?.to(`org:${organizationId}`).emit(event, { event, data });
  }
}

function extractBearer(header?: string): string | undefined {
  if (!header) return undefined;
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' ? token : undefined;
}
