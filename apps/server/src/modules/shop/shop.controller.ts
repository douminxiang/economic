import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ShopService } from './shop.service';
import { QueryShopDto } from './dto/query-shop.dto';

@Controller('shops')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get()
  findAll(@Query() query: QueryShopDto) {
    return this.shopService.findAll(query);
  }

  @Get('recommended')
  findRecommended() {
    return this.shopService.findRecommended();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.shopService.findOne(id);
  }
}
