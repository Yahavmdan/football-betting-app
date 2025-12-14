export interface User {
  id: string;
  username: string;
  email: string;
  isAdmin?: boolean;
  groups?: string[];
  createdAt?: Date;
}

export interface AuthResponse {
  success: boolean;
  data: {
    id: string;
    username: string;
    email: string;
    isAdmin: boolean;
    token: string;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}
