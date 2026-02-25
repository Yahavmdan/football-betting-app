import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TranslatePipe } from '../../services/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { ToastService } from '../shared/toast/toast.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./login.component.css']
})
export class ForgotPasswordComponent {
  email = '';
  loading = false;
  sent = false;

  constructor(
    private authService: AuthService,
    private translationService: TranslationService,
    private toastService: ToastService
  ) {}

  onSubmit(): void {
    if (!this.email) return;
    this.loading = true;

    this.authService.forgotPassword(this.email).subscribe({
      next: () => {
        this.sent = true;
        this.loading = false;
      },
      error: (error) => {
        const msg = error.error?.messageKey
          ? this.translationService.translate(error.error.messageKey)
          : (error.error?.message || this.translationService.translate('auth.forgotPasswordFailed'));
        this.toastService.show(msg, 'error');
        this.loading = false;
      }
    });
  }
}
