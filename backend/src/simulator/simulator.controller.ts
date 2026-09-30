import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SimulatorService } from './simulator.service';

/** Admin-only simulator controls — never exposed to normal customers. */
@ApiTags('simulator')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('admin/simulator')
export class SimulatorController {
  constructor(private sim: SimulatorService) {}

  @Get('status')
  @Roles('ADMIN', 'SUPER_ADMIN')
  status() {
    return this.sim.status();
  }

  @Post('start')
  @Roles('ADMIN', 'SUPER_ADMIN')
  start(@Body() body: { vehicleCount?: number; intervalMs?: number }) {
    return this.sim.start(body ?? {});
  }

  @Post('stop')
  @Roles('ADMIN', 'SUPER_ADMIN')
  stop() {
    return this.sim.stop();
  }

  @Post('reset')
  @Roles('ADMIN', 'SUPER_ADMIN')
  reset() {
    return this.sim.reset();
  }
}
