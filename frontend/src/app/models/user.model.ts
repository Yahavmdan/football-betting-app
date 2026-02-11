export interface TelegramSettings {
  chatId?: string | null;
  isLinked: boolean;
  linkedAt?: Date | null;
  reminderEnabled: boolean;
  reminderMinutes: 5 | 10 | 15 | 30 | 60;
}

export interface UserSettings {
  language: 'en' | 'he';
  theme: 'light' | 'dark' | 'system';
  autoBet: boolean;
  telegram?: TelegramSettings;
}

export interface User {
  id: string;
  username: string;
  email: string;
  profilePicture?: string | null;
  isAdmin?: boolean;
  groups?: string[];
  settings?: UserSettings;
  lastActive?: Date;
  createdAt?: Date;
  hasPassword?: boolean;
}

export interface AuthResponse {
  success: boolean;
  data: {
    id: string;
    username: string;
    email: string;
    profilePicture?: string | null;
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
