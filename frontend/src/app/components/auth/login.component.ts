import { Component, OnInit, AfterViewInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginCredentials } from '../../models/user.model';
import { TranslatePipe } from '../../services/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { ToastService } from '../shared/toast/toast.service';
import { REDIRECT_URL_KEY } from '../../guards/auth.guard';
import { environment } from '../../../environments/environment';

declare const google: any;
declare const FB: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, AfterViewInit {
  credentials: LoginCredentials = {
    email: '',
    password: ''
  };
  loading = false;
  googleLoading = false;
  facebookLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private translationService: TranslationService,
    private toastService: ToastService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadGoogleScript();
    this.loadFacebookScript();
  }

  ngAfterViewInit(): void {
    this.initializeGoogleSignIn();
  }

  private loadGoogleScript(): void {
    if (document.getElementById('google-signin-script')) return;

    const script = document.createElement('script');
    script.id = 'google-signin-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => this.initializeGoogleSignIn();
    document.head.appendChild(script);
  }

  private loadFacebookScript(): void {
    if (document.getElementById('facebook-jssdk')) return;

    (window as any).fbAsyncInit = () => {
      FB.init({
        appId: environment.facebookAppId,
        cookie: true,
        xfbml: true,
        version: 'v18.0'
      });
    };

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }

  private initializeGoogleSignIn(): void {
    if (typeof google === 'undefined') return;

    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: any) => this.handleGoogleCallback(response),
      ux_mode: 'popup'
    });

    const container = document.getElementById('google-btn-hidden');
    if (container) {
      google.accounts.id.renderButton(container, {
        type: 'icon',
        size: 'large'
      });
    }
  }

  triggerGoogleSignIn(): void {
    if (typeof google === 'undefined') return;
    const btn = document.querySelector('#google-btn-hidden div[role="button"]') as HTMLElement;
    if (btn) {
      btn.click();
    } else {
      google.accounts.id.prompt();
    }
  }

  triggerFacebookSignIn(): void {
    if (typeof FB === 'undefined') return;

    FB.login((response: any) => {
      if (response.authResponse) {
        this.handleFacebookCallback(response.authResponse.accessToken);
      }
    }, { scope: 'email,public_profile' });
  }

  private handleGoogleCallback(response: any): void {
    this.ngZone.run(() => {
      this.googleLoading = true;

      this.authService.googleAuth(response.credential).subscribe({
        next: () => {
          const redirectUrl = sessionStorage.getItem(REDIRECT_URL_KEY);
          if (redirectUrl) {
            sessionStorage.removeItem(REDIRECT_URL_KEY);
            void this.router.navigateByUrl(redirectUrl);
          } else {
            void this.router.navigate(['/home']);
          }
        },
        error: (error) => {
          this.toastService.show(error.error?.message || this.translationService.translate('auth.loginFailed'), 'error');
          this.googleLoading = false;
        }
      });
    });
  }

  private handleFacebookCallback(accessToken: string): void {
    this.ngZone.run(() => {
      this.facebookLoading = true;

      this.authService.facebookAuth(accessToken).subscribe({
        next: () => {
          const redirectUrl = sessionStorage.getItem(REDIRECT_URL_KEY);
          if (redirectUrl) {
            sessionStorage.removeItem(REDIRECT_URL_KEY);
            void this.router.navigateByUrl(redirectUrl);
          } else {
            void this.router.navigate(['/home']);
          }
        },
        error: (error) => {
          this.toastService.show(error.error?.message || this.translationService.translate('auth.loginFailed'), 'error');
          this.facebookLoading = false;
        }
      });
    });
  }

  onSubmit(): void {
    this.loading = true;

    this.authService.login(this.credentials).subscribe({
      next: () => {
        const redirectUrl = sessionStorage.getItem(REDIRECT_URL_KEY);
        if (redirectUrl) {
          sessionStorage.removeItem(REDIRECT_URL_KEY);
          void this.router.navigateByUrl(redirectUrl);
        } else {
          void this.router.navigate(['/home']);
        }
      },
      error: (error) => {
        if (error.error?.message === 'EMAIL_NOT_VERIFIED') {
          void this.router.navigate(['/verify-email'], {
            state: { email: error.error.email }
          });
          return;
        }
        this.toastService.show(error.error?.message || this.translationService.translate('auth.loginFailed'), 'error');
        this.loading = false;
      }
    });
  }
}
