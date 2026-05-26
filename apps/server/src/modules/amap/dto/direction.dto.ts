import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class DirectionDto {
  @IsString()
  @IsNotEmpty()
  origin: string;

  @IsString()
  @IsNotEmpty()
  destination: string;

  @IsOptional()
  @IsString()
  @IsIn(['driving', 'walking', 'bicycling'])
  mode?: string = 'driving';
}
