import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TrackingIngestionService } from './tracking-ingestion.service';

/**
 * Internal ingestion endpoint (NOT public device transport).
 * Real devices use TCP/UDP transports; this endpoint serves the
 * simulator, admin testing, and future authenticated HTTP trackers.
 * Guarded: only ADMIN/SUPER_ADMIN/FLEET_MANAGER may inject telemetry.
 */
@ApiTags('tracking')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('tracking')
export class TrackingController {
  constructor(private ingestion: TrackingIngestionService) {}

  @Post('ingest')
  @HttpCode(202)
  @Roles('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER')
  ingest(@Body() body: any) {
    const msg =
      typeof body?.raw === 'string' ? body.raw : JSON.stringify(body);
    return this.ingestion.ingestRaw(Buffer.from(msg)).then(() => ({
      accepted: true,
    }));
  }
}
