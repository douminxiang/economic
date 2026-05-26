import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AmapService {
  private readonly apiKey = process.env.AMAP_WEB_KEY || 'fa9254f9d9fd8e972fdcb6130d7b7cc6';
  private readonly baseUrl = 'https://restapi.amap.com';

  constructor(private readonly httpService: HttpService) {}

  async reverseGeocode(lat: number, lng: number) {
    const { data } = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/v3/geocode/regeo`, {
        params: { key: this.apiKey, location: `${lng},${lat}`, output: 'JSON' },
      }),
    );
    return data;
  }

  async poiSearch(keywords: string, location?: string) {
    const params: Record<string, string> = { key: this.apiKey, keywords, output: 'JSON' };
    if (location) params.location = location;
    const { data } = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/v3/place/text`, { params }),
    );
    return data;
  }

  async direction(origin: string, destination: string, mode: string = 'driving') {
    const { data } = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/v3/direction/${mode}`, {
        params: { key: this.apiKey, origin, destination, output: 'JSON' },
      }),
    );
    return data;
  }

  async geocode(address: string, city?: string) {
    const params: Record<string, string> = { key: this.apiKey, address, output: 'JSON' };
    if (city) params.city = city;
    const { data } = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/v3/geocode/geo`, { params }),
    );
    return data;
  }
}
