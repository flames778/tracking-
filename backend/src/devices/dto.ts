import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceModel } from '@prisma/client';

export class CreateDeviceDto {
  @ApiProperty() @IsString() imei!: string;
  @ApiPropertyOptional({ enum: ['C003F', 'OTHER_MODEL'] })
  @IsOptional() @IsEnum(DeviceModel) model?: DeviceModel;
  @ApiPropertyOptional() @IsOptional() @IsString() manufacturer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() simNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() firmwareVersion?: string;
}

/**
 * Device status is derived (assignment, offline sweep), never client-set.
 * IMEI is immutable after creation — it is the device identity used by the
 * ingestion pipeline.
 */
export class UpdateDeviceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() simNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() firmwareVersion?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() manufacturer?: string;
}

export class AssignDeviceDto {
  @ApiProperty() @IsString() vehicleId!: string;
}
