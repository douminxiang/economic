export interface Address {
  id: number;
  userId: number;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

export interface CreateAddressDto {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  latitude: number;
  longitude: number;
  isDefault?: boolean;
}

export interface UpdateAddressDto extends Partial<CreateAddressDto> {}
