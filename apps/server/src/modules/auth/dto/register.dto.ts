import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MaxLength(20)
  phone: string;

  @IsString()
  @MinLength(6)
  @MaxLength(32)
  password: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  nickname?: string;
}
