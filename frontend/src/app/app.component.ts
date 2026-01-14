import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/layout/navbar.component';
import { LoadingSpinnerComponent } from './components/shared/loading-spinner.component';
import { TranslationService } from './services/translation.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, LoadingSpinnerComponent],
  template: `
    <app-loading-spinner></app-loading-spinner>
    <app-navbar></app-navbar>
    <router-outlet></router-outlet>
  `,
  styles: []
})
export class AppComponent implements OnInit {
  title = 'football-betting-frontend';

  constructor(private translationService: TranslationService) {}

  ngOnInit(): void {
    const savedLang = localStorage.getItem('language') || 'en';
    this.translationService.setLanguage(savedLang);

    // Initialize theme
    this.initializeTheme();
  }

  private initializeTheme(): void {
    const savedTheme = localStorage.getItem('theme') || 'system';
    this.applyTheme(savedTheme as 'light' | 'dark' | 'system');

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
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
