import { Controller, Get, Query } from '@nestjs/common';
import { AmapService } from './amap.service';
import { ReverseGeocodeDto } from './dto/reverse-geocode.dto';
import { PoiSearchDto } from './dto/poi-search.dto';
import { DirectionDto } from './dto/direction.dto';
import { GeocodeDto } from './dto/geocode.dto';

@Controller('amap')
export class AmapController {
  constructor(private readonly amapService: AmapService) {}

  @Get('reverse-geocode')
  reverseGeocode(@Query() dto: ReverseGeocodeDto) {
    return this.amapService.reverseGeocode(dto.lat, dto.lng);
  }

  @Get('poi-search')
  poiSearch(@Query() dto: PoiSearchDto) {
    return this.amapService.poiSearch(dto.keywords, dto.location);
  }

  @Get('direction')
  direction(@Query() dto: DirectionDto) {
    return this.amapService.direction(dto.origin, dto.destination, dto.mode);
  }

  @Get('geocode')
  geocode(@Query() dto: GeocodeDto) {
    return this.amapService.geocode(dto.address, dto.city);
  }
}
