export interface CartItemProduct {
  id: number;
  name: string;
  price: number;
  image: string | null;
  shopId: number;
  shopName: string;
}

export interface CartItem {
  id: number;
  productId: number;
  quantity: number;
  product: CartItemProduct;
}

export interface CartData {
  items: CartItem[];
  totalAmount: number;
  shopId: number | null;
  shopName: string | null;
}
