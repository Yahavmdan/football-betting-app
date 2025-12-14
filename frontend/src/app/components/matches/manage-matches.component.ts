import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatchService } from '../../services/match.service';
import { GroupService } from '../../services/group.service';
import { AuthService } from '../../services/auth.service';
import { Match } from '../../models/match.model';
import { Group } from '../../models/group.model';
import { TranslatePipe } from '../../services/translate.pipe';

@Component({
  selector: 'app-manage-matches',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="container">
      <div class="header">
        <h1>{{ 'matches.manageMatches' | translate }} - {{ group?.name }}</h1>
        <button (click)="goBack()" class="btn-secondary">{{ 'bets.back' | translate }}</button>
      </div>

      <div class="section" *ngIf="isGroupCreator()">
        <h2>{{ 'matches.addManually' | translate }}</h2>
        <form (ngSubmit)="createManualMatch()" class="manual-match-form">
          <div class="form-row">
            <div class="form-group">
              <label for="homeTeam">{{ 'matches.homeTeam' | translate }}</label>
              <input
                type="text"
                id="homeTeam"
                [(ngModel)]="manualMatch.homeTeam"
                name="homeTeam"
                class="form-control"
                [placeholder]="'matches.enterHomeTeam' | translate"
                required>
            </div>
            <div class="form-group">
              <label for="awayTeam">{{ 'matches.awayTeam' | translate }}</label>
              <input
                type="text"
                id="awayTeam"
                [(ngModel)]="manualMatch.awayTeam"
                name="awayTeam"
                class="form-control"
                [placeholder]="'matches.enterAwayTeam' | translate"
                required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="matchDate">{{ 'matches.matchDate' | translate }}</label>
              <input
                type="date"
                id="matchDate"
                [(ngModel)]="manualMatch.matchDate"
                name="matchDate"
                class="form-control"
                required>
            </div>
            <div class="form-group">
              <label for="matchHour">{{ 'matches.matchTime' | translate }}</label>
              <input
                type="time"
                id="matchHour"
                [(ngModel)]="manualMatch.matchHour"
                name="matchHour"
                class="form-control"
                required>
            </div>
          </div>
          <div *ngIf="isPastMatch()" class="past-match-notice">
            {{ 'matches.pastMatchNotice' | translate }}
          </div>
          <div *ngIf="isPastMatch()" class="form-row">
            <div class="form-group">
              <label for="homeScore">{{ 'matches.homeScore' | translate }}</label>
              <input
                type="number"
                id="homeScore"
                [(ngModel)]="manualMatch.homeScore"
                name="homeScore"
                class="form-control score-input"
                min="0"
                required>
            </div>
            <div class="form-group">
              <label for="awayScore">{{ 'matches.awayScore' | translate }}</label>
              <input
                type="number"
                id="awayScore"
                [(ngModel)]="manualMatch.awayScore"
                name="awayScore"
                class="form-control score-input"
                min="0"
                required>
            </div>
          </div>
          <button
            type="submit"
            class="btn-primary"
            [disabled]="loadingManual || !isFormValid()">
            {{ loadingManual ? ('matches.creatingMatch' | translate) : ('matches.createMatch' | translate) }}
          </button>
          <div *ngIf="manualMatchMessage" class="info-message" style="margin-top: 1rem;">{{ manualMatchMessage }}</div>
          <div *ngIf="manualMatchError" class="error-message" style="margin-top: 1rem;">{{ manualMatchError }}</div>
        </form>
      </div>

      <div class="section">
        <h2>{{ 'matches.matchesInGroup' | translate }}</h2>
        <div *ngIf="loadingGroupMatches" class="loading">{{ 'auth.loading' | translate }}</div>
        <div *ngIf="!loadingGroupMatches && groupMatches.length === 0" class="empty-state">
          {{ 'matches.noMatchesInGroup' | translate }}
        </div>
        <div class="matches-grid">
          <div *ngFor="let match of groupMatches" class="match-card active">
            <div class="match-header">
              <span class="competition">{{ match.competition }}</span>
              <span class="status" [class.finished]="match.status === 'FINISHED'">
                {{ 'matches.' + match.status.toLowerCase() | translate }}
              </span>
            </div>
            <div class="match-teams">
              <span class="team">{{ match.homeTeam }}</span>
              <span class="vs">{{ 'matches.vs' | translate }}</span>
              <span class="team">{{ match.awayTeam }}</span>
            </div>
            <div class="match-footer">
              <span class="date">{{ match.matchDate | date:'short' }}</span>
              <span *ngIf="match.status === 'FINISHED'" class="result">
                {{ match.result.homeScore }} - {{ match.result.awayScore }}
              </span>
              <button
                *ngIf="isGroupCreator() && canUpdateScore(match)"
                (click)="openScoreUpdate(match)"
                class="btn-update-score">
                {{ 'matches.updateScore' | translate }}
              </button>
            </div>
            <!-- Score update form -->
            <div *ngIf="editingMatchId === match._id" class="score-update-form">
              <div class="form-row">
                <div class="form-group">
                  <label>{{ match.homeTeam }}</label>
                  <input
                    type="number"
                    [(ngModel)]="updateScoreData.homeScore"
                    [name]="'homeScore_' + match._id"
                    class="form-control score-input"
                    min="0">
                </div>
                <div class="form-group">
                  <label>{{ match.awayTeam }}</label>
                  <input
                    type="number"
                    [(ngModel)]="updateScoreData.awayScore"
                    [name]="'awayScore_' + match._id"
                    class="form-control score-input"
                    min="0">
                </div>
              </div>
              <div class="button-row">
                <button
                  (click)="submitScoreUpdate(match._id)"
                  [disabled]="loadingScoreUpdate || updateScoreData.homeScore === null || updateScoreData.awayScore === null"
                  class="btn-primary btn-small">
                  {{ loadingScoreUpdate ? ('auth.loading' | translate) : ('matches.saveScore' | translate) }}
                </button>
                <button (click)="cancelScoreUpdate()" class="btn-secondary btn-small">
                  {{ 'groups.cancel' | translate }}
                </button>
              </div>
              <div *ngIf="scoreUpdateError" class="error-message" style="margin-top: 0.5rem;">{{ scoreUpdateError }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    h1 {
      color: #333;
      margin: 0;
    }
    h2 {
      color: #333;
      margin-bottom: 1rem;
    }
    .section {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 2rem;
    }
    .form-group {
      flex: 1;
      max-width: 400px;
    }
    label {
      display: block;
      margin-bottom: 0.5rem;
      color: #555;
      font-weight: 500;
    }
    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
    }
    .btn-primary, .btn-secondary {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
    }
    .btn-primary {
      background-color: #4CAF50;
      color: white;
    }
    .btn-primary:hover:not(:disabled) {
      background-color: #45a049;
    }
    .btn-primary:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
    .btn-secondary {
      background-color: #2196F3;
      color: white;
    }
    .btn-secondary:hover:not(:disabled) {
      background-color: #0b7dda;
    }
    .info-message {
      padding: 1rem;
      background-color: #e3f2fd;
      border-radius: 4px;
      color: #1976D2;
    }
    .loading, .empty-state {
      text-align: center;
      padding: 2rem;
      color: #666;
    }
    .matches-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }
    .match-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1rem;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .match-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    .match-card.active {
      border-color: #4CAF50;
      background-color: #f1f8e9;
    }
    .match-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }
    .competition {
      font-size: 0.9rem;
      color: #666;
      font-weight: 500;
    }
    .status {
      font-size: 0.85rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      background-color: #FFC107;
      color: white;
      font-weight: 500;
    }
    .status.finished {
      background-color: #4CAF50;
    }
    .match-teams {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 1rem 0;
      font-weight: 600;
    }
    .team {
      flex: 1;
      color: #333;
    }
    .vs {
      color: #999;
      padding: 0 1rem;
    }
    .match-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.5rem;
    }
    .date {
      font-size: 0.9rem;
      color: #666;
    }
    .result {
      font-weight: 600;
      color: #4CAF50;
      font-size: 1.1rem;
    }
    .warning-message {
      color: #ff9800;
      padding: 0.75rem;
      background-color: #fff3e0;
      border-radius: 4px;
      border-left: 4px solid #ff9800;
    }
    .manual-match-form {
      max-width: 600px;
    }
    .form-row {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .form-row .form-group {
      flex: 1;
    }
    .error-message {
      padding: 1rem;
      background-color: #ffebee;
      border-radius: 4px;
      color: #c62828;
      border-left: 4px solid #c62828;
    }
    .past-match-notice {
      padding: 0.75rem;
      background-color: #fff3e0;
      border-radius: 4px;
      color: #e65100;
      border-left: 4px solid #ff9800;
      margin-bottom: 1rem;
    }
    .score-input {
      max-width: 100px;
    }
    .btn-update-score {
      background-color: #ff9800;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85rem;
    }
    .btn-update-score:hover {
      background-color: #f57c00;
    }
    .score-update-form {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #e0e0e0;
    }
    .button-row {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .btn-small {
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
    }
  `]
})
export class ManageMatchesComponent implements OnInit {
  groupId: string = '';
  group: Group | null = null;
  groupMatches: Match[] = [];
  loadingGroupMatches = false;

  // Manual match creation
  loadingManual = false;
  manualMatchMessage = '';
  manualMatchError = '';
  manualMatch: {
    homeTeam: string;
    awayTeam: string;
    matchDate: string;
    matchHour: string;
    homeScore: number | null;
    awayScore: number | null;
  } = {
    homeTeam: '',
    awayTeam: '',
    matchDate: '',
    matchHour: '',
    homeScore: null,
    awayScore: null
  };

  // Score update
  editingMatchId: string | null = null;
  updateScoreData: { homeScore: number | null; awayScore: number | null } = {
    homeScore: null,
    awayScore: null
  };
  loadingScoreUpdate = false;
  scoreUpdateError = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private matchService: MatchService,
    private groupService: GroupService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.groupId = this.route.snapshot.queryParams['groupId'];
    if (!this.groupId) {
      this.router.navigate(['/groups']);
      return;
    }

    this.loadGroup();
    this.loadMatches();
  }

  loadGroup(): void {
    this.groupService.getGroupById(this.groupId).subscribe({
      next: (response) => {
        this.group = response.data;
      },
      error: (error) => {
        console.error('Failed to load group:', error);
      }
    });
  }

  loadMatches(): void {
    this.loadingGroupMatches = true;

    this.matchService.getMatches(this.groupId).subscribe({
      next: (response) => {
        this.groupMatches = response.data;
        this.loadingGroupMatches = false;
      },
      error: (error) => {
        console.error('Failed to load group matches:', error);
        this.loadingGroupMatches = false;
      }
    });
  }

  isPastMatch(): boolean {
    if (!this.manualMatch.matchDate || !this.manualMatch.matchHour) {
      return false;
    }
    const matchDateTime = new Date(`${this.manualMatch.matchDate}T${this.manualMatch.matchHour}`);
    return matchDateTime <= new Date();
  }

  isFormValid(): boolean {
    const baseValid = !!(
      this.manualMatch.homeTeam &&
      this.manualMatch.awayTeam &&
      this.manualMatch.matchDate &&
      this.manualMatch.matchHour
    );

    if (!baseValid) return false;

    if (this.isPastMatch()) {
      return this.manualMatch.homeScore !== null && this.manualMatch.awayScore !== null;
    }

    return true;
  }

  createManualMatch(): void {
    this.loadingManual = true;
    this.manualMatchMessage = '';
    this.manualMatchError = '';

    const data: any = {
      homeTeam: this.manualMatch.homeTeam,
      awayTeam: this.manualMatch.awayTeam,
      matchDate: this.manualMatch.matchDate,
      matchHour: this.manualMatch.matchHour,
      groupId: this.groupId
    };

    if (this.isPastMatch()) {
      data.homeScore = this.manualMatch.homeScore;
      data.awayScore = this.manualMatch.awayScore;
    }

    this.matchService.createManualMatch(data).subscribe({
      next: (response) => {
        this.manualMatchMessage = response.message;
        this.loadingManual = false;
        // Reset form
        this.manualMatch = {
          homeTeam: '',
          awayTeam: '',
          matchDate: '',
          matchHour: '',
          homeScore: null,
          awayScore: null
        };
        // Reload matches to show the new one
        this.loadMatches();
      },
      error: (error) => {
        this.manualMatchError = error.error?.message || 'Failed to create match';
        this.loadingManual = false;
      }
    });
  }

  isGroupCreator(): boolean {
    if (!this.group) return false;
    const currentUser = this.authService.getCurrentUser();
    return this.group.creator?._id === currentUser?.id || this.group.creator === currentUser?.id;
  }

  goBack(): void {
    this.router.navigate(['/groups', this.groupId]);
  }

  canUpdateScore(match: Match): boolean {
    // Can update if match is not finished and 2 hours have passed since match start
    if (match.status === 'FINISHED') return false;
    const matchDate = new Date(match.matchDate);
    const twoHoursAfter = new Date(matchDate.getTime() + 2 * 60 * 60 * 1000);
    return new Date() >= twoHoursAfter;
  }

  openScoreUpdate(match: Match): void {
    this.editingMatchId = match._id;
    this.updateScoreData = {
      homeScore: match.result?.homeScore ?? null,
      awayScore: match.result?.awayScore ?? null
    };
    this.scoreUpdateError = '';
  }

  submitScoreUpdate(matchId: string): void {
    if (this.updateScoreData.homeScore === null || this.updateScoreData.awayScore === null) {
      return;
    }

    this.loadingScoreUpdate = true;
    this.scoreUpdateError = '';

    this.matchService.updateMatchScore({
      matchId,
      groupId: this.groupId,
      homeScore: this.updateScoreData.homeScore,
      awayScore: this.updateScoreData.awayScore
    }).subscribe({
      next: () => {
        this.loadingScoreUpdate = false;
        this.editingMatchId = null;
        this.loadMatches();
      },
      error: (error) => {
        this.scoreUpdateError = error.error?.message || 'Failed to update score';
        this.loadingScoreUpdate = false;
      }
    });
  }

  cancelScoreUpdate(): void {
    this.editingMatchId = null;
    this.updateScoreData = { homeScore: null, awayScore: null };
    this.scoreUpdateError = '';
  }
}
