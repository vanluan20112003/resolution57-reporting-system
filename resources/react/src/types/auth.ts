// Authentication related TypeScript interfaces and types

export interface LoginFormData {
  email: string;
  password: string;
  remember?: boolean;
}

export interface User {
  sub?: string;
  username?: string;
  preferred_username?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  middle_name?: string;
  nickname?: string;
  birthdate?: string;
  gender?: string;
  phone_number?: string;
  phone_number_verified?: boolean;
  address?: string | object;
  department?: string;
  locale?: string;
  zoneinfo?: string;
  updated_at?: number;
  roles?: string[];
}

export interface AuthContextType {
  user: User | null;
  authenticated: boolean;
  loading: boolean;
  login: (formData: LoginFormData) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export interface TokenData {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  user?: User;
}
