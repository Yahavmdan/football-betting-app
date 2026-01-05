import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../services/translate.pipe';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  template: `
    <nav class="navbar" *ngIf="authService.currentUser$ | async as user">
      <div class="nav-container">
        <div class="nav-brand">
          <a routerLink="/groups">
            <img src="assets/utilities/app-logo.png" alt="Football Betting" class="app-logo">
          </a>
        </div>

        <!-- Hamburger button for mobile -->
        <button class="hamburger" (click)="toggleMobileMenu()" [class.open]="mobileMenuOpen">
          <span></span>
          <span></span>
          <span></span>
        </button>

        <!-- Desktop menu -->
        <div class="nav-menu desktop-menu">
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
            <a routerLink="/profile" class="user-profile-link">
              <img
                *ngIf="user.profilePicture"
                [src]="getProfilePictureUrl(user.profilePicture)"
                alt="Profile"
                class="nav-profile-picture"
                (error)="onImageError($event)"
              />
              <span *ngIf="!user.profilePicture" class="nav-profile-placeholder">
                {{ user.username.charAt(0).toUpperCase() }}
              </span>
              <span class="username">{{ user.username }}</span>
            </a>
            <button (click)="logout()" class="logout-btn">{{ 'nav.logout' | translate }}</button>
          </div>
        </div>

        <!-- Mobile dropdown menu -->
        <div class="mobile-menu" [class.open]="mobileMenuOpen">
          <a routerLink="/groups" routerLinkActive="active" (click)="closeMobileMenu()">{{ 'nav.myGroups' | translate }}</a>
          <a routerLink="/profile" class="mobile-user-info" (click)="closeMobileMenu()">
            <img
              *ngIf="user.profilePicture"
              [src]="getProfilePictureUrl(user.profilePicture)"
              alt="Profile"
              class="nav-profile-picture mobile"
              (error)="onImageError($event)"
            />
            <span *ngIf="!user.profilePicture" class="nav-profile-placeholder mobile">
              {{ user.username.charAt(0).toUpperCase() }}
            </span>
            <span class="username">{{ user.username }}</span>
          </a>
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
          <button (click)="logout()" class="logout-btn mobile-logout">{{ 'nav.logout' | translate }}</button>
        </div>
      </div>

      <!-- Overlay for mobile menu -->
      <div class="mobile-overlay" *ngIf="mobileMenuOpen" (click)="closeMobileMenu()"></div>
    </nav>
  `,
  styles: [`
    .navbar {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(10px);
    }
    .nav-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 70px;
    }
    .nav-brand a {
      display: flex;
      align-items: center;
      text-decoration: none;
      transition: all 0.3s ease;
    }
    .nav-brand a:hover {
      transform: scale(1.02);
    }
    .app-logo {
      height: 50px;
      width: auto;
      object-fit: contain;
    }
    .nav-menu {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }
    .nav-menu a {
      color: rgba(255, 255, 255, 0.85);
      text-decoration: none;
      padding: 0.6rem 1.2rem;
      border-radius: 10px;
      transition: all 0.3s ease;
      font-weight: 500;
      font-size: 0.95rem;
      position: relative;
    }
    .nav-menu a::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 2px;
      background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
      transition: width 0.3s ease;
      border-radius: 2px;
    }
    .nav-menu a:hover {
      color: white;
      background-color: rgba(255, 255, 255, 0.08);
    }
    .nav-menu a:hover::after,
    .nav-menu a.active::after {
      width: 60%;
    }
    .nav-menu a.active {
      color: white;
      background-color: rgba(255, 255, 255, 0.1);
    }
    .user-menu {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .user-profile-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-decoration: none;
      padding: 0.4rem 1rem 0.4rem 0.4rem;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 25px;
      transition: all 0.3s ease;
    }
    .user-profile-link:hover {
      background: rgba(255, 255, 255, 0.15);
    }
    .nav-profile-picture {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #4ade80;
    }
    .nav-profile-picture.mobile {
      width: 36px;
      height: 36px;
    }
    .nav-profile-placeholder {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
      font-weight: 700;
      color: white;
    }
    .nav-profile-placeholder.mobile {
      width: 36px;
      height: 36px;
      font-size: 1rem;
    }
    .username {
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
      font-size: 0.9rem;
    }
    .logout-btn {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
      border: none;
      padding: 0.6rem 1.2rem;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 600;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
    }
    .logout-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
    }
    .language-switcher {
      display: flex;
      gap: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 4px;
    }
    .lang-btn {
      background-color: transparent;
      color: rgba(255, 255, 255, 0.7);
      border: none;
      padding: 0.4rem 0.9rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 600;
      transition: all 0.3s ease;
    }
    .lang-btn:hover {
      background-color: rgba(255, 255, 255, 0.15);
      color: white;
    }
    .lang-btn.active {
      background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
      color: white;
      box-shadow: 0 2px 8px rgba(74, 222, 128, 0.3);
    }

    /* Hamburger button */
    .hamburger {
      display: none;
      flex-direction: column;
      justify-content: space-around;
      width: 28px;
      height: 22px;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
      z-index: 1001;
    }
    .hamburger span {
      width: 100%;
      height: 3px;
      background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
      border-radius: 3px;
      transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }
    .hamburger.open span:nth-child(1) {
      transform: rotate(45deg) translate(6px, 6px);
    }
    .hamburger.open span:nth-child(2) {
      opacity: 0;
      transform: translateX(-10px);
    }
    .hamburger.open span:nth-child(3) {
      transform: rotate(-45deg) translate(6px, -6px);
    }

    /* Mobile menu */
    .mobile-menu {
      display: none;
      position: absolute;
      top: 70px;
      left: 0;
      right: 0;
      background: linear-gradient(180deg, #16213e 0%, #1a1a2e 100%);
      flex-direction: column;
      padding: 1.5rem;
      gap: 0.75rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      transform: translateY(-120%);
      transition: transform 0.2s ease-out;
      border-bottom-left-radius: 20px;
      border-bottom-right-radius: 20px;
    }
    .mobile-menu.open {
      transform: translateY(0);
    }
    .mobile-menu a {
      color: rgba(255, 255, 255, 0.85);
      text-decoration: none;
      padding: 1rem 1.25rem;
      border-radius: 12px;
      transition: all 0.3s ease;
      font-weight: 500;
    }
    .mobile-menu a:hover,
    .mobile-menu a.active {
      background: rgba(74, 222, 128, 0.15);
      color: #4ade80;
    }
    .mobile-user-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      margin: 0.5rem 0;
      text-decoration: none;
      color: rgba(255, 255, 255, 0.9);
      transition: all 0.3s ease;
    }
    .mobile-user-info:hover {
      background: rgba(74, 222, 128, 0.1);
    }
    .mobile-logout {
      width: 100%;
      text-align: center;
      padding: 1rem 1.25rem;
      margin-top: 0.5rem;
    }
    .mobile-overlay {
      display: none;
      position: fixed;
      top: 70px;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 999;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .nav-container {
        padding: 0 1.25rem;
        position: relative;
      }
      .nav-brand {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
      }
      .desktop-menu {
        display: none;
      }
      .hamburger {
        display: flex;
        position: absolute;
        left: 1.25rem;
      }
      .mobile-menu {
        display: flex;
      }
      .mobile-overlay {
        display: block;
      }
      .app-logo {
        height: 60px;
      }
    }
  `]
})
export class NavbarComponent {
  currentLang: string = 'en';
  mobileMenuOpen: boolean = false;
  private apiBaseUrl = environment.apiUrl.replace('/api', '');

  constructor(
    public authService: AuthService,
    private router: Router,
    private translationService: TranslationService
  ) {
    this.translationService.currentLang$.subscribe(lang => {
      this.currentLang = lang;
    });
  }

  getProfilePictureUrl(path: string): string {
    if (!path) return '';
    // Cloudinary URLs are already full URLs
    return path;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  logout(): void {
    this.closeMobileMenu();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  switchLanguage(lang: string): void {
    this.translationService.setLanguage(lang);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }
}
