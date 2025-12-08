import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private translations: any = {};
  private currentLangSubject = new BehaviorSubject<string>('en');
  public currentLang$ = this.currentLangSubject.asObservable();

  constructor(private http: HttpClient) {
    const savedLang = localStorage.getItem('language') || 'en';
    this.loadTranslations(savedLang);
  }

  loadTranslations(lang: string): Observable<any> {
    return this.http.get(`/assets/i18n/${lang}.json`).pipe(
      tap((translations) => {
        this.translations = translations;
        this.currentLangSubject.next(lang);
        localStorage.setItem('language', lang);
        this.updateDirection(lang);
      })
    );
  }

  setLanguage(lang: string): void {
    this.loadTranslations(lang).subscribe();
  }

  getCurrentLanguage(): string {
    return this.currentLangSubject.value;
  }

  translate(key: string): string {
    const keys = key.split('.');
    let result = this.translations;

    for (const k of keys) {
      if (result && result[k]) {
        result = result[k];
      } else {
        return key;
      }
    }

    return result || key;
  }

  instant(key: string): string {
    return this.translate(key);
  }

  private updateDirection(lang: string): void {
    const htmlElement = document.documentElement;
    if (lang === 'he') {
      htmlElement.setAttribute('dir', 'rtl');
      htmlElement.setAttribute('lang', 'he');
    } else {
      htmlElement.setAttribute('dir', 'ltr');
      htmlElement.setAttribute('lang', 'en');
    }
  }

  isRTL(): boolean {
    return this.currentLangSubject.value === 'he';
  }
}
