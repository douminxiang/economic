import { useQuery } from '@tanstack/react-query';
import { amapApi } from '../services/api';

export function useReverseGeocode(lat: number | null, lng: number | null) {
  return useQuery({
    queryKey: ['amap', 'reverse-geocode', lat, lng],
    queryFn: () => amapApi.reverseGeocode(lat!, lng!),
    enabled: lat !== null && lng !== null,
    staleTime: 10 * 60 * 1000,
  });
}

export function usePoiSearch(keywords: string) {
  return useQuery({
    queryKey: ['amap', 'poi-search', keywords],
    queryFn: () => amapApi.poiSearch(keywords),
    enabled: keywords.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDirection(origin: string, destination: string, mode: string = 'driving') {
  return useQuery({
    queryKey: ['amap', 'direction', origin, destination, mode],
    queryFn: () => amapApi.direction(origin, destination, mode),
    enabled: !!origin && !!destination,
  });
}
