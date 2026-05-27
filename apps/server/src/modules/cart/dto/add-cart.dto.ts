import { IsNumber, IsPositive, Min, Max } from 'class-validator';

export class AddCartDto {
  @IsNumber()
  @IsPositive()
  productId: number;

  @IsNumber()
  @Min(1)
  @Max(99)
  quantity: number = 1;
}

export class UpdateCartDto {
  @IsNumber()
  @Min(1)
  @Max(99)
  quantity: number;
}
