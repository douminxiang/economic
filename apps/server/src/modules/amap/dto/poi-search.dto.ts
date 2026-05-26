import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class PoiSearchDto {
  @IsString()
  @IsNotEmpty()
  keywords: string;

  @IsOptional()
  @IsString()
  location?: string;
}
