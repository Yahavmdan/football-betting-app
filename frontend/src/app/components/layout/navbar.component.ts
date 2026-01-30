import {Component, HostListener, ElementRef, OnDestroy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Router, RouterModule} from '@angular/router';
import {Subscription} from 'rxjs';
import {AuthService} from '../../services/auth.service';
import {TranslationService} from '../../services/translation.service';
import {NotificationService, FeedbackNotification} from '../../services/notification.service';
import {TranslatePipe} from '../../services/translate.pipe';

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [CommonModule, RouterModule, TranslatePipe],
    templateUrl: './navbar.component.html',
    styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnDestroy {
    currentLang: string = 'en';
    mobileMenuOpen: boolean = false;
    isDarkTheme: boolean = false;
    notificationsOpen: boolean = false;
    userDropdownOpen: boolean = false;
    private userSub: Subscription;

    constructor(
        public authService: AuthService,
        private router: Router,
        private translationService: TranslationService,
        public notificationService: NotificationService,
        private elementRef: ElementRef
    ) {
        this.translationService.currentLang$.subscribe(lang => {
            this.currentLang = lang;
        });
        this.initTheme();
        this.userSub = this.authService.currentUser$.subscribe(user => {
            if (user) {
                this.notificationService.startPolling();
            } else {
                this.notificationService.stopPolling();
                this.notificationsOpen = false;
            }
        });
    }

    ngOnDestroy(): void {
        this.userSub.unsubscribe();
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: Event): void {
        const target = event.target as HTMLElement;
        if (this.notificationsOpen) {
            const wrappers = this.elementRef.nativeElement.querySelectorAll('.notification-wrapper');
            let insideAny = false;
            wrappers.forEach((wrapper: HTMLElement) => {
                if (wrapper.contains(target)) {
                    insideAny = true;
                }
            });
            if (!insideAny) {
                this.notificationsOpen = false;
            }
        }
        if (this.userDropdownOpen) {
            const dropdownWrapper = this.elementRef.nativeElement.querySelector('.user-dropdown-wrapper');
            if (dropdownWrapper && !dropdownWrapper.contains(target)) {
                this.userDropdownOpen = false;
            }
        }
    }

    private initTheme(): void {
        const savedTheme = localStorage.getItem('theme') || 'system';
        this.isDarkTheme = this.checkIsDarkTheme(savedTheme);

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            const currentTheme = localStorage.getItem('theme') || 'system';
            if (currentTheme === 'system') {
                this.isDarkTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
            }
        });
    }

    private checkIsDarkTheme(theme: string): boolean {
        if (theme === 'dark') return true;
        if (theme === 'light') return false;
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    toggleTheme(): void {
        this.isDarkTheme = !this.isDarkTheme;
        const newTheme = this.isDarkTheme ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        this.applyTheme(newTheme);
    }

    private applyTheme(theme: 'light' | 'dark'): void {
        const htmlElement = document.documentElement;
        htmlElement.classList.remove('light-theme', 'dark-theme');
        htmlElement.classList.add(`${theme}-theme`);
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

    toggleNotifications(): void {
        this.notificationsOpen = !this.notificationsOpen;
        if (this.notificationsOpen) {
            this.userDropdownOpen = false;
        }
    }

    toggleUserDropdown(): void {
        this.userDropdownOpen = !this.userDropdownOpen;
        if (this.userDropdownOpen) {
            this.notificationsOpen = false;
        }
    }

    closeUserDropdown(): void {
        this.userDropdownOpen = false;
    }

    dismissNotification(id: string): void {
        this.notificationService.dismissNotification(id).subscribe();
    }

    dismissAllNotifications(): void {
        this.notificationService.dismissAll();
        this.notificationsOpen = false;
    }

    formatNotificationDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    }

    logout(): void {
        this.closeMobileMenu();
        this.authService.logout();
        void this.router.navigate(['/login']);
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
