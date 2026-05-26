export interface User {
  id: number;
  phone: string;
  nickname: string | null;
  avatar: string | null;
  gender: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserDto {
  nickname?: string;
  avatar?: string;
  gender?: number;
}
