import { IsNumber, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class ReverseGeocodeDto {
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  lat: number;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  lng: number;
}
