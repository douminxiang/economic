import { Injectable, BadRequestException, BadGatewayException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class AmapService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://restapi.amap.com';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const key = this.configService.get<string>('AMAP_WEB_KEY');
    if (!key) {
      throw new Error('AMAP_WEB_KEY environment variable is not set');
    }
    this.apiKey = key;
  }

  private handleAmapResponse(data: any) {
    if (data.status === '0') {
      throw new BadRequestException(data.info || '高德地图请求失败');
    }
    return data;
  }

  async reverseGeocode(lat: number, lng: number) {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/v3/geocode/regeo`, {
          params: { key: this.apiKey, location: `${lng},${lat}`, output: 'JSON' },
        }),
      );
      return this.handleAmapResponse(data);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadGatewayException('调用高德地图逆地理编码接口失败');
    }
  }

  async poiSearch(keywords: string, location?: string) {
    try {
      const params: Record<string, string> = { key: this.apiKey, keywords, output: 'JSON' };
      if (location) params.location = location;
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/v3/place/text`, { params }),
      );
      return this.handleAmapResponse(data);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadGatewayException('调用高德地图POI搜索接口失败');
    }
  }

  async direction(origin: string, destination: string, mode: string = 'driving') {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/v3/direction/${mode}`, {
          params: { key: this.apiKey, origin, destination, output: 'JSON' },
        }),
      );
      return this.handleAmapResponse(data);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadGatewayException('调用高德地图路径规划接口失败');
    }
  }

  async geocode(address: string, city?: string) {
    try {
      const params: Record<string, string> = { key: this.apiKey, address, output: 'JSON' };
      if (city) params.city = city;
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/v3/geocode/geo`, { params }),
      );
      return this.handleAmapResponse(data);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadGatewayException('调用高德地图地理编码接口失败');
    }
  }
}
