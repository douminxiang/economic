import { IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryNearbyDto {
  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @IsNumber()
  @Type(() => Number)
  longitude: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(100)
  radius?: number = 3000;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  limit?: number = 20;
}
