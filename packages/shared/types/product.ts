export interface Product {
  id: number;
  shopId: number;
  categoryId: number | null;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  stock: number;
  sales: number;
  status: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDetail extends Product {
  shopName: string;
  shopAddress: string;
  shopRating: number;
  shopMonthlySales: number;
}

export interface QueryProductDto {
  shopId?: number;
  categoryId?: number;
  page?: number;
  limit?: number;
}
