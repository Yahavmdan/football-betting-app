import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User, UserSettings, TelegramSettings } from '../models/user.model';
import { environment } from '../../environments/environment';

export interface ProfileResponse {
  success: boolean;
  data: User;
}

export interface UpdateProfileData {
  username?: string;
  email?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateSettingsData {
  language?: 'en' | 'he';
  theme?: 'light' | 'dark' | 'system';
  autoBet?: boolean;
}

export interface TelegramLinkCodeResponse {
  success: boolean;
  data: {
    code: string;
    expiresAt: Date;
    botUsername: string;
  };
}

export interface TelegramStatusResponse {
  success: boolean;
  data: {
    telegram: TelegramSettings;
  };
}

export interface UpdateTelegramSettingsData {
  reminderEnabled?: boolean;
  reminderMinutes?: 5 | 10 | 15 | 30 | 60;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getProfile(): Observable<ProfileResponse> {
    return this.http.get<ProfileResponse>(`${this.apiUrl}/profile`);
  }

  updateProfile(data: UpdateProfileData): Observable<{ success: boolean; message: string; data: User }> {
    return this.http.put<{ success: boolean; message: string; data: User }>(`${this.apiUrl}/profile`, data);
  }

  changePassword(data: ChangePasswordData): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(`${this.apiUrl}/password`, data);
  }

  uploadProfilePicture(file: File): Observable<{ success: boolean; message: string; data: { profilePicture: string } }> {
    const formData = new FormData();
    formData.append('profilePicture', file);
    return this.http.post<{ success: boolean; message: string; data: { profilePicture: string } }>(
      `${this.apiUrl}/profile-picture`,
      formData
    );
  }

  deleteProfilePicture(): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/profile-picture`);
  }

  deleteAccount(password: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/account`, {
      body: { password }
    });
  }

  updateSettings(data: UpdateSettingsData): Observable<{ success: boolean; message: string; data: { settings: UserSettings } }> {
    return this.http.put<{ success: boolean; message: string; data: { settings: UserSettings } }>(`${this.apiUrl}/settings`, data);
  }

  // Telegram methods
  generateTelegramLinkCode(): Observable<TelegramLinkCodeResponse> {
    return this.http.post<TelegramLinkCodeResponse>(`${this.apiUrl}/telegram/generate-link-code`, {});
  }

  unlinkTelegram(): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/telegram/unlink`);
  }

  updateTelegramSettings(data: UpdateTelegramSettingsData): Observable<TelegramStatusResponse> {
    return this.http.put<TelegramStatusResponse>(`${this.apiUrl}/telegram/settings`, data);
  }

  getTelegramStatus(): Observable<TelegramStatusResponse> {
    return this.http.get<TelegramStatusResponse>(`${this.apiUrl}/telegram/status`);
  }
}
