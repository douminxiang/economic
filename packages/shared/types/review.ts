export interface Review {
  id: number;
  orderId: number;
  userId: number;
  userNickname: string;
  userAvatar: string | null;
  rating: number;
  tasteRating: number | null;
  packRating: number | null;
  deliveryRating: number | null;
  content: string | null;
  images: string[] | null;
  tags: string[] | null;
  createdAt: string;
}
