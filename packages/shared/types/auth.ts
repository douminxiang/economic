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
  sessionId?: string;
}

export interface AuthSession {
  id: string;
  deviceId?: string | null;
  deviceName?: string | null;
  ip?: string | null;
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface AuthResponse extends AuthTokens {
  user: import('./user').User;
}
