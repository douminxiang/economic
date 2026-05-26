import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ProductService } from './product.service';
import { QueryProductDto } from './dto/query-product.dto';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  findAll(@Query() query: QueryProductDto) {
    return this.productService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findOne(id);
  }
}
