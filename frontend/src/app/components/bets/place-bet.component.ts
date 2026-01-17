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
  templateUrl: './place-bet.component.html',
  styleUrls: ['./place-bet.component.css']
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
          void this.router.navigate(['/groups', this.betData.groupId]);
        }, 1500);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || this.translationService.translate('bets.placeBetFailed');
        this.loading = false;
      }
    });
  }

  goBack(): void {
    void this.router.navigate(['/groups', this.betData.groupId]);
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
