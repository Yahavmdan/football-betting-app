import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TranslatePipe } from '../../services/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { ToastService } from '../shared/toast/toast.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./login.component.css']
})
export class ResetPasswordComponent implements OnInit {
  password = '';
  confirmPassword = '';
  token = '';
  loading = false;
  success = false;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private translationService: TranslationService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (!this.token) {
      void this.router.navigate(['/login']);
    }
  }

  get passwordMismatch(): boolean {
    return this.confirmPassword.length > 0 && this.password !== this.confirmPassword;
  }

  get passwordTooShort(): boolean {
    return this.password.length > 0 && this.password.length < 6;
  }

  onSubmit(): void {
    if (this.passwordMismatch || this.passwordTooShort || !this.token) return;
    this.loading = true;

    this.authService.resetPassword(this.token, this.password).subscribe({
      next: () => {
        this.success = true;
        this.loading = false;
      },
      error: (error) => {
        this.toastService.show(
          error.error?.message || this.translationService.translate('auth.resetPasswordFailed'),
          'error'
        );
        this.loading = false;
      }
    });
  }
}
