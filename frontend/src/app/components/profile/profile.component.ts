import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { TranslatePipe } from '../../services/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { ToastService } from '../shared/toast/toast.service';
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

  deletePassword = '';
  showDeleteConfirm = false;

  loadingProfile = false;
  loadingPassword = false;
  loadingPicture = false;
  loadingSettings = false;
  loadingDelete = false;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private translationService: TranslationService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.profileData.username = user.username;
        this.profileData.email = user.email;
      }
    });
    // Fetch full profile from API to get accurate settings from the database
    this.loadProfileSettings();
    this.loadTelegramStatus();
  }

  loadProfileSettings(): void {
    this.userService.getProfile().subscribe({
      next: (response) => {
        const user = response.data;
        if (user.settings) {
          this.settingsData = {
            language: user.settings.language || 'en',
            theme: user.settings.theme || 'system',
            autoBet: user.settings.autoBet === true
          };
          this.originalSettings = JSON.stringify(this.settingsData);
          this.settingsChanged = false;
          // Update the cached user with settings
          this.authService.updateCurrentUser({ settings: user.settings });
        }
      },
      error: (error) => {
        console.error('Failed to load profile settings:', error);
      }
    });
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
        this.toastService.show(this.translationService.translate('profile.fileTooLarge'), 'error');
        return;
      }

      this.uploadProfilePicture(file);
    }
  }

  uploadProfilePicture(file: File): void {
    this.loadingPicture = true;

    this.userService.uploadProfilePicture(file).subscribe({
      next: (response) => {
        this.authService.updateCurrentUser({ profilePicture: response.data.profilePicture });
        this.toastService.show(this.translationService.translate('profile.pictureUpdated'), 'success');
        this.loadingPicture = false;
      },
      error: (error) => {
        this.toastService.show(error.error?.message || this.translationService.translate('profile.pictureUploadFailed'), 'error');
        this.loadingPicture = false;
      }
    });
  }

  deleteProfilePicture(): void {
    this.loadingPicture = true;

    this.userService.deleteProfilePicture().subscribe({
      next: () => {
        this.authService.updateCurrentUser({ profilePicture: null });
        this.toastService.show(this.translationService.translate('profile.pictureRemoved'), 'success');
        this.loadingPicture = false;
      },
      error: (error) => {
        this.toastService.show(error.error?.message || this.translationService.translate('profile.pictureDeleteFailed'), 'error');
        this.loadingPicture = false;
      }
    });
  }

  updateProfile(): void {
    this.loadingProfile = true;

    this.userService.updateProfile(this.profileData).subscribe({
      next: (response) => {
        this.authService.updateCurrentUser({
          username: response.data.username,
          email: response.data.email
        });
        this.toastService.show(this.translationService.translate('profile.profileUpdated'), 'success');
        this.loadingProfile = false;
      },
      error: (error) => {
        this.toastService.show(error.error?.message || this.translationService.translate('profile.updateFailed'), 'error');
        this.loadingProfile = false;
      }
    });
  }

  changePassword(): void {
    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      this.toastService.show(this.translationService.translate('profile.passwordMismatch'), 'error');
      return;
    }

    if (this.passwordData.newPassword.length < 6) {
      this.toastService.show(this.translationService.translate('profile.passwordTooShort'), 'error');
      return;
    }

    this.loadingPassword = true;

    this.userService.changePassword({
      currentPassword: this.passwordData.currentPassword,
      newPassword: this.passwordData.newPassword
    }).subscribe({
      next: () => {
        this.toastService.show(this.translationService.translate('profile.passwordChanged'), 'success');
        this.passwordData = { currentPassword: '', newPassword: '', confirmPassword: '' };
        this.loadingPassword = false;
      },
      error: (error) => {
        this.toastService.show(error.error?.message || this.translationService.translate('profile.passwordChangeFailed'), 'error');
        this.loadingPassword = false;
      }
    });
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deletePassword = '';
  }

  deleteAccount(): void {
    if (!this.deletePassword) {
      this.toastService.show(this.translationService.translate('profile.passwordRequired'), 'error');
      return;
    }

    this.loadingDelete = true;

    this.userService.deleteAccount(this.deletePassword).subscribe({
      next: () => {
        this.authService.logout();
        void this.router.navigate(['/login']);
      },
      error: (error) => {
        this.toastService.show(error.error?.message || this.translationService.translate('profile.deleteFailed'), 'error');
        this.loadingDelete = false;
      }
    });
  }


  onSettingChange(): void {
    this.settingsChanged = JSON.stringify(this.settingsData) !== this.originalSettings;
  }

  saveSettings(): void {
    this.loadingSettings = true;

    this.userService.updateSettings(this.settingsData).subscribe({
      next: (response) => {
        this.authService.updateCurrentUser({ settings: response.data.settings });
        this.originalSettings = JSON.stringify(this.settingsData);
        this.settingsChanged = false;
        this.toastService.show(this.translationService.translate('profile.settingsSaved'), 'success');
        this.loadingSettings = false;

        // Apply language change immediately
        if (this.settingsData.language !== this.translationService.getCurrentLanguage()) {
          this.translationService.setLanguage(this.settingsData.language);
        }

        // Apply theme change immediately
        this.applyTheme(this.settingsData.theme);
      },
      error: (error) => {
        this.toastService.show(error.error?.message || this.translationService.translate('profile.settingsFailed'), 'error');
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

    this.userService.generateTelegramLinkCode().subscribe({
      next: (response) => {
        this.linkCode = response.data.code;
        this.botUsername = response.data.botUsername;
        this.codeExpiresAt = new Date(response.data.expiresAt);
        this.loadingTelegram = false;
      },
      error: (error) => {
        this.toastService.show(error.error?.message || 'Failed to generate link code', 'error');
        this.loadingTelegram = false;
      }
    });
  }

  copyCode(): void {
    if (this.linkCode) {
      void navigator.clipboard.writeText(`/start ${this.linkCode}`);
      this.toastService.show(this.translationService.translate('profile.codeCopied'), 'success');
    }
  }

  unlinkTelegram(): void {
    if (!confirm(this.translationService.translate('profile.confirmUnlink'))) {
      return;
    }

    this.loadingTelegram = true;

    this.userService.unlinkTelegram().subscribe({
      next: () => {
        this.telegramSettings = {
          isLinked: false,
          reminderEnabled: true,
          reminderMinutes: 15
        };
        this.linkCode = null;
        this.toastService.show(this.translationService.translate('profile.telegramUnlinked'), 'success');
        this.loadingTelegram = false;
      },
      error: (error) => {
        this.toastService.show(error.error?.message || 'Failed to unlink Telegram', 'error');
        this.loadingTelegram = false;
      }
    });
  }

  onTelegramSettingChange(): void {
    this.telegramSettingsChanged = JSON.stringify(this.telegramSettings) !== this.originalTelegramSettings;
  }


  saveTelegramSettings(): void {
    if (!this.telegramSettings) return;

    this.loadingTelegram = true;

    this.userService.updateTelegramSettings({
      reminderEnabled: this.telegramSettings.reminderEnabled,
      reminderMinutes: this.telegramSettings.reminderMinutes
    }).subscribe({
      next: (response) => {
        this.telegramSettings = response.data.telegram;
        this.originalTelegramSettings = JSON.stringify(this.telegramSettings);
        this.telegramSettingsChanged = false;
        this.toastService.show(this.translationService.translate('profile.telegramSettingsSaved'), 'success');
        this.loadingTelegram = false;
      },
      error: (error) => {
        this.toastService.show(error.error?.message || 'Failed to save settings', 'error');
        this.loadingTelegram = false;
      }
    });
  }
}
