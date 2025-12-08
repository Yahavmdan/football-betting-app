import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RegisterCredentials } from '../../models/user.model';
import { TranslatePipe } from '../../services/translate.pipe';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe],
  template: `
    <div class="auth-container">
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
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: #f5f5f5;
    }
    .auth-card {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      width: 100%;
      max-width: 400px;
    }
    h2 {
      text-align: center;
      margin-bottom: 1.5rem;
      color: #333;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    label {
      display: block;
      margin-bottom: 0.5rem;
      color: #555;
      font-weight: 500;
    }
    .form-control {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
    }
    .form-control:focus {
      outline: none;
      border-color: #4CAF50;
    }
    .btn-primary {
      width: 100%;
      padding: 0.75rem;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
      margin-top: 1rem;
    }
    .btn-primary:hover:not(:disabled) {
      background-color: #45a049;
    }
    .btn-primary:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
    .error-message {
      color: #f44336;
      margin-top: 0.5rem;
      font-size: 0.9rem;
    }
    .auth-link {
      text-align: center;
      margin-top: 1rem;
      color: #666;
    }
    .auth-link a {
      color: #4CAF50;
      text-decoration: none;
    }
    .auth-link a:hover {
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
    private router: Router
  ) {}

  onSubmit(): void {
    this.loading = true;
    this.errorMessage = '';

    this.authService.register(this.credentials).subscribe({
      next: () => {
        this.router.navigate(['/groups']);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Registration failed. Please try again.';
        this.loading = false;
      }
    });
  }
}
