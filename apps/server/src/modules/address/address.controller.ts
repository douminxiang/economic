import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('addresses')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get()
  findAll(@CurrentUser('id') userId: number) {
    return this.addressService.findAll(userId);
  }

  @Post()
  create(@CurrentUser('id') userId: number, @Body() dto: CreateAddressDto) {
    return this.addressService.create(userId, dto);
  }

  @Patch(':id')
  update(@CurrentUser('id') userId: number, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAddressDto) {
    return this.addressService.update(userId, id, dto);
  }

  @Delete(':id')
  delete(@CurrentUser('id') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.addressService.delete(userId, id);
  }
}
