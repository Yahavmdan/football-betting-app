import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../services/translate.pipe';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  template: `
    <nav class="navbar" *ngIf="authService.currentUser$ | async as user">
      <div class="nav-container">
        <div class="nav-brand">
          <a routerLink="/groups">{{ 'app.title' | translate }}</a>
        </div>
        <div class="nav-menu">
          <a routerLink="/groups" routerLinkActive="active">{{ 'nav.myGroups' | translate }}</a>
          <div class="language-switcher">
            <button
              (click)="switchLanguage('en')"
              [class.active]="currentLang === 'en'"
              class="lang-btn"
            >
              EN
            </button>
            <button
              (click)="switchLanguage('he')"
              [class.active]="currentLang === 'he'"
              class="lang-btn"
            >
              עב
            </button>
          </div>
          <div class="user-menu">
            <span class="username">{{ user.username }}</span>
            <button (click)="logout()" class="logout-btn">{{ 'nav.logout' | translate }}</button>
          </div>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      background-color: #4CAF50;
      color: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .nav-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 60px;
    }
    .nav-brand a {
      color: white;
      text-decoration: none;
      font-size: 1.25rem;
      font-weight: 600;
    }
    .nav-menu {
      display: flex;
      align-items: center;
      gap: 2rem;
    }
    .nav-menu a {
      color: white;
      text-decoration: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      transition: background-color 0.2s;
    }
    .nav-menu a:hover,
    .nav-menu a.active {
      background-color: rgba(255,255,255,0.2);
    }
    .user-menu {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .username {
      font-weight: 500;
    }
    .logout-btn {
      background-color: rgba(255,255,255,0.2);
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .logout-btn:hover {
      background-color: rgba(255,255,255,0.3);
    }
    .language-switcher {
      display: flex;
      gap: 0.25rem;
      background-color: rgba(255,255,255,0.1);
      border-radius: 4px;
      padding: 0.25rem;
    }
    .lang-btn {
      background-color: transparent;
      color: white;
      border: none;
      padding: 0.25rem 0.75rem;
      border-radius: 3px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    .lang-btn:hover {
      background-color: rgba(255,255,255,0.2);
    }
    .lang-btn.active {
      background-color: rgba(255,255,255,0.3);
    }
  `]
})
export class NavbarComponent {
  currentLang: string = 'en';

  constructor(
    public authService: AuthService,
    private router: Router,
    private translationService: TranslationService
  ) {
    this.translationService.currentLang$.subscribe(lang => {
      this.currentLang = lang;
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  switchLanguage(lang: string): void {
    this.translationService.setLanguage(lang);
  }
}
