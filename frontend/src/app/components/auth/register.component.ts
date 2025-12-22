import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RegisterCredentials } from '../../models/user.model';
import { TranslatePipe } from '../../services/translate.pipe';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe],
  template: `
    <div class="auth-container">
      <div class="logo-container">
        <img src="assets/utilities/app-logo.png" alt="Logo" class="auth-logo">
      </div>
      <div class="auth-card">
        <h2>{{ 'auth.register' | translate }}</h2>
        <form (ngSubmit)="onSubmit()" #registerForm="ngForm">
          <div class="form-group">
            <label for="username">{{ 'auth.username' | translate }}</label>
            <input
              type="text"
              id="username"
              name="username"
              [(ngModel)]="credentials.username"
              required
              minlength="3"
              maxlength="30"
              class="form-control"
            />
          </div>
          <div class="form-group">
            <label for="email">{{ 'auth.email' | translate }}</label>
            <input
              type="email"
              id="email"
              name="email"
              [(ngModel)]="credentials.email"
              required
              email
              class="form-control"
            />
          </div>
          <div class="form-group">
            <label for="password">{{ 'auth.password' | translate }}</label>
            <input
              type="password"
              id="password"
              name="password"
              [(ngModel)]="credentials.password"
              required
              minlength="6"
              class="form-control"
            />
          </div>
          <div *ngIf="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>
          <button type="submit" [disabled]="!registerForm.valid || loading" class="btn-primary">
            {{ loading ? ('auth.loading' | translate) : ('auth.register' | translate) }}
          </button>
        </form>
        <p class="auth-link">
          {{ 'auth.alreadyHaveAccount' | translate }} <a routerLink="/login">{{ 'auth.loginHere' | translate }}</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      padding: 2rem;
      position: relative;
      overflow: hidden;
      gap: 2rem;
    }
    .auth-container::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(74, 222, 128, 0.1) 0%, transparent 50%);
      animation: pulse 15s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 0.5; }
      50% { transform: scale(1.1); opacity: 0.8; }
    }
    .auth-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      padding: 2rem;
      border-radius: 24px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
      width: 100%;
      max-width: 380px;
      position: relative;
      z-index: 1;
      animation: slideUp 0.5s ease-out;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .logo-container {
      text-align: center;
      z-index: 1;
    }
    .auth-logo {
      height: 120px;
      width: auto;
      object-fit: contain;
      filter: drop-shadow(0 4px 20px rgba(0, 0, 0, 0.3));
    }
    h2 {
      text-align: center;
      margin-bottom: 1.5rem;
      color: #1a1a2e;
      font-size: 1.5rem;
      font-weight: 700;
      font-family: 'Poppins', sans-serif;
    }
    .form-group {
      margin-bottom: 1.25rem;
    }
    label {
      display: block;
      margin-bottom: 0.6rem;
      color: #4a5568;
      font-weight: 600;
      font-size: 0.9rem;
      letter-spacing: 0.025em;
    }
    .form-control {
      width: 100%;
      padding: 1rem 1.25rem;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      font-size: 1rem;
      transition: all 0.3s ease;
      background: #f8fafc;
      color: #1a202c;
    }
    .form-control:focus {
      outline: none;
      border-color: #4ade80;
      background: white;
      box-shadow: 0 0 0 4px rgba(74, 222, 128, 0.15);
    }
    .form-control::placeholder {
      color: #a0aec0;
    }
    .btn-primary {
      width: 100%;
      padding: 1rem;
      background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      margin-top: 1.5rem;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(74, 222, 128, 0.4);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(74, 222, 128, 0.5);
    }
    .btn-primary:active:not(:disabled) {
      transform: translateY(0);
    }
    .btn-primary:disabled {
      background: linear-gradient(135deg, #cbd5e0 0%, #a0aec0 100%);
      box-shadow: none;
      cursor: not-allowed;
      transform: none;
    }
    .error-message {
      color: #ef4444;
      margin-top: 1rem;
      font-size: 0.9rem;
      padding: 0.75rem 1rem;
      background: #fee2e2;
      border-radius: 10px;
      border-left: 4px solid #ef4444;
    }
    .auth-link {
      text-align: center;
      margin-top: 2rem;
      color: #64748b;
      font-size: 0.95rem;
    }
    .auth-link a {
      color: #22c55e;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.2s ease;
    }
    .auth-link a:hover {
      color: #16a34a;
      text-decoration: underline;
    }
  `]
})
export class RegisterComponent {
  credentials: RegisterCredentials = {
    username: '',
    email: '',
    password: ''
  };
  errorMessage = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private translationService: TranslationService
  ) {}

  onSubmit(): void {
    this.loading = true;
    this.errorMessage = '';

    this.authService.register(this.credentials).subscribe({
      next: () => {
        this.router.navigate(['/groups']);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || this.translationService.translate('auth.registerFailed');
        this.loading = false;
      }
    });
  }
}
