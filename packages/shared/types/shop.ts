export interface Shop {
  id: number;
  name: string;
  description: string | null;
  address: string;
  phone: string | null;
  images: string[] | null;
  rating: number;
  monthlySales: number;
  deliveryFee: number;
  minOrder: number;
  latitude: number;
  longitude: number;
  businessHours: string | null;
  categoryId: number | null;
  status: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShopListItem {
  id: number;
  name: string;
  address: string;
  images: string[] | null;
  rating: number;
  monthlySales: number;
  deliveryFee: number;
  minOrder: number;
  businessHours: string | null;
  categoryName: string | null;
}

export interface ShopDetail extends Shop {
  categoryName: string | null;
  products: ProductGroup[];
}

export interface ProductGroup {
  categoryName: string;
  products: ShopProduct[];
}

export interface ShopProduct {
  id: number;
  name: string;
  price: number;
  image: string | null;
  sales: number;
  description: string | null;
}

export interface QueryShopDto {
  page?: number;
  limit?: number;
  categoryId?: number;
  keyword?: string;
  sort?: 'recommended' | 'rating' | 'sales';
}

export interface QueryNearbyDto {
  latitude: number;
  longitude: number;
  radius?: number;
  limit?: number;
}

export interface ShopNearbyItem extends ShopListItem {
  distance: number;
}
