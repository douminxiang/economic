import { Controller, Get, Query } from '@nestjs/common';
import { AmapService } from './amap.service';

@Controller('amap')
export class AmapController {
  constructor(private readonly amapService: AmapService) {}

  @Get('reverse-geocode')
  reverseGeocode(@Query('lat') lat: string, @Query('lng') lng: string) {
    return this.amapService.reverseGeocode(parseFloat(lat), parseFloat(lng));
  }

  @Get('poi-search')
  poiSearch(@Query('keywords') keywords: string, @Query('location') location?: string) {
    return this.amapService.poiSearch(keywords, location);
  }

  @Get('direction')
  direction(
    @Query('origin') origin: string,
    @Query('destination') destination: string,
    @Query('mode') mode?: string,
  ) {
    return this.amapService.direction(origin, destination, mode);
  }

  @Get('geocode')
  geocode(@Query('address') address: string, @Query('city') city?: string) {
    return this.amapService.geocode(address, city);
  }
}
