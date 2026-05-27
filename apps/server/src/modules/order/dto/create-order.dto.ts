import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateOrderDto {
  @IsNumber()
  addressId: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class PayOrderDto {
  @IsString()
  payMethod: string = '微信支付';
}
