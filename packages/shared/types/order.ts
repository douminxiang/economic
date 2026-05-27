export type OrderStatus = 0 | 1 | 2 | 3 | 4 | 5;

export interface OrderItem {
  id: number;
  productId: number;
  name: string;
  image: string | null;
  price: number;
  quantity: number;
  specs: string | null;
}

export interface Order {
  id: number;
  orderNo: string;
  shopId: number;
  shopName: string;
  status: OrderStatus;
  totalAmount: number;
  deliveryFee: number;
  packagingFee: number;
  discountAmount: number;
  payAmount: number;
  payMethod: string | null;
  payTime: string | null;
  remark: string | null;
  addressSnapshot: any;
  items: OrderItem[];
  createdAt: string;
}

export interface OrderListItem {
  id: number;
  orderNo: string;
  shopName: string;
  status: OrderStatus;
  payAmount: number;
  items: Pick<OrderItem, 'name' | 'image' | 'quantity'>[];
  createdAt: string;
}
