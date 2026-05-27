import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(11, { message: '手机号至少11位' })
  @MaxLength(20)
  @Matches(/^\d{11}$/, { message: '手机号格式不正确' })
  phone: string;

  @IsString()
  @MinLength(6)
  @MaxLength(32)
  password: string;
}
