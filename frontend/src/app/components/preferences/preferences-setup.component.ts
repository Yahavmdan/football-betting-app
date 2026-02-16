import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatchService, ApiTeam } from '../../services/match.service';
import { PreferencesService } from '../../services/preferences.service';
import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../services/translate.pipe';
import { ToastService } from '../shared/toast/toast.service';
import { FavoriteTeam, User } from '../../models/user.model';
import { League } from '../../models/league.model';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil, take } from 'rxjs/operators';

// Tournament IDs (World Cup, Euros, etc.)
const TOURNAMENTS = [
  { id: '1', logo: 'https://media.api-sports.io/football/leagues/1.png' },
  { id: '2', logo: 'https://media.api-sports.io/football/leagues/2.png' },
  { id: '3', logo: 'https://media.api-sports.io/football/leagues/3.png' },
  { id: '4', logo: 'https://media.api-sports.io/football/leagues/4.png' },
  { id: '848', logo: 'https://media.api-sports.io/football/leagues/848.png' }
];

@Component({
  selector: 'app-preferences-setup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe],
  templateUrl: './preferences-setup.component.html',
  styleUrls: ['./preferences-setup.component.css']
})
export class PreferencesSetupComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  saving = false;

  // Available options
  availableLeagues: League[] = [];
  availableTournaments = TOURNAMENTS;
  loadingLeagues = true;

  // Teams for selected leagues
  leagueTeams: Map<string, ApiTeam[]> = new Map();
  loadingTeamsForLeague: string | null = null;
  private loadingTeamsInProgress: Set<string> = new Set();

  // Selections
  selectedLeagues: Set<string> = new Set();
  selectedTournaments: Set<string> = new Set();
  selectedTeams: FavoriteTeam[] = [];

  // Auto-save
  private saveSubject = new Subject<void>();
  private destroy$ = new Subject<void>();

  // Track saving state per item
  savingItemId: string | null = null;
  savingItemType: 'league' | 'tournament' | 'team' | null = null;

  constructor(
    private matchService: MatchService,
    private preferencesService: PreferencesService,
    private authService: AuthService,
    private router: Router,
    public translationService: TranslationService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    // Setup auto-save with debounce
    this.saveSubject.pipe(
      debounceTime(300), // Reduced for faster response
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.autoSavePreferences();
    });

    // Only take the first emission to initialize preferences
    // This prevents re-initialization when we update user after saving
    this.authService.currentUser$.pipe(
      take(1)
    ).subscribe(user => {
      this.currentUser = user;
      if (user?.settings) {
        // Load existing preferences
        if (user.settings.favoriteLeagues) {
          this.selectedLeagues = new Set(user.settings.favoriteLeagues);
        }
        if (user.settings.favoriteTournaments) {
          this.selectedTournaments = new Set(user.settings.favoriteTournaments);
        }
        if (user.settings.favoriteTeams) {
          this.selectedTeams = [...user.settings.favoriteTeams];
        }
      }
    });

    // Keep track of current user reference for saving
    this.authService.currentUser$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      this.currentUser = user;
    });

    this.loadLeagues();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadLeagues(): void {
    this.loadingLeagues = true;
    this.matchService.getAvailableLeagues().subscribe({
      next: (response) => {
        this.availableLeagues = response.data;
        this.loadingLeagues = false;

        // Load teams for already selected leagues
        for (const leagueId of this.selectedLeagues) {
          this.loadTeamsForLeague(leagueId);
        }
      },
      error: (error) => {
        console.error('Failed to load leagues:', error);
        this.loadingLeagues = false;
      }
    });
  }

  loadTeamsForLeague(leagueId: string): void {
    // Skip if already loaded or currently loading
    if (this.leagueTeams.has(leagueId) || this.loadingTeamsInProgress.has(leagueId)) {
      return;
    }

    this.loadingTeamsInProgress.add(leagueId);
    this.loadingTeamsForLeague = leagueId;
    this.matchService.getLeagueTeams(leagueId).subscribe({
      next: (response) => {
        this.leagueTeams.set(leagueId, response.data);
        this.loadingTeamsInProgress.delete(leagueId);
        this.loadingTeamsForLeague = null;
      },
      error: (error) => {
        console.error(`Failed to load teams for league ${leagueId}:`, error);
        this.loadingTeamsInProgress.delete(leagueId);
        this.loadingTeamsForLeague = null;
      }
    });
  }

  toggleLeague(leagueId: string): void {
    if (this.selectedLeagues.has(leagueId)) {
      this.selectedLeagues.delete(leagueId);
      // Remove teams from this league
      this.selectedTeams = this.selectedTeams.filter(t => t.leagueId !== leagueId);
    } else {
      this.selectedLeagues.add(leagueId);
      // Load teams for this league
      this.loadTeamsForLeague(leagueId);
    }
    this.triggerAutoSave('league', leagueId);
  }

  toggleTournament(tournamentId: string): void {
    if (this.selectedTournaments.has(tournamentId)) {
      this.selectedTournaments.delete(tournamentId);
    } else {
      this.selectedTournaments.add(tournamentId);
    }
    this.triggerAutoSave('tournament', tournamentId);
  }

  toggleTeam(team: ApiTeam, leagueId: string): void {
    const index = this.selectedTeams.findIndex(t => t.teamId === team.id && t.leagueId === leagueId);
    if (index >= 0) {
      this.selectedTeams.splice(index, 1);
    } else {
      this.selectedTeams.push({
        leagueId,
        teamId: team.id,
        teamName: team.name,
        teamLogo: team.logo
      });
    }
    this.triggerAutoSave('team', `${leagueId}_${team.id}`);
  }

  isLeagueSelected(leagueId: string): boolean {
    return this.selectedLeagues.has(leagueId);
  }

  isTournamentSelected(tournamentId: string): boolean {
    return this.selectedTournaments.has(tournamentId);
  }

  isTeamSelected(teamId: number, leagueId: string): boolean {
    return this.selectedTeams.some(t => t.teamId === teamId && t.leagueId === leagueId);
  }

  getSelectedLeagueIds(): string[] {
    return Array.from(this.selectedLeagues);
  }

  getLeagueName(leagueId: string): string {
    const league = this.availableLeagues.find(l => l.id === leagueId);
    return league?.name || leagueId;
  }

  getLeagueLogo(leagueId: string): string | null {
    const league = this.availableLeagues.find(l => l.id === leagueId);
    return league?.logo || null;
  }

  private triggerAutoSave(type: 'league' | 'tournament' | 'team', itemId: string): void {
    this.savingItemType = type;
    this.savingItemId = itemId;
    this.saving = true; // Show spinner immediately
    this.saveSubject.next();
  }

  isSavingItem(type: 'league' | 'tournament' | 'team', itemId: string): boolean {
    return this.saving && this.savingItemType === type && this.savingItemId === itemId;
  }

  private autoSavePreferences(): void {
    const newPreferences = {
      favoriteLeagues: Array.from(this.selectedLeagues),
      favoriteTournaments: Array.from(this.selectedTournaments),
      favoriteTeams: this.selectedTeams
    };

    this.preferencesService.updatePreferences(newPreferences).subscribe({
      next: (response) => {
        this.saving = false;
        this.savingItemId = null;
        this.savingItemType = null;
        // Update local user data with new settings
        if (this.currentUser) {
          const currentSettings = this.currentUser.settings || {
            language: 'en' as const,
            theme: 'system' as const,
            autoBet: false
          };
          this.authService.updateCurrentUser({
            settings: {
              ...currentSettings,
              favoriteLeagues: response.data.favoriteLeagues,
              favoriteTournaments: response.data.favoriteTournaments,
              favoriteTeams: response.data.favoriteTeams,
              preferencesConfigured: response.data.preferencesConfigured
            }
          });
        }
      },
      error: (error) => {
        console.error('Failed to save preferences:', error);
        this.saving = false;
        this.savingItemId = null;
        this.savingItemType = null;
        this.toastService.show(this.translationService.translate('common.error'), 'error');
      }
    });
  }

  get hasSelections(): boolean {
    return this.selectedLeagues.size > 0 || this.selectedTournaments.size > 0 || this.selectedTeams.length > 0;
  }
}
