import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { TranslatePipe } from '../../services/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { User } from '../../models/user.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe],
  template: `
    <div class="container">
      <button class="back-btn" routerLink="/groups">{{ 'groups.backToGroups' | translate }}</button>

      <div class="profile-card">
        <h1>{{ 'profile.title' | translate }}</h1>

        <!-- Profile Picture Section -->
        <div class="profile-picture-section">
          <div class="profile-picture-container">
            <img
              *ngIf="currentUser?.profilePicture"
              [src]="getProfilePictureUrl(currentUser?.profilePicture || '')"
              alt="Profile"
              class="profile-picture"
              (error)="onImageError($event)"
            />
            <div *ngIf="!currentUser?.profilePicture" class="profile-picture-placeholder">
              {{ getInitial() }}
            </div>
          </div>
          <div class="profile-picture-actions">
            <label class="btn-upload">
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                (change)="onFileSelected($event)"
                hidden
              />
              {{ 'profile.uploadPicture' | translate }}
            </label>
            <button
              *ngIf="currentUser?.profilePicture"
              (click)="deleteProfilePicture()"
              class="btn-remove-picture"
              [disabled]="loadingPicture"
            >
              {{ 'profile.removePicture' | translate }}
            </button>
          </div>
          <div *ngIf="pictureError" class="error-message small">{{ pictureError }}</div>
          <div *ngIf="pictureSuccess" class="success-message small">{{ pictureSuccess }}</div>
        </div>

        <!-- Profile Info Section -->
        <div class="section">
          <h2>{{ 'profile.accountInfo' | translate }}</h2>
          <form (ngSubmit)="updateProfile()">
            <div class="form-group">
              <label>{{ 'auth.username' | translate }}</label>
              <input
                type="text"
                [(ngModel)]="profileData.username"
                name="username"
                class="form-control"
                [placeholder]="'auth.username' | translate"
                minlength="3"
                maxlength="30"
              />
            </div>
            <div class="form-group">
              <label>{{ 'auth.email' | translate }}</label>
              <input
                type="email"
                [(ngModel)]="profileData.email"
                name="email"
                class="form-control"
                [placeholder]="'auth.email' | translate"
              />
            </div>
            <div *ngIf="profileError" class="error-message">{{ profileError }}</div>
            <div *ngIf="profileSuccess" class="success-message">{{ profileSuccess }}</div>
            <button type="submit" [disabled]="loadingProfile" class="btn-primary">
              {{ loadingProfile ? ('auth.loading' | translate) : ('common.save' | translate) }}
            </button>
          </form>
        </div>

        <!-- Change Password Section -->
        <div class="section">
          <h2>{{ 'profile.changePassword' | translate }}</h2>
          <form (ngSubmit)="changePassword()">
            <div class="form-group">
              <label>{{ 'profile.currentPassword' | translate }}</label>
              <input
                type="password"
                [(ngModel)]="passwordData.currentPassword"
                name="currentPassword"
                class="form-control"
                [placeholder]="'profile.currentPassword' | translate"
              />
            </div>
            <div class="form-group">
              <label>{{ 'profile.newPassword' | translate }}</label>
              <input
                type="password"
                [(ngModel)]="passwordData.newPassword"
                name="newPassword"
                class="form-control"
                [placeholder]="'profile.newPassword' | translate"
                minlength="6"
              />
            </div>
            <div class="form-group">
              <label>{{ 'profile.confirmPassword' | translate }}</label>
              <input
                type="password"
                [(ngModel)]="passwordData.confirmPassword"
                name="confirmPassword"
                class="form-control"
                [placeholder]="'profile.confirmPassword' | translate"
              />
            </div>
            <div *ngIf="passwordError" class="error-message">{{ passwordError }}</div>
            <div *ngIf="passwordSuccess" class="success-message">{{ passwordSuccess }}</div>
            <button type="submit" [disabled]="loadingPassword" class="btn-primary">
              {{ loadingPassword ? ('auth.loading' | translate) : ('profile.changePassword' | translate) }}
            </button>
          </form>
        </div>

        <!-- Settings Section -->
        <div class="section">
          <h2>{{ 'profile.settings' | translate }}</h2>

          <div class="setting-group">
            <label>{{ 'profile.language' | translate }}</label>
            <div class="custom-select" [class.open]="isLanguageDropdownOpen">
              <div class="custom-select-input" (click)="toggleLanguageDropdown()">
                <span>{{ getLanguageLabel(settingsData.language) }}</span>
                <svg class="dropdown-arrow" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M6 8l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="custom-select-dropdown" *ngIf="isLanguageDropdownOpen">
                <div
                  class="custom-select-option"
                  [class.selected]="settingsData.language === 'en'"
                  (click)="selectLanguage('en')">
                  English
                </div>
                <div
                  class="custom-select-option"
                  [class.selected]="settingsData.language === 'he'"
                  (click)="selectLanguage('he')">
                  עברית
                </div>
              </div>
            </div>
          </div>

          <div class="setting-group">
            <label>{{ 'profile.theme' | translate }}</label>
            <div class="custom-select" [class.open]="isThemeDropdownOpen">
              <div class="custom-select-input" (click)="toggleThemeDropdown()">
                <span>{{ getThemeLabel(settingsData.theme) }}</span>
                <svg class="dropdown-arrow" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M6 8l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="custom-select-dropdown" *ngIf="isThemeDropdownOpen">
                <div
                  class="custom-select-option"
                  [class.selected]="settingsData.theme === 'system'"
                  (click)="selectTheme('system')">
                  {{ 'profile.themeSystem' | translate }}
                </div>
                <div
                  class="custom-select-option"
                  [class.selected]="settingsData.theme === 'light'"
                  (click)="selectTheme('light')">
                  {{ 'profile.themeLight' | translate }}
                </div>
                <div
                  class="custom-select-option"
                  [class.selected]="settingsData.theme === 'dark'"
                  (click)="selectTheme('dark')">
                  {{ 'profile.themeDark' | translate }}
                </div>
              </div>
            </div>
          </div>

          <div class="setting-group toggle-group">
            <label>{{ 'profile.autoBet' | translate }}</label>
            <p class="setting-description">{{ 'profile.autoBetDescription' | translate }}</p>
            <label class="toggle-switch">
              <input
                type="checkbox"
                [(ngModel)]="settingsData.autoBet"
                (change)="onSettingChange()"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div *ngIf="settingsError" class="error-message">{{ settingsError }}</div>
          <div *ngIf="settingsSuccess" class="success-message">{{ settingsSuccess }}</div>
          <button
            (click)="saveSettings()"
            [disabled]="loadingSettings || !settingsChanged"
            class="btn-primary"
          >
            {{ loadingSettings ? ('auth.loading' | translate) : ('common.save' | translate) }}
          </button>
        </div>

        <!-- Delete Account Section -->
        <div class="section danger-section">
          <h2>{{ 'profile.deleteAccount' | translate }}</h2>
          <p class="warning-text">{{ 'profile.deleteWarning' | translate }}</p>

          <button
            *ngIf="!showDeleteConfirm"
            (click)="showDeleteConfirm = true"
            class="btn-danger"
          >
            {{ 'profile.deleteAccount' | translate }}
          </button>

          <div *ngIf="showDeleteConfirm" class="delete-confirm">
            <p>{{ 'profile.confirmDeleteMessage' | translate }}</p>
            <div class="form-group">
              <label>{{ 'profile.enterPassword' | translate }}</label>
              <input
                type="password"
                [(ngModel)]="deletePassword"
                class="form-control"
                [placeholder]="'auth.password' | translate"
              />
            </div>
            <div *ngIf="deleteError" class="error-message">{{ deleteError }}</div>
            <div class="button-row">
              <button
                (click)="deleteAccount()"
                [disabled]="loadingDelete || !deletePassword"
                class="btn-danger"
              >
                {{ loadingDelete ? ('auth.loading' | translate) : ('profile.confirmDelete' | translate) }}
              </button>
              <button (click)="cancelDelete()" class="btn-secondary">
                {{ 'groups.cancel' | translate }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  currentUser: User | null = null;

  profileData = {
    username: '',
    email: ''
  };

  passwordData = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  settingsData = {
    language: 'en' as 'en' | 'he',
    theme: 'system' as 'light' | 'dark' | 'system',
    autoBet: false
  };
  originalSettings = JSON.stringify(this.settingsData);
  settingsChanged = false;
  isLanguageDropdownOpen = false;
  isThemeDropdownOpen = false;

  deletePassword = '';
  showDeleteConfirm = false;

  loadingProfile = false;
  loadingPassword = false;
  loadingPicture = false;
  loadingSettings = false;
  loadingDelete = false;

  profileError = '';
  profileSuccess = '';
  passwordError = '';
  passwordSuccess = '';
  pictureError = '';
  pictureSuccess = '';
  settingsError = '';
  settingsSuccess = '';
  deleteError = '';

  private apiBaseUrl = environment.apiUrl.replace('/api', '');

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private translationService: TranslationService,
    private elementRef: ElementRef
  ) {}

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isLanguageDropdownOpen = false;
      this.isThemeDropdownOpen = false;
    }
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.profileData.username = user.username;
        this.profileData.email = user.email;
        if (user.settings) {
          this.settingsData = {
            language: user.settings.language || 'en',
            theme: user.settings.theme || 'system',
            autoBet: user.settings.autoBet || false
          };
          this.originalSettings = JSON.stringify(this.settingsData);
          this.settingsChanged = false;
        }
      }
    });
  }

  getProfilePictureUrl(path: string): string {
    if (!path) return '';
    // Cloudinary URLs are already full URLs
    return path;
  }

  getInitial(): string {
    return this.currentUser?.username?.charAt(0).toUpperCase() || '';
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.pictureError = this.translationService.translate('profile.fileTooLarge');
        return;
      }

      this.uploadProfilePicture(file);
    }
  }

  uploadProfilePicture(file: File): void {
    this.loadingPicture = true;
    this.pictureError = '';
    this.pictureSuccess = '';

    this.userService.uploadProfilePicture(file).subscribe({
      next: (response) => {
        this.authService.updateCurrentUser({ profilePicture: response.data.profilePicture });
        this.pictureSuccess = this.translationService.translate('profile.pictureUpdated');
        this.loadingPicture = false;
      },
      error: (error) => {
        this.pictureError = error.error?.message || this.translationService.translate('profile.pictureUploadFailed');
        this.loadingPicture = false;
      }
    });
  }

  deleteProfilePicture(): void {
    this.loadingPicture = true;
    this.pictureError = '';
    this.pictureSuccess = '';

    this.userService.deleteProfilePicture().subscribe({
      next: () => {
        this.authService.updateCurrentUser({ profilePicture: null });
        this.pictureSuccess = this.translationService.translate('profile.pictureRemoved');
        this.loadingPicture = false;
      },
      error: (error) => {
        this.pictureError = error.error?.message || this.translationService.translate('profile.pictureDeleteFailed');
        this.loadingPicture = false;
      }
    });
  }

  updateProfile(): void {
    this.loadingProfile = true;
    this.profileError = '';
    this.profileSuccess = '';

    this.userService.updateProfile(this.profileData).subscribe({
      next: (response) => {
        this.authService.updateCurrentUser({
          username: response.data.username,
          email: response.data.email
        });
        this.profileSuccess = this.translationService.translate('profile.profileUpdated');
        this.loadingProfile = false;
      },
      error: (error) => {
        this.profileError = error.error?.message || this.translationService.translate('profile.updateFailed');
        this.loadingProfile = false;
      }
    });
  }

  changePassword(): void {
    this.passwordError = '';
    this.passwordSuccess = '';

    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      this.passwordError = this.translationService.translate('profile.passwordMismatch');
      return;
    }

    if (this.passwordData.newPassword.length < 6) {
      this.passwordError = this.translationService.translate('profile.passwordTooShort');
      return;
    }

    this.loadingPassword = true;

    this.userService.changePassword({
      currentPassword: this.passwordData.currentPassword,
      newPassword: this.passwordData.newPassword
    }).subscribe({
      next: () => {
        this.passwordSuccess = this.translationService.translate('profile.passwordChanged');
        this.passwordData = { currentPassword: '', newPassword: '', confirmPassword: '' };
        this.loadingPassword = false;
      },
      error: (error) => {
        this.passwordError = error.error?.message || this.translationService.translate('profile.passwordChangeFailed');
        this.loadingPassword = false;
      }
    });
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deletePassword = '';
    this.deleteError = '';
  }

  deleteAccount(): void {
    if (!this.deletePassword) {
      this.deleteError = this.translationService.translate('profile.passwordRequired');
      return;
    }

    this.loadingDelete = true;
    this.deleteError = '';

    this.userService.deleteAccount(this.deletePassword).subscribe({
      next: () => {
        this.authService.logout();
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.deleteError = error.error?.message || this.translationService.translate('profile.deleteFailed');
        this.loadingDelete = false;
      }
    });
  }

  toggleLanguageDropdown(): void {
    this.isLanguageDropdownOpen = !this.isLanguageDropdownOpen;
    this.isThemeDropdownOpen = false;
  }

  toggleThemeDropdown(): void {
    this.isThemeDropdownOpen = !this.isThemeDropdownOpen;
    this.isLanguageDropdownOpen = false;
  }

  selectLanguage(lang: 'en' | 'he'): void {
    this.settingsData.language = lang;
    this.isLanguageDropdownOpen = false;
    this.onSettingChange();
  }

  selectTheme(theme: 'light' | 'dark' | 'system'): void {
    this.settingsData.theme = theme;
    this.isThemeDropdownOpen = false;
    this.onSettingChange();
  }

  getLanguageLabel(lang: string): string {
    return lang === 'en' ? 'English' : 'עברית';
  }

  getThemeLabel(theme: string): string {
    switch (theme) {
      case 'light': return this.translationService.translate('profile.themeLight');
      case 'dark': return this.translationService.translate('profile.themeDark');
      default: return this.translationService.translate('profile.themeSystem');
    }
  }

  onSettingChange(): void {
    this.settingsChanged = JSON.stringify(this.settingsData) !== this.originalSettings;
    this.settingsSuccess = '';
    this.settingsError = '';
  }

  saveSettings(): void {
    this.loadingSettings = true;
    this.settingsError = '';
    this.settingsSuccess = '';

    this.userService.updateSettings(this.settingsData).subscribe({
      next: (response) => {
        this.authService.updateCurrentUser({ settings: response.data.settings });
        this.originalSettings = JSON.stringify(this.settingsData);
        this.settingsChanged = false;
        this.settingsSuccess = this.translationService.translate('profile.settingsSaved');
        this.loadingSettings = false;

        // Apply language change immediately
        if (this.settingsData.language !== this.translationService.getCurrentLanguage()) {
          this.translationService.setLanguage(this.settingsData.language);
        }

        // Apply theme change immediately
        this.applyTheme(this.settingsData.theme);
      },
      error: (error) => {
        this.settingsError = error.error?.message || this.translationService.translate('profile.settingsFailed');
        this.loadingSettings = false;
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
    localStorage.setItem('theme', theme);
  }
}
