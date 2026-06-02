import { IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';
import { DeviceInfoDto } from './device-info.dto';

export class RegisterDto extends DeviceInfoDto {
  @IsString()
  @MinLength(11, { message: '手机号至少11位' })
  @MaxLength(20)
  @Matches(/^\d{11}$/, { message: '手机号格式不正确' })
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
