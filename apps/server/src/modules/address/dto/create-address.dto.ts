import { IsString, IsNumber, IsBoolean, IsOptional, MaxLength } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsString()
  @MaxLength(20)
  phone: string;

  @IsString()
  @MaxLength(50)
  province: string;

  @IsString()
  @MaxLength(50)
  city: string;

  @IsString()
  @MaxLength(50)
  district: string;

  @IsString()
  @MaxLength(200)
  detail: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
