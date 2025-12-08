import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/layout/navbar.component';
import { TranslationService } from './services/translation.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  template: `
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
  }
}
