import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GeofenceType } from '@prisma/client';

export class CreateGeofenceDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ enum: ['CIRCLE', 'POLYGON', 'RECTANGLE'] })
  @IsEnum(GeofenceType) type!: GeofenceType;
  @ApiPropertyOptional() @IsOptional() @IsNumber() centerLatitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() centerLongitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() radiusMeters?: number;
  @ApiPropertyOptional() @IsOptional() polygon?: any;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enterAlertEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() exitAlertEnabled?: boolean;
}

export class UpdateGeofenceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() centerLatitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() centerLongitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() radiusMeters?: number;
  @ApiPropertyOptional() @IsOptional() polygon?: any;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enterAlertEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() exitAlertEnabled?: boolean;
}

export { IsArray };
