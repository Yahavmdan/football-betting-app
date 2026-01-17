import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Router, RouterModule} from '@angular/router';
import {AuthService} from '../../services/auth.service';
import {TranslationService} from '../../services/translation.service';
import {TranslatePipe} from '../../services/translate.pipe';

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [CommonModule, RouterModule, TranslatePipe],
    templateUrl: './navbar.component.html',
    styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
    currentLang: string = 'en';
    mobileMenuOpen: boolean = false;
    isDarkTheme: boolean = false;

    constructor(
        public authService: AuthService,
        private router: Router,
        private translationService: TranslationService
    ) {
        this.translationService.currentLang$.subscribe(lang => {
            this.currentLang = lang;
        });
        this.initTheme();
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
