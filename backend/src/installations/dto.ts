import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InstallationStatus } from '@prisma/client';

export class CreateInstallationDto {
  @ApiProperty() @IsString() vehicleId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deviceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() installerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() installerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() installationLocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledAt?: string;
}

export class UpdateInstallationDto {
  @ApiPropertyOptional({ enum: ['SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED'] })
  @IsOptional() @IsEnum(InstallationStatus) status?: InstallationStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() installerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() installationLocation?: string;
}
