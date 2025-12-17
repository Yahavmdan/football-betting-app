import { Component, Input, Output, EventEmitter, forwardRef, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ISRAELI_LEAGUES, Team, League, translateTeamName } from '../../data/teams.data';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-team-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TeamSelectComponent),
      multi: true
    }
  ],
  template: `
    <div class="team-select-container" [class.open]="isOpen">
      <div class="team-select-input" (click)="toggleDropdown()">
        <div class="selected-team" *ngIf="selectedTeam">
          <img [src]="selectedTeam.logo" [alt]="getTeamDisplayName(selectedTeam)" class="team-logo" (error)="onImageError($event)">
          <span>{{ getTeamDisplayName(selectedTeam) }}</span>
        </div>
        <span *ngIf="!selectedTeam" class="placeholder">{{ getPlaceholder() }}</span>
        <svg class="dropdown-arrow" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M6 8l4 4 4-4" stroke="#6b7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>

      <div class="dropdown-panel" *ngIf="isOpen">
        <div class="search-box">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.3-4.3"></path>
          </svg>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (input)="filterTeams()"
            [placeholder]="getSearchPlaceholder()"
            class="search-input"
            #searchInput>
        </div>

        <div class="teams-list">
          <div *ngFor="let league of filteredLeagues" class="league-group">
            <div class="league-header" *ngIf="league.teams.length > 0">{{ getLeagueDisplayName(league) }}</div>
            <div
              *ngFor="let team of league.teams"
              class="team-option"
              [class.selected]="selectedTeam?.id === team.id"
              (click)="selectTeam(team)">
              <img [src]="team.logo" [alt]="getTeamDisplayName(team)" class="team-logo" (error)="onImageError($event)">
              <span>{{ getTeamDisplayName(team) }}</span>
            </div>
          </div>
          <div *ngIf="noResults" class="no-results">{{ getNoResultsText() }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .team-select-container {
      position: relative;
      width: 100%;
    }

    .team-select-input {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.85rem 1rem;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      background: #f8fafc;
      cursor: pointer;
      transition: all 0.3s ease;
      min-height: 52px;
    }

    .team-select-input:hover {
      border-color: #cbd5e1;
    }

    .team-select-container.open .team-select-input {
      border-color: #4ade80;
      background: white;
      box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.15);
    }

    .selected-team {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .placeholder {
      color: #94a3b8;
    }

    .team-logo {
      width: 24px;
      height: 24px;
      object-fit: contain;
      border-radius: 4px;
    }

    .dropdown-arrow {
      transition: transform 0.2s ease;
    }

    .team-select-container.open .dropdown-arrow {
      transform: rotate(180deg);
    }

    .dropdown-panel {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      background: white;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      max-height: 350px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: slideDown 0.2s ease-out;
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #e2e8f0;
      color: #64748b;
    }

    .search-input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 0.95rem;
      background: transparent;
    }

    .search-input::placeholder {
      color: #94a3b8;
    }

    .teams-list {
      overflow-y: auto;
      max-height: 280px;
    }

    .league-group {
      padding-bottom: 0.5rem;
    }

    .league-header {
      padding: 0.6rem 1rem;
      font-weight: 700;
      font-size: 0.8rem;
      color: #64748b;
      background: #f8fafc;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      position: sticky;
      top: 0;
    }

    .team-option {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem 1rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .team-option:hover {
      background: #f1f5f9;
    }

    .team-option.selected {
      background: linear-gradient(135deg, rgba(74, 222, 128, 0.15) 0%, rgba(34, 197, 94, 0.1) 100%);
    }

    .team-option span {
      font-size: 0.95rem;
      color: #1a1a2e;
    }

    .no-results {
      padding: 1.5rem;
      text-align: center;
      color: #94a3b8;
    }
  `]
})
export class TeamSelectComponent implements ControlValueAccessor {
  @Input() placeholder?: string;

  isOpen = false;
  searchQuery = '';
  selectedTeam: Team | null = null;
  leagues: League[] = ISRAELI_LEAGUES;
  filteredLeagues: League[] = [];

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(
    private elementRef: ElementRef,
    private translationService: TranslationService
  ) {
    this.filteredLeagues = this.leagues.map(l => ({ ...l, teams: [...l.teams] }));
  }

  getTeamDisplayName(team: Team): string {
    const currentLang = this.translationService.getCurrentLanguage();
    return translateTeamName(team, currentLang);
  }

  getLeagueDisplayName(league: League): string {
    const currentLang = this.translationService.getCurrentLanguage();
    return currentLang === 'he' ? league.nameHe : league.name;
  }

  getNoResultsText(): string {
    const currentLang = this.translationService.getCurrentLanguage();
    return currentLang === 'he' ? 'לא נמצאו תוצאות' : 'No results found';
  }

  getSearchPlaceholder(): string {
    const currentLang = this.translationService.getCurrentLanguage();
    return currentLang === 'he' ? 'חפש קבוצה...' : 'Search team...';
  }

  getPlaceholder(): string {
    if (this.placeholder) {
      return this.placeholder;
    }
    const currentLang = this.translationService.getCurrentLanguage();
    return currentLang === 'he' ? 'בחר קבוצה' : 'Select team';
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  writeValue(value: string): void {
    if (value) {
      for (const league of this.leagues) {
        const team = league.teams.find(t =>
          t.name === value ||
          t.nameEn === value ||
          t.nameHe === value
        );
        if (team) {
          this.selectedTeam = team;
          break;
        }
      }
    } else {
      this.selectedTeam = null;
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.searchQuery = '';
      this.filterTeams();
      setTimeout(() => {
        const input = this.elementRef.nativeElement.querySelector('.search-input');
        if (input) input.focus();
      }, 50);
    }
  }

  filterTeams(): void {
    const query = this.searchQuery.toLowerCase().trim();

    if (!query) {
      this.filteredLeagues = this.leagues.map(l => ({ ...l, teams: [...l.teams] }));
    } else {
      this.filteredLeagues = this.leagues.map(league => ({
        ...league,
        teams: league.teams.filter(team =>
          team.name.toLowerCase().includes(query) ||
          team.nameEn.toLowerCase().includes(query) ||
          team.nameHe.toLowerCase().includes(query)
        )
      }));
    }
  }

  get noResults(): boolean {
    return this.filteredLeagues.every(l => l.teams.length === 0);
  }

  selectTeam(team: Team): void {
    this.selectedTeam = team;
    this.onChange(team.name);
    this.onTouched();
    this.isOpen = false;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}
