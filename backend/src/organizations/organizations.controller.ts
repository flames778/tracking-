import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrgScopeGuard } from '../common/guards/org-scope.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { OrganizationsService } from './organizations.service';
import { UpdateOrganizationDto } from './dto';

@ApiTags('organization')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgScopeGuard)
@Controller('organization')
export class OrganizationsController {
  constructor(private orgs: OrganizationsService) {}

  @Get()
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  mine(@Req() req: any) {
    return this.orgs.getMine(req.organizationId);
  }

  @Patch()
  @Roles('ADMIN', 'SUPER_ADMIN')
  update(@Req() req: any, @Body() dto: UpdateOrganizationDto) {
    return this.orgs.updateMine(req.organizationId, req.user.sub, dto);
  }
}
