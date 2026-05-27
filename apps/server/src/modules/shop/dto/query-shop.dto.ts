import { IsOptional, IsString, IsNumber, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryShopDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  @IsIn(['recommended', 'rating', 'sales'])
  sort?: string = 'recommended';
}
