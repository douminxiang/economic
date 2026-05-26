export interface RegisterDto {
  phone: string;
  password: string;
  nickname?: string;
}

export interface LoginDto {
  phone: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: import('./user').User;
}
