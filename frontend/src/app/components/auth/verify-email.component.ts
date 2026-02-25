import { Component, OnInit, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TranslatePipe } from '../../services/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { ToastService } from '../shared/toast/toast.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe],
  templateUrl: './verify-email.component.html',
  styleUrls: ['./login.component.css', './verify-email.component.css']
})
export class VerifyEmailComponent implements OnInit {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  digits: string[] = ['', '', '', '', '', ''];
  email = '';
  loading = false;
  resendLoading = false;
  resendCooldown = 0;
  success = false;
  private cooldownInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private translationService: TranslationService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.email = history.state?.email || '';
    if (!this.email) {
      void this.router.navigate(['/login']);
      return;
    }
    this.startCooldown();
  }

  onDigitInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (!/^\d$/.test(value)) {
      this.digits[index] = '';
      input.value = '';
      return;
    }

    this.digits[index] = value;

    if (index < 5) {
      const inputs = this.otpInputs.toArray();
      inputs[index + 1]?.nativeElement.focus();
    }

    if (this.digits.every(d => d !== '')) {
      this.submitOTP();
    }
  }

  onKeyDown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.digits[index] && index > 0) {
      const inputs = this.otpInputs.toArray();
      this.digits[index - 1] = '';
      inputs[index - 1]?.nativeElement.focus();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text')?.trim() || '';
    const nums = pasted.replace(/\D/g, '').slice(0, 6);
    if (nums.length === 6) {
      this.digits = nums.split('');
      const inputs = this.otpInputs.toArray();
      inputs[5]?.nativeElement.focus();
      this.submitOTP();
    }
  }

  submitOTP(): void {
    const otp = this.digits.join('');
    if (otp.length !== 6) return;
    this.loading = true;

    this.authService.verifyEmail(this.email, otp).subscribe({
      next: (response) => {
        this.success = true;
        this.loading = false;
        if (response.data) {
          this.authService.setAuthDataPublic(response.data);
          setTimeout(() => void this.router.navigate(['/home']), 1500);
        }
      },
      error: (err) => {
        this.toastService.show(
          err.error?.message || this.translationService.translate('auth.verificationFailed'),
          'error'
        );
        this.loading = false;
        this.digits = ['', '', '', '', '', ''];
        setTimeout(() => {
          const inputs = this.otpInputs.toArray();
          inputs[0]?.nativeElement.focus();
        });
      }
    });
  }

  get isIncomplete(): boolean {
    return this.digits.some(d => d === '');
  }

  resendCode(): void {
    if (this.resendCooldown > 0 || this.resendLoading) return;
    this.resendLoading = true;

    this.authService.resendVerification(this.email).subscribe({
      next: () => {
        this.toastService.show(
          this.translationService.translate('auth.otpResent'),
          'success'
        );
        this.resendLoading = false;
        this.startCooldown();
      },
      error: (err) => {
        this.toastService.show(
          err.error?.message || this.translationService.translate('auth.resendFailed'),
          'error'
        );
        this.resendLoading = false;
      }
    });
  }

  private startCooldown(): void {
    this.resendCooldown = 60;
    if (this.cooldownInterval) clearInterval(this.cooldownInterval);
    this.cooldownInterval = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0 && this.cooldownInterval) {
        clearInterval(this.cooldownInterval);
        this.cooldownInterval = null;
      }
    }, 1000);
  }
}
