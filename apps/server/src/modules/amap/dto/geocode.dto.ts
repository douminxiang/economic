import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GeocodeDto {
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsOptional()
  @IsString()
  city?: string;
}
