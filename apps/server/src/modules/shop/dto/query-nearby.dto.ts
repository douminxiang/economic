import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryNearbyDto {
  @IsNumber()
  @Type(() => Number)
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Type(() => Number)
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(100)
  @Max(50000)
  radius?: number = 3000;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
