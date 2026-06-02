import { IsString, Matches, Length } from 'class-validator';
import { DeviceInfoDto } from './device-info.dto';

export class SmsLoginDto extends DeviceInfoDto {
  @IsString()
  @Matches(/^\d{11}$/, { message: '手机号格式不正确' })
  phone: string;

  @IsString()
  @Length(6, 6, { message: '验证码为6位数字' })
  @Matches(/^\d{6}$/, { message: '验证码格式不正确' })
  code: string;
}
