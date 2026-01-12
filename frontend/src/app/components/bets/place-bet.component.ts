import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BetService } from '../../services/bet.service';
import { MatchService } from '../../services/match.service';
import { GroupService } from '../../services/group.service';
import { Match } from '../../models/match.model';
import { Group } from '../../models/group.model';
import { PlaceBetData } from '../../models/bet.model';
import { TranslatePipe } from '../../services/translate.pipe';
import { TeamTranslatePipe } from '../../pipes/team-translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { AuthService } from '../../services/auth.service';
import { getTeamByName } from '../../data/teams.data';

@Component({
  selector: 'app-place-bet',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, TeamTranslatePipe],
  template: `
    <div class="container">
      <button class="back-btn" (click)="goBack()">← {{ 'bets.back' | translate }}</button>

      <div class="bet-card" *ngIf="match">
        <h2>{{ hasExistingBet ? ('bets.yourBet' | translate) : ('bets.placeYourBet' | translate) }}</h2>

        <div class="match-info">
          <div class="competition">{{ match.competition }}</div>
          <div class="teams">
            <div class="team team-home">
              <span>{{ match.homeTeam | teamTranslate }}</span>
              <img *ngIf="getTeamLogo(match.homeTeam)" [src]="getTeamLogo(match.homeTeam)" [alt]="match.homeTeam | teamTranslate" class="team-logo" (error)="onImageError($event)">
            </div>
            <span class="vs">{{ 'matches.vs' | translate }}</span>
            <div class="team team-away">
              <img *ngIf="getTeamLogo(match.awayTeam)" [src]="getTeamLogo(match.awayTeam)" [alt]="match.awayTeam | teamTranslate" class="team-logo" (error)="onImageError($event)">
              <span>{{ match.awayTeam | teamTranslate }}</span>
            </div>
          </div>
          <div class="date">{{ match.matchDate | date:'dd/MM/yy, HH:mm' }}</div>
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
                <img *ngIf="getTeamLogo(match.homeTeam)" [src]="getTeamLogo(match.homeTeam)" [alt]="match.homeTeam | teamTranslate" class="outcome-logo" (error)="onImageError($event)">
                <span class="label">1</span>
                <span class="team-name">{{ match.homeTeam | teamTranslate }}</span>
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
                <img *ngIf="getTeamLogo(match.awayTeam)" [src]="getTeamLogo(match.awayTeam)" [alt]="match.awayTeam | teamTranslate" class="outcome-logo" (error)="onImageError($event)">
                <span class="label">2</span>
                <span class="team-name">{{ match.awayTeam | teamTranslate }}</span>
              </button>
            </div>
          </div>

          <div class="points-info">
            <h4>{{ 'bets.pointsSystem' | translate }}</h4>
            <p *ngIf="!getMatchRelativePoints()">{{ 'bets.correctResultReward' | translate }}</p>
            <div *ngIf="getMatchRelativePoints()" class="relative-points-display">
              <div class="points-row">
                <span class="label">{{ match.homeTeam | teamTranslate }} (1):</span>
                <span class="points">{{ getMatchRelativePoints()?.homeWin }} {{ getMatchRelativePoints()?.homeWin === 1 ? ('bets.point' | translate) : ('bets.points' | translate) }}</span>
              </div>
              <div class="points-row">
                <span class="label">{{ 'bets.draw' | translate }} (X):</span>
                <span class="points">{{ getMatchRelativePoints()?.draw }} {{ getMatchRelativePoints()?.draw === 1 ? ('bets.point' | translate) : ('bets.points' | translate) }}</span>
              </div>
              <div class="points-row">
                <span class="label">{{ match.awayTeam | teamTranslate }} (2):</span>
                <span class="points">{{ getMatchRelativePoints()?.awayWin }} {{ getMatchRelativePoints()?.awayWin === 1 ? ('bets.point' | translate) : ('bets.points' | translate) }}</span>
              </div>
            </div>
          </div>

          <div *ngIf="group?.betType === 'relative' && !isMatchInPast" class="wager-section">
            <h4>{{ 'bets.wager' | translate }}</h4>
            <div class="credits-display">
              <span class="label">{{ 'bets.availableCredits' | translate }}:</span>
              <span class="value">{{ effectiveCredits }}</span>
            </div>
            <div class="form-group" style="margin-top: 1rem;">
              <label for="wagerAmount">{{ 'bets.wagerAmount' | translate }} *</label>
              <input
                type="number"
                id="wagerAmount"
                name="wagerAmount"
                [(ngModel)]="wagerAmount"
                min="1"
                [max]="effectiveCredits"
                step="1"
                class="form-control"
                [placeholder]="'bets.enterWagerAmount' | translate"
                [disabled]="isMatchInPast || effectiveCredits <= 0"
                required>
            </div>
            <div *ngIf="wagerAmount && betData.outcome && getMatchRelativePoints()" class="potential-win">
              <span class="label">{{ 'bets.potentialWin' | translate }}:</span>
              <span class="value">{{ calculatePotentialWin() }} {{ 'groups.credits' | translate }}</span>
            </div>
            <div *ngIf="effectiveCredits <= 0" class="error-message" style="margin-top: 1rem;">
              {{ 'groups.eliminated' | translate }} - {{ 'bets.insufficientCredits' | translate }}
            </div>
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
              [disabled]="!betData.outcome || loading || (group?.betType === 'relative' && (!wagerAmount || effectiveCredits <= 0))"
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
      max-width: 720px;
      margin: 2rem auto;
      padding: 2rem;
      animation: fadeIn 0.5s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .back-btn {
      background: rgba(74, 222, 128, 0.1);
      border: none;
      color: #22c55e;
      cursor: pointer;
      font-size: 0.95rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
      padding: 0.75rem 1.25rem;
      border-radius: 10px;
      transition: all 0.3s ease;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    .back-btn:hover {
      background: rgba(74, 222, 128, 0.2);
      transform: translateX(-4px);
    }
    .bet-card {
      background: white;
      padding: 2.5rem;
      border-radius: 24px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(0, 0, 0, 0.04);
    }
    h2 {
      margin: 0 0 2rem 0;
      color: #1a1a2e;
      text-align: center;
      font-size: 1.75rem;
      font-weight: 700;
      font-family: 'Poppins', sans-serif;
    }
    .match-info {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      padding: 2rem;
      border-radius: 16px;
      margin-bottom: 2rem;
      text-align: center;
      border: 2px solid #e2e8f0;
    }
    .competition {
      color: #64748b;
      font-size: 0.9rem;
      margin-bottom: 0.75rem;
      font-weight: 500;
    }
    .teams {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 1.25rem 0;
      font-size: 1.3rem;
      font-weight: 700;
    }
    .team {
      color: #1a1a2e;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .team-home {
      justify-content: flex-end;
    }
    .team-away {
      justify-content: flex-start;
    }
    .team-logo {
      width: 32px;
      height: 32px;
      object-fit: contain;
      border-radius: 4px;
    }
    .outcome-logo {
      width: 40px;
      height: 40px;
      object-fit: contain;
      border-radius: 6px;
    }
    .vs {
      color: #94a3b8;
      margin: 0 1.25rem;
      font-weight: 400;
    }
    .date {
      color: #64748b;
      font-size: 0.9rem;
    }
    .form-section {
      margin-bottom: 2rem;
    }
    h3 {
      margin: 0 0 1.25rem 0;
      color: #1a1a2e;
      font-size: 1.1rem;
      font-weight: 600;
    }
    .outcome-buttons {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }
    .outcome-btn {
      padding: 1.5rem 1rem;
      border: 3px solid #e2e8f0;
      border-radius: 16px;
      background: white;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }
    .outcome-btn:hover:not(:disabled) {
      border-color: #4ade80;
      transform: translateY(-4px);
      box-shadow: 0 8px 20px rgba(74, 222, 128, 0.2);
    }
    .outcome-btn.selected {
      border-color: #22c55e;
      background: linear-gradient(135deg, rgba(74, 222, 128, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%);
      box-shadow: 0 4px 15px rgba(74, 222, 128, 0.25);
    }
    .outcome-btn:disabled {
      cursor: not-allowed;
      opacity: 0.5;
      transform: none;
    }
    .outcome-btn .label {
      font-size: 2rem;
      font-weight: 700;
      color: #1a1a2e;
      font-family: 'Poppins', sans-serif;
    }
    .outcome-btn.selected .label {
      color: #16a34a;
    }
    .outcome-btn .team-name {
      font-size: 0.85rem;
      color: #64748b;
      text-align: center;
      font-weight: 500;
    }
    .points-info {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(29, 78, 216, 0.05) 100%);
      padding: 1.25rem;
      border-radius: 12px;
      margin-bottom: 1.75rem;
      border-left: 4px solid #3b82f6;
    }
    .points-info h4 {
      margin: 0 0 0.5rem 0;
      color: #1e40af;
      font-size: 0.95rem;
      font-weight: 600;
    }
    .points-info p {
      margin: 0;
      color: #3b82f6;
      font-size: 0.9rem;
    }
    .relative-points-display {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .points-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: white;
      border-radius: 8px;
      border: 1px solid #bfdbfe;
    }
    .points-row .label {
      color: #475569;
      font-weight: 600;
      font-size: 0.95rem;
    }
    .points-row .points {
      color: #1e40af;
      font-weight: 700;
      font-size: 1rem;
    }
    .wager-section {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%);
      padding: 1.5rem;
      border-radius: 12px;
      margin-bottom: 1.75rem;
      border-left: 4px solid #10b981;
    }
    .wager-section h4 {
      margin: 0 0 1rem 0;
      color: #047857;
      font-size: 1rem;
      font-weight: 700;
    }
    .credits-display {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: white;
      border-radius: 8px;
      border: 2px solid #a7f3d0;
    }
    .credits-display .label {
      color: #475569;
      font-weight: 600;
      font-size: 0.95rem;
    }
    .credits-display .value {
      color: #047857;
      font-weight: 700;
      font-size: 1.25rem;
    }
    .form-group {
      margin-bottom: 0;
    }
    .form-group label {
      display: block;
      margin-bottom: 0.6rem;
      color: #047857;
      font-weight: 600;
      font-size: 0.95rem;
    }
    .form-control {
      width: 100%;
      padding: 1rem 1.25rem;
      border: 2px solid #a7f3d0;
      border-radius: 12px;
      font-size: 1rem;
      font-family: inherit;
      transition: all 0.3s ease;
      background: white;
    }
    .form-control:focus {
      outline: none;
      border-color: #10b981;
      background: white;
      box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.15);
    }
    .form-control::placeholder {
      color: #94a3b8;
    }
    .form-control:disabled {
      background: #f1f5f9;
      cursor: not-allowed;
      opacity: 0.6;
    }
    .potential-win {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: #dcfce7;
      border-radius: 8px;
      border: 2px solid #10b981;
      margin-top: 1rem;
    }
    .potential-win .label {
      color: #047857;
      font-weight: 600;
      font-size: 0.95rem;
    }
    .potential-win .value {
      color: #047857;
      font-weight: 700;
      font-size: 1.25rem;
    }
    .button-group {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
    }
    .btn-primary, .btn-secondary {
      padding: 0.9rem 1.75rem;
      border: none;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .btn-primary {
      background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
      color: white;
      box-shadow: 0 4px 15px rgba(74, 222, 128, 0.3);
    }
    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(74, 222, 128, 0.4);
    }
    .btn-primary:disabled {
      background: linear-gradient(135deg, #cbd5e0 0%, #94a3b8 100%);
      box-shadow: none;
      cursor: not-allowed;
      transform: none;
    }
    .btn-secondary {
      background: #f1f5f9;
      color: #475569;
    }
    .btn-secondary:hover {
      background: #e2e8f0;
    }
    .error-message {
      color: #dc2626;
      margin-bottom: 1.25rem;
      padding: 1rem;
      background: #fee2e2;
      border-radius: 12px;
      border-left: 4px solid #ef4444;
      font-weight: 500;
    }
    .success-message {
      color: #16a34a;
      margin-bottom: 1.25rem;
      padding: 1rem;
      background: #dcfce7;
      border-radius: 12px;
      border-left: 4px solid #22c55e;
      font-weight: 500;
    }
    .warning-message {
      color: #d97706;
      margin-bottom: 1.25rem;
      padding: 1rem;
      background: #fef3c7;
      border-radius: 12px;
      border-left: 4px solid #f59e0b;
      font-weight: 500;
    }
    .info-message {
      color: #1d4ed8;
      margin-bottom: 1.25rem;
      padding: 1rem;
      background: #dbeafe;
      border-radius: 12px;
      border-left: 4px solid #3b82f6;
      font-weight: 500;
    }
    @media (max-width: 640px) {
      .container {
        padding: 1rem;
      }
      .bet-card {
        padding: 1.5rem;
      }
      .outcome-buttons {
        grid-template-columns: 1fr;
      }
      .outcome-btn {
        flex-direction: row;
        justify-content: center;
        gap: 1rem;
      }
    }
  `]
})
export class PlaceBetComponent implements OnInit {
  match: Match | null = null;
  group: Group | null = null;
  betData: PlaceBetData = {
    matchId: '',
    groupId: '',
    outcome: '' as any
  };
  wagerAmount: number | null = null;
  userCredits: number = 0;
  errorMessage = '';
  successMessage = '';
  loading = false;
  hasExistingBet = false;
  existingBet: any = null;
  isMatchInPast = false;

  // Effective credits = current credits + existing bet wager (if editing)
  get effectiveCredits(): number {
    if (this.hasExistingBet && this.existingBet?.wagerAmount) {
      return this.userCredits + this.existingBet.wagerAmount;
    }
    return this.userCredits;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private betService: BetService,
    private matchService: MatchService,
    private groupService: GroupService,
    private authService: AuthService,
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

      if (this.betData.groupId) {
        this.loadGroup();
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
          if (this.existingBet.wagerAmount) {
            this.wagerAmount = this.existingBet.wagerAmount;
          }
        }
      },
      error: (error) => {
        console.error('Failed to check existing bet:', error);
      }
    });
  }

  loadGroup(): void {
    this.groupService.getGroupById(this.betData.groupId).subscribe({
      next: (response) => {
        this.group = response.data;
        // Calculate user's current credits from group members
        const currentUserId = this.authService.getCurrentUser()?.id;
        if (currentUserId && this.group.members) {
          const member = this.group.members.find(m => m.user._id === currentUserId);
          if (member) {
            this.userCredits = member.points;
          }
        }
      },
      error: (error) => {
        console.error('Failed to load group:', error);
      }
    });
  }

  calculatePotentialWin(): number {
    if (!this.wagerAmount || !this.betData.outcome) {
      return 0;
    }

    const relativePoints = this.getMatchRelativePoints();
    if (!relativePoints) {
      return this.wagerAmount;
    }

    let multiplier = 1;
    switch (this.betData.outcome) {
      case '1':
        multiplier = relativePoints.homeWin;
        break;
      case 'X':
        multiplier = relativePoints.draw;
        break;
      case '2':
        multiplier = relativePoints.awayWin;
        break;
    }

    return Math.round(this.wagerAmount * multiplier);
  }

  selectOutcome(outcome: '1' | 'X' | '2'): void {
    this.betData.outcome = outcome;
  }

  getMatchRelativePoints(): { homeWin: number; draw: number; awayWin: number } | null {
    if (!this.match || !this.match.relativePoints || this.match.relativePoints.length === 0) {
      return null;
    }
    // Find the relative points for this group
    const matchPoints = this.match.relativePoints.find(rp => rp.group === this.betData.groupId);
    return matchPoints || null;
  }

  onSubmit(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Include wagerAmount for relative betting groups
    const betDataToSubmit: PlaceBetData = {
      ...this.betData
    };

    if (this.group?.betType === 'relative' && this.wagerAmount) {
      betDataToSubmit.wagerAmount = this.wagerAmount;
    }

    this.betService.placeBet(betDataToSubmit).subscribe({
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

  // Team logo helpers
  getTeamLogo(teamName: string): string | null {
    const team = getTeamByName(teamName);
    return team ? team.logo : null;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}
