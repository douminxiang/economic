import { IsString, Matches } from 'class-validator';

export class SendCodeDto {
  @IsString()
  @Matches(/^\d{11}$/, { message: '手机号格式不正确' })
  phone: string;
}
