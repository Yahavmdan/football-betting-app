export interface User {
  id: string;
  username: string;
  email: string;
  groups?: string[];
  createdAt?: Date;
}

export interface AuthResponse {
  success: boolean;
  data: {
    id: string;
    username: string;
    email: string;
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
