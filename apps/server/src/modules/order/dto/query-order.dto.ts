import { IsOptional, IsIn, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryOrderDto {
  @IsOptional()
  @Type(() => Number)
  @IsIn([0, 1, 2])
  status?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit: number = 10;
}
