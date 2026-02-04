import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginCredentials } from '../../models/user.model';
import { TranslatePipe } from '../../services/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { ToastService } from '../shared/toast/toast.service';
import { REDIRECT_URL_KEY } from '../../guards/auth.guard';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  credentials: LoginCredentials = {
    email: '',
    password: ''
  };
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private translationService: TranslationService,
    private toastService: ToastService
  ) {}

  onSubmit(): void {
    this.loading = true;

    this.authService.login(this.credentials).subscribe({
      next: () => {
        // Check for saved redirect URL (e.g., from join link)
        const redirectUrl = sessionStorage.getItem(REDIRECT_URL_KEY);
        if (redirectUrl) {
          sessionStorage.removeItem(REDIRECT_URL_KEY);
          void this.router.navigateByUrl(redirectUrl);
        } else {
          void this.router.navigate(['/groups']);
        }
      },
      error: (error) => {
        this.toastService.show(error.error?.message || this.translationService.translate('auth.loginFailed'), 'error');
        this.loading = false;
      }
    });
  }
}
