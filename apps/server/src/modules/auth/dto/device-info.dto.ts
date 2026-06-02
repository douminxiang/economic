import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeviceInfoDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceName?: string;
}
