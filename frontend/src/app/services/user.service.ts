import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/user.model';
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
}
