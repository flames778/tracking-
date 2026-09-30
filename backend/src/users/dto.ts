import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role, UserStatus } from '@prisma/client';

export class UpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() fullName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional({ enum: ['ADMIN', 'FLEET_MANAGER', 'FLEET_USER', 'VIEWER'] })
  @IsOptional() @IsEnum(Role) role?: Role;
  @ApiPropertyOptional({ enum: ['ACTIVE', 'INVITED', 'SUSPENDED', 'DEACTIVATED'] })
  @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
}

export class ListQuery {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() take?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() skip?: string;
}
