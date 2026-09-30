import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AlertType } from '@prisma/client';

export class CreateAlertRuleDto {
  @ApiPropertyOptional({ enum: ['OVERSPEED','GEOFENCE_ENTER','GEOFENCE_EXIT','IGNITION_ON','IGNITION_OFF','DEVICE_OFFLINE','LOW_BATTERY','LOW_FUEL','FUEL_DROP','SUSPICIOUS_FUEL_CHANGE','SOS','ENGINE_EVENT','IDLE','MAINTENANCE','CUSTOM'] })
  @IsEnum(AlertType) type!: AlertType;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enabled?: boolean;
  @ApiPropertyOptional() @IsOptional() configuration?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsInt() cooldownSeconds?: number;
}

export class UpdateAlertRuleDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enabled?: boolean;
  @ApiPropertyOptional() @IsOptional() configuration?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsInt() cooldownSeconds?: number;
}
