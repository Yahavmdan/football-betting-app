import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/layout/navbar.component';
import { LoadingSpinnerComponent } from './components/shared/loading-spinner/loading-spinner.component';
import { FeedbackButtonComponent } from './components/shared/feedback-button/feedback-button.component';
import { ToastComponent } from './components/shared/toast/toast.component';
import { TranslationService } from './services/translation.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, LoadingSpinnerComponent, FeedbackButtonComponent, ToastComponent, CommonModule],
  templateUrl: './app.component.html',
  styles: []
})
export class AppComponent implements OnInit, OnDestroy {
  private hiddenTime: number | null = null;
  private readonly REFRESH_THRESHOLD_MS = 30000; // 30 seconds

  constructor(
    private translationService: TranslationService,
    public authService: AuthService,
    private router: Router,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    const savedLang = localStorage.getItem('language') || 'en';
    this.translationService.setLanguage(savedLang);

    // Initialize theme
    this.initializeTheme();

    // Listen for tab visibility changes to refresh content when returning after being away
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      // Tab is now hidden, record the time
      this.hiddenTime = Date.now();
    } else {
      // Tab is now visible
      if (this.hiddenTime) {
        const hiddenDuration = Date.now() - this.hiddenTime;
        this.hiddenTime = null;

        // If the tab was hidden for more than the threshold, refresh the current route
        if (hiddenDuration > this.REFRESH_THRESHOLD_MS && this.authService.isAuthenticated()) {
          this.ngZone.run(() => {
            // Force refresh by navigating to the same URL
            const currentUrl = this.router.url;
            this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
              this.router.navigateByUrl(currentUrl);
            });
          });
        }
      }
    }
  };

  private initializeTheme(): void {
    const savedTheme = localStorage.getItem('theme') || 'system';
    this.applyTheme(savedTheme as 'light' | 'dark' | 'system');

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const currentTheme = localStorage.getItem('theme') || 'system';
      if (currentTheme === 'system') {
        this.applyTheme('system');
      }
    });
  }

  private applyTheme(theme: 'light' | 'dark' | 'system'): void {
    const htmlElement = document.documentElement;
    htmlElement.classList.remove('light-theme', 'dark-theme');

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      htmlElement.classList.add(prefersDark ? 'dark-theme' : 'light-theme');
    } else {
      htmlElement.classList.add(`${theme}-theme`);
    }
  }
}
