import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrgScopeGuard } from '../common/guards/org-scope.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { DevicesService } from './devices.service';
import { AssignDeviceDto, CreateDeviceDto, UpdateDeviceDto } from './dto';

@ApiTags('devices')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgScopeGuard)
@Controller('devices')
export class DevicesController {
  constructor(private devices: DevicesService) {}

  @Get()
  @Roles('FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN', 'FLEET_USER', 'VIEWER')
  async list(@Req() req: any, @Query() q: any) {
    const rows = await this.devices.list(req.organizationId, q);
    return rows.map((d) => redactDevice(d, req.user.role));
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER')
  create(@Req() req: any, @Body() dto: CreateDeviceDto) {
    return this.devices
      .create(req.organizationId, req.user.sub, dto)
      .then((d) => redactDevice(d, req.user.role));
  }

  @Get(':id')
  @Roles('FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN', 'FLEET_USER', 'VIEWER')
  async get(@Req() req: any, @Param('id') id: string) {
    const d = await this.devices.getOwned(req.organizationId, id);
    return redactDevice(d, req.user.role);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER')
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateDeviceDto) {
    const d = await this.devices.update(req.organizationId, req.user.sub, id, dto);
    return redactDevice(d, req.user.role);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.devices.remove(req.organizationId, req.user.sub, id);
  }

  @Post(':id/assign')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER')
  assign(@Req() req: any, @Param('id') id: string, @Body() dto: AssignDeviceDto) {
    return this.devices.assign(req.organizationId, req.user.sub, id, dto.vehicleId);
  }

  @Post(':id/unassign')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER')
  unassign(@Req() req: any, @Param('id') id: string) {
    return this.devices.unassign(req.organizationId, req.user.sub, id);
  }

  @Get(':id/status')
  @Roles('FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN', 'FLEET_USER', 'VIEWER')
  status(@Req() req: any, @Param('id') id: string) {
    return this.devices.status(req.organizationId, id);
  }

  @Get(':id/history')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER')
  history(@Req() req: any, @Param('id') id: string) {
    return this.devices.history(req.organizationId, id);
  }
}

const SENSITIVE_DEVICE_FIELDS = ['simNumber', 'serialNumber', 'firmwareVersion'] as const;

/**
 * Device identity data (SIM, serial, firmware) is restricted to roles that
 * manage the fleet hardware. Everyone else gets operational fields only.
 */
function redactDevice<T extends Record<string, any>>(device: T, role: string): Partial<T> {
  if (['FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) return device;
  const copy: Record<string, any> = { ...device };
  for (const field of SENSITIVE_DEVICE_FIELDS) delete copy[field];
  return copy as Partial<T>;
}
