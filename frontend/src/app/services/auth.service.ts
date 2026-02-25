import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { AuthResponse, LoginCredentials, RegisterCredentials, User } from '../models/user.model';
import { environment } from '../../environments/environment';
import { TranslationService } from './translation.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private translationService: TranslationService) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      this.currentUserSubject.next(JSON.parse(user));
    }
  }

  register(credentials: RegisterCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, {
      ...credentials,
      language: this.translationService.getCurrentLanguage()
    });
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, {
      ...credentials,
      language: this.translationService.getCurrentLanguage()
    }).pipe(
      tap(response => {
        if (response.success) {
          this.setAuthData(response.data);
        }
      })
    );
  }

  googleAuth(credential: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/google`, { credential }).pipe(
      tap(response => {
        if (response.success) {
          this.setAuthData(response.data);
        }
      })
    );
  }

  facebookAuth(accessToken: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/facebook`, { accessToken }).pipe(
      tap(response => {
        if (response.success) {
          this.setAuthData(response.data);
        }
      })
    );
  }

  forgotPassword(email: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(token: string, password: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/reset-password`, { token, password });
  }

  verifyEmail(email: string, otp: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/verify-email`, { email, otp });
  }

  resendVerification(email: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/resend-verification`, {
      email,
      language: this.translationService.getCurrentLanguage()
    });
  }

  logout(): void {
    // Call backend to mark user as offline
    this.http.post(`${this.apiUrl}/logout`, {}).subscribe({
      error: () => {} // Ignore errors, still clear local data
    });
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }

  setAuthDataPublic(data: { id: string; username: string; email: string; profilePicture?: string | null; isAdmin: boolean; isEmailVerified?: boolean; token: string }): void {
    this.setAuthData(data);
  }

  private setAuthData(data: { id: string; username: string; email: string; profilePicture?: string | null; isAdmin: boolean; isEmailVerified?: boolean; token: string }): void {
    localStorage.setItem('token', data.token);
    const user: User = {
      id: data.id,
      username: data.username,
      email: data.email,
      profilePicture: data.profilePicture || null,
      isAdmin: data.isAdmin,
      isEmailVerified: data.isEmailVerified ?? false
    };
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  updateCurrentUser(updates: Partial<User>): void {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      this.currentUserSubject.next(updatedUser);
    }
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.isAdmin === true;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }
}
