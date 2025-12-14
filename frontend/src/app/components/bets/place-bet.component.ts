import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BetService } from '../../services/bet.service';
import { MatchService } from '../../services/match.service';
import { Match } from '../../models/match.model';
import { PlaceBetData } from '../../models/bet.model';
import { TranslatePipe } from '../../services/translate.pipe';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-place-bet',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="container">
      <button class="back-btn" (click)="goBack()">← {{ 'bets.back' | translate }}</button>

      <div class="bet-card" *ngIf="match">
        <h2>{{ hasExistingBet ? ('bets.yourBet' | translate) : ('bets.placeYourBet' | translate) }}</h2>

        <div class="match-info">
          <div class="competition">{{ match.competition }}</div>
          <div class="teams">
            <span class="team">{{ match.homeTeam }}</span>
            <span class="vs">{{ 'matches.vs' | translate }}</span>
            <span class="team">{{ match.awayTeam }}</span>
          </div>
          <div class="date">{{ match.matchDate | date:'medium' }}</div>
        </div>

        <!-- Warning messages -->
        <div *ngIf="isMatchInPast" class="warning-message">
          ⚠️ {{ 'bets.matchStarted' | translate }}
        </div>

        <div *ngIf="hasExistingBet && !isMatchInPast" class="info-message">
          ℹ️ {{ 'bets.canUpdateBet' | translate }}
        </div>

        <form (ngSubmit)="onSubmit()" #betForm="ngForm">
          <div class="form-section">
            <h3>{{ 'bets.matchResult' | translate }}</h3>
            <div class="outcome-buttons">
              <button
                type="button"
                class="outcome-btn"
                [class.selected]="betData.outcome === '1'"
                (click)="selectOutcome('1')"
                [disabled]="isMatchInPast"
              >
                <span class="label">1</span>
                <span class="team-name">{{ match.homeTeam }}</span>
              </button>
              <button
                type="button"
                class="outcome-btn"
                [class.selected]="betData.outcome === 'X'"
                (click)="selectOutcome('X')"
                [disabled]="isMatchInPast"
              >
                <span class="label">X</span>
                <span class="team-name">{{ 'bets.draw' | translate }}</span>
              </button>
              <button
                type="button"
                class="outcome-btn"
                [class.selected]="betData.outcome === '2'"
                (click)="selectOutcome('2')"
                [disabled]="isMatchInPast"
              >
                <span class="label">2</span>
                <span class="team-name">{{ match.awayTeam }}</span>
              </button>
            </div>
          </div>

          <div class="form-section">
            <h3>{{ 'bets.predictScore' | translate }}</h3>
            <div class="score-inputs">
              <div class="score-input-group">
                <label>{{ match.homeTeam }}</label>
                <input
                  type="number"
                  name="homeScore"
                  [(ngModel)]="betData.homeScore"
                  min="0"
                  max="20"
                  required
                  class="score-input"
                  [disabled]="isMatchInPast"
                />
              </div>
              <span class="separator">-</span>
              <div class="score-input-group">
                <label>{{ match.awayTeam }}</label>
                <input
                  type="number"
                  name="awayScore"
                  [(ngModel)]="betData.awayScore"
                  min="0"
                  max="20"
                  required
                  class="score-input"
                  [disabled]="isMatchInPast"
                />
              </div>
            </div>
          </div>

          <div class="points-info">
            <h4>{{ 'bets.pointsSystem' | translate }}</h4>
            <ul>
              <li>{{ 'bets.correctResult' | translate }} <strong>1 {{ 'bets.point' | translate }}</strong></li>
              <li>{{ 'bets.correctHomeScore' | translate }} <strong>+2 {{ 'bets.points' | translate }}</strong></li>
              <li>{{ 'bets.correctAwayScore' | translate }} <strong>+2 {{ 'bets.points' | translate }}</strong></li>
              <li>{{ 'bets.exactScore' | translate }} <strong>+3 {{ 'bets.points' | translate }}</strong></li>
            </ul>
          </div>

          <div *ngIf="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>

          <div *ngIf="successMessage" class="success-message">
            {{ successMessage }}
          </div>

          <div class="button-group">
            <button type="button" (click)="goBack()" class="btn-secondary">{{ 'groups.cancel' | translate }}</button>
            <button
              type="submit"
              *ngIf="!isMatchInPast"
              [disabled]="!betForm.valid || !betData.outcome || loading"
              class="btn-primary"
            >
              {{ loading ? ('bets.placingBet' | translate) : (hasExistingBet ? ('bets.updateBet' | translate) : ('matches.placeBet' | translate)) }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 700px;
      margin: 2rem auto;
      padding: 2rem;
    }
    .back-btn {
      background: none;
      border: none;
      color: #4CAF50;
      cursor: pointer;
      font-size: 1rem;
      margin-bottom: 1rem;
      padding: 0.5rem;
    }
    .back-btn:hover {
      text-decoration: underline;
    }
    .bet-card {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h2 {
      margin: 0 0 1.5rem 0;
      color: #333;
      text-align: center;
    }
    .match-info {
      background: #f5f5f5;
      padding: 1.5rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      text-align: center;
    }
    .competition {
      color: #666;
      font-size: 0.9rem;
      margin-bottom: 0.5rem;
    }
    .teams {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 1rem 0;
      font-size: 1.2rem;
      font-weight: 600;
    }
    .team {
      color: #333;
    }
    .vs {
      color: #999;
      margin: 0 1rem;
    }
    .date {
      color: #666;
      font-size: 0.9rem;
    }
    .form-section {
      margin-bottom: 2rem;
    }
    h3 {
      margin: 0 0 1rem 0;
      color: #333;
      font-size: 1.1rem;
    }
    .outcome-buttons {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }
    .outcome-btn {
      padding: 1rem;
      border: 2px solid #ddd;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }
    .outcome-btn:hover {
      border-color: #4CAF50;
    }
    .outcome-btn.selected {
      border-color: #4CAF50;
      background-color: #e8f5e9;
    }
    .outcome-btn:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
    .outcome-btn .label {
      font-size: 1.5rem;
      font-weight: 600;
      color: #333;
    }
    .outcome-btn .team-name {
      font-size: 0.85rem;
      color: #666;
      text-align: center;
    }
    .score-inputs {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1.5rem;
    }
    .score-input-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }
    .score-input-group label {
      font-size: 0.9rem;
      color: #666;
      font-weight: 500;
    }
    .score-input {
      width: 80px;
      height: 60px;
      font-size: 1.5rem;
      text-align: center;
      border: 2px solid #ddd;
      border-radius: 8px;
      font-weight: 600;
    }
    .score-input:focus {
      outline: none;
      border-color: #4CAF50;
    }
    .separator {
      font-size: 2rem;
      color: #999;
      font-weight: 600;
    }
    .points-info {
      background: #e3f2fd;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
    }
    .points-info h4 {
      margin: 0 0 0.5rem 0;
      color: #333;
      font-size: 0.95rem;
    }
    .points-info ul {
      margin: 0;
      padding-left: 1.5rem;
      color: #666;
      font-size: 0.9rem;
    }
    .points-info li {
      margin-bottom: 0.25rem;
    }
    .button-group {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
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
      background-color: #f5f5f5;
      color: #333;
    }
    .btn-secondary:hover {
      background-color: #e0e0e0;
    }
    .error-message {
      color: #f44336;
      margin-bottom: 1rem;
      padding: 0.75rem;
      background-color: #ffebee;
      border-radius: 4px;
    }
    .success-message {
      color: #4CAF50;
      margin-bottom: 1rem;
      padding: 0.75rem;
      background-color: #e8f5e9;
      border-radius: 4px;
    }
    .warning-message {
      color: #ff9800;
      margin-bottom: 1rem;
      padding: 0.75rem;
      background-color: #fff3e0;
      border-radius: 4px;
      border-left: 4px solid #ff9800;
    }
    .info-message {
      color: #2196F3;
      margin-bottom: 1rem;
      padding: 0.75rem;
      background-color: #e3f2fd;
      border-radius: 4px;
      border-left: 4px solid #2196F3;
    }
    .score-input:disabled {
      background-color: #f5f5f5;
      cursor: not-allowed;
    }
  `]
})
export class PlaceBetComponent implements OnInit {
  match: Match | null = null;
  betData: PlaceBetData = {
    matchId: '',
    groupId: '',
    outcome: '' as any,
    homeScore: 0,
    awayScore: 0
  };
  errorMessage = '';
  successMessage = '';
  loading = false;
  hasExistingBet = false;
  existingBet: any = null;
  isMatchInPast = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private betService: BetService,
    private matchService: MatchService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.betData.matchId = params['matchId'];
      this.betData.groupId = params['groupId'];

      if (this.betData.matchId) {
        this.loadMatch();
        this.checkExistingBet();
      }
    });
  }

  loadMatch(): void {
    this.matchService.getMatchById(this.betData.matchId).subscribe({
      next: (response) => {
        this.match = response.data;
        // Check if match is in the past
        this.isMatchInPast = new Date(this.match.matchDate) <= new Date();
      },
      error: (error) => {
        console.error('Failed to load match:', error);
        this.errorMessage = this.translationService.translate('bets.loadMatchFailed');
      }
    });
  }

  checkExistingBet(): void {
    this.betService.checkExistingBet(this.betData.matchId, this.betData.groupId).subscribe({
      next: (response) => {
        this.hasExistingBet = response.data.hasBet;
        this.existingBet = response.data.bet;
        if (this.hasExistingBet && this.existingBet) {
          // Pre-fill form with existing bet
          this.betData.outcome = this.existingBet.prediction.outcome;
          this.betData.homeScore = this.existingBet.prediction.homeScore;
          this.betData.awayScore = this.existingBet.prediction.awayScore;
        }
      },
      error: (error) => {
        console.error('Failed to check existing bet:', error);
      }
    });
  }

  selectOutcome(outcome: '1' | 'X' | '2'): void {
    this.betData.outcome = outcome;
  }

  onSubmit(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.betService.placeBet(this.betData).subscribe({
      next: (response) => {
        this.successMessage = response.message || this.translationService.translate('bets.betPlacedSuccess');
        setTimeout(() => {
          this.router.navigate(['/groups', this.betData.groupId]);
        }, 1500);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || this.translationService.translate('bets.placeBetFailed');
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/groups', this.betData.groupId]);
  }
}
