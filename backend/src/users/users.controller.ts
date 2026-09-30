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
import { UsersService } from './users.service';
import { CreateUserByAdminDto } from '../auth/dto';
import { ListQuery, UpdateUserDto } from './dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgScopeGuard)
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER')
  list(@Req() req: any, @Query() q: ListQuery) {
    return this.users.list(req.organizationId, req.user.role, q);
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  create(@Req() req: any, @Body() dto: CreateUserByAdminDto) {
    return this.users.createByAdmin(
      req.organizationId,
      req.user.role,
      req.user.sub,
      dto,
    );
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER')
  get(@Req() req: any, @Param('id') id: string) {
    return this.users.get(req.organizationId, req.user.role, id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(
      req.organizationId,
      req.user.role,
      req.user.sub,
      id,
      dto,
    );
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.users.remove(
      req.organizationId,
      req.user.role,
      req.user.sub,
      id,
    );
  }
}
