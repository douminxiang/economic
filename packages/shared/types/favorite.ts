export interface FavoriteShop {
  id: number;
  shopId: number;
  shopName: string;
  shopImage: string | null;
  rating: number;
  monthlySales: number;
  minOrder: number;
  createdAt: string;
}
