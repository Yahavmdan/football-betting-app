import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { TranslatePipe } from '../../services/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { User, TelegramSettings } from '../../models/user.model';
import { AppSelectComponent, SelectOption } from '../shared/app-select/app-select.component';
import { AppToggleComponent } from '../shared/app-toggle/app-toggle.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe, AppSelectComponent, AppToggleComponent],
  templateUrl: './profile.component.html',
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

  // Select options
  languageOptions: SelectOption[] = [
    { value: 'en', label: 'English' },
    { value: 'he', label: 'עברית' }
  ];

  themeOptions: SelectOption[] = [
    { value: 'system', label: 'System', labelHe: 'מערכת' },
    { value: 'light', label: 'Light', labelHe: 'בהיר' },
    { value: 'dark', label: 'Dark', labelHe: 'כהה' }
  ];

  reminderSelectOptions: SelectOption[] = [
    { value: 5, label: '5 minutes before', labelHe: '5 דקות לפני' },
    { value: 10, label: '10 minutes before', labelHe: '10 דקות לפני' },
    { value: 15, label: '15 minutes before', labelHe: '15 דקות לפני' },
    { value: 30, label: '30 minutes before', labelHe: '30 דקות לפני' },
    { value: 60, label: '1 hour before', labelHe: 'שעה לפני' }
  ];

  // Telegram properties
  telegramSettings: TelegramSettings | null = null;
  originalTelegramSettings = '';
  telegramSettingsChanged = false;
  linkCode: string | null = null;
  botUsername = '';
  codeExpiresAt: Date | null = null;
  loadingTelegram = false;
  telegramError = '';
  telegramSuccess = '';


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

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private translationService: TranslationService
  ) {}

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
    this.loadTelegramStatus();
  }

  loadTelegramStatus(): void {
    this.userService.getTelegramStatus().subscribe({
      next: (response) => {
        this.telegramSettings = response.data.telegram;
        this.originalTelegramSettings = JSON.stringify(this.telegramSettings);
      },
      error: (error) => {
        console.error('Failed to load Telegram status:', error);
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
        void this.router.navigate(['/login']);
      },
      error: (error) => {
        this.deleteError = error.error?.message || this.translationService.translate('profile.deleteFailed');
        this.loadingDelete = false;
      }
    });
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

  // Telegram methods
  generateTelegramLinkCode(): void {
    this.loadingTelegram = true;
    this.telegramError = '';

    this.userService.generateTelegramLinkCode().subscribe({
      next: (response) => {
        this.linkCode = response.data.code;
        this.botUsername = response.data.botUsername;
        this.codeExpiresAt = new Date(response.data.expiresAt);
        this.loadingTelegram = false;
      },
      error: (error) => {
        this.telegramError = error.error?.message || 'Failed to generate link code';
        this.loadingTelegram = false;
      }
    });
  }

  copyCode(): void {
    if (this.linkCode) {
      void navigator.clipboard.writeText(`/start ${this.linkCode}`);
      this.telegramSuccess = this.translationService.translate('profile.codeCopied');
      setTimeout(() => this.telegramSuccess = '', 3000);
    }
  }

  unlinkTelegram(): void {
    if (!confirm(this.translationService.translate('profile.confirmUnlink'))) {
      return;
    }

    this.loadingTelegram = true;
    this.telegramError = '';

    this.userService.unlinkTelegram().subscribe({
      next: () => {
        this.telegramSettings = {
          isLinked: false,
          reminderEnabled: true,
          reminderMinutes: 15
        };
        this.linkCode = null;
        this.telegramSuccess = this.translationService.translate('profile.telegramUnlinked');
        this.loadingTelegram = false;
      },
      error: (error) => {
        this.telegramError = error.error?.message || 'Failed to unlink Telegram';
        this.loadingTelegram = false;
      }
    });
  }

  onTelegramSettingChange(): void {
    this.telegramSettingsChanged = JSON.stringify(this.telegramSettings) !== this.originalTelegramSettings;
    this.telegramSuccess = '';
    this.telegramError = '';
  }


  saveTelegramSettings(): void {
    if (!this.telegramSettings) return;

    this.loadingTelegram = true;
    this.telegramError = '';
    this.telegramSuccess = '';

    this.userService.updateTelegramSettings({
      reminderEnabled: this.telegramSettings.reminderEnabled,
      reminderMinutes: this.telegramSettings.reminderMinutes
    }).subscribe({
      next: (response) => {
        this.telegramSettings = response.data.telegram;
        this.originalTelegramSettings = JSON.stringify(this.telegramSettings);
        this.telegramSettingsChanged = false;
        this.telegramSuccess = this.translationService.translate('profile.telegramSettingsSaved');
        this.loadingTelegram = false;
      },
      error: (error) => {
        this.telegramError = error.error?.message || 'Failed to save settings';
        this.loadingTelegram = false;
      }
    });
  }
}
