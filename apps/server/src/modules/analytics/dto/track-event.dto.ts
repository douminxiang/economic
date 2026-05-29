import { IsString, IsOptional, IsObject, MaxLength } from 'class-validator';

export class TrackEventDto {
  @IsString()
  @MaxLength(50)
  eventType: string;

  @IsString()
  @MaxLength(100)
  eventName: string;

  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;

  @IsString()
  @MaxLength(20)
  platform: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  appVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceId?: string;
}
