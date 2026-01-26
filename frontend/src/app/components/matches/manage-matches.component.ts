import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatchService } from '../../services/match.service';
import { GroupService } from '../../services/group.service';
import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';
import { Match } from '../../models/match.model';
import { Group } from '../../models/group.model';
import { TranslatePipe } from '../../services/translate.pipe';
import { TeamTranslatePipe } from '../../pipes/team-translate.pipe';
import { AppSelectComponent, SelectGroup } from '../shared/app-select/app-select.component';
import { getTeamByName, ISRAELI_LEAGUES } from '../../data/teams.data';

@Component({
  selector: 'app-manage-matches',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, TeamTranslatePipe, AppSelectComponent],
  templateUrl: './manage-matches.component.html',
  styleUrls: ['./manage-matches.component.css']
})
export class ManageMatchesComponent implements OnInit {
  groupId: string = '';
  group: Group | null = null;
  groupMatches: Match[] = [];
  loadingGroupMatches = false;

  // Team select options grouped by league
  teamGroups: SelectGroup[] = ISRAELI_LEAGUES.map(league => ({
    name: league.name,
    nameHe: league.nameHe,
    options: league.teams.map(team => ({
      value: team.name,
      label: team.nameEn,
      labelHe: team.nameHe,
      image: team.logo
    }))
  }));

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
    relativePoints: {
      homeWin: number | null;
      draw: number | null;
      awayWin: number | null;
    };
  } = {
    homeTeam: '',
    awayTeam: '',
    matchDate: '',
    matchHour: '',
    homeScore: null,
    awayScore: null,
    relativePoints: {
      homeWin: 1,
      draw: 1,
      awayWin: 1
    }
  };

  // Score update
  editingMatchId: string | null = null;
  editingMatchDetails = false;
  updateScoreData: { homeScore: number | null; awayScore: number | null } = {
    homeScore: null,
    awayScore: null
  };
  loadingScoreUpdate = false;
  scoreUpdateError = '';

  // Edit match
  editMatchData: {
    homeTeam: string;
    awayTeam: string;
    matchDate: string;
    matchHour: string;
    relativePoints: { homeWin: number; draw: number; awayWin: number };
  } = {
    homeTeam: '',
    awayTeam: '',
    matchDate: '',
    matchHour: '',
    relativePoints: { homeWin: 1, draw: 1, awayWin: 1 }
  };
  loadingEditMatch = false;
  editMatchError = '';

  // Delete match
  deletingMatchId: string | null = null;
  loadingDeleteMatch = false;

  // Sync matches (for automatic groups)
  loadingSync = false;
  syncMessage = '';
  syncError = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private matchService: MatchService,
    private groupService: GroupService,
    private authService: AuthService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.groupId = this.route.snapshot.queryParams['groupId'];
    if (!this.groupId) {
      void this.router.navigate(['/groups']);
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
      if (this.manualMatch.homeScore === null || this.manualMatch.awayScore === null) {
        return false;
      }
    }

    // Validate relative points if group is 'relative' type
    if (this.group?.betType === 'relative') {
      const pointsValid = !!(
        this.manualMatch.relativePoints.homeWin &&
        this.manualMatch.relativePoints.draw &&
        this.manualMatch.relativePoints.awayWin &&
        this.manualMatch.relativePoints.homeWin > 0 &&
        this.manualMatch.relativePoints.draw > 0 &&
        this.manualMatch.relativePoints.awayWin > 0
      );
      if (!pointsValid) return false;
    }

    return true;
  }

  createManualMatch(): void {
    this.loadingManual = true;
    this.manualMatchMessage = '';
    this.manualMatchError = '';

    // Create a proper Date object from local date/time inputs
    // This ensures the correct UTC time is sent to the server
    const localDateTime = new Date(`${this.manualMatch.matchDate}T${this.manualMatch.matchHour}`);

    const data: any = {
      homeTeam: this.manualMatch.homeTeam,
      awayTeam: this.manualMatch.awayTeam,
      matchDateTime: localDateTime.toISOString(), // Send as ISO string (UTC)
      groupId: this.groupId
    };

    if (this.isPastMatch()) {
      data.homeScore = this.manualMatch.homeScore;
      data.awayScore = this.manualMatch.awayScore;
    }

    // Include relativePoints if group is 'relative' type
    if (this.group?.betType === 'relative') {
      data.relativePoints = {
        homeWin: this.manualMatch.relativePoints.homeWin,
        draw: this.manualMatch.relativePoints.draw,
        awayWin: this.manualMatch.relativePoints.awayWin
      };
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
          awayScore: null,
          relativePoints: {
            homeWin: 1,
            draw: 1,
            awayWin: 1
          }
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

  canManageGroup(): boolean {
    return this.isGroupCreator() || this.authService.isAdmin();
  }

  isAutomaticGroup(): boolean {
    return this.group?.matchType === 'automatic';
  }

  syncMatches(): void {
    if (!this.groupId) return;

    this.loadingSync = true;
    this.syncMessage = '';
    this.syncError = '';

    this.matchService.syncLeagueToGroup(this.groupId).subscribe({
      next: (response) => {
        this.syncMessage = this.translationService.translate('groups.matchesSynced') +
          ` (${response.data.added} ${this.translationService.translate('matches.added')})`;
        this.loadingSync = false;
        this.loadMatches();
      },
      error: (error) => {
        this.syncError = error.error?.message || 'Failed to sync matches';
        this.loadingSync = false;
      }
    });
  }

  goBack(): void {
    void this.router.navigate(['/groups', this.groupId]);
  }

  canUpdateScore(match: Match): boolean {
    // Can update if match is not finished and match has started
    if (match.status === 'FINISHED') return false;
    const matchDate = new Date(match.matchDate);
    return new Date() >= matchDate;
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

  markAsFinished(matchId: string): void {
    if (!confirm(this.translationService.translate('matches.confirmMarkFinished'))) {
      return;
    }

    this.matchService.markMatchAsFinished({
      matchId,
      groupId: this.groupId
    }).subscribe({
      next: () => {
        this.loadMatches();
      },
      error: (error) => {
        alert(error.error?.message || 'Failed to mark match as finished');
      }
    });
  }

  // Edit match methods
  openEditMatch(match: Match): void {
    this.editingMatchId = match._id;
    this.editingMatchDetails = true;
    this.deletingMatchId = null;

    // Parse date and time from matchDate
    const matchDate = new Date(match.matchDate);
    const dateStr = matchDate.toISOString().split('T')[0];
    const hours = matchDate.getHours().toString().padStart(2, '0');
    const minutes = matchDate.getMinutes().toString().padStart(2, '0');

    // Get relative points for this group
    const matchRelativePoints = match.relativePoints?.find(rp => rp.group === this.groupId);

    this.editMatchData = {
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      matchDate: dateStr,
      matchHour: `${hours}:${minutes}`,
      relativePoints: {
        homeWin: matchRelativePoints?.homeWin || 1,
        draw: matchRelativePoints?.draw || 1,
        awayWin: matchRelativePoints?.awayWin || 1
      }
    };
    this.editMatchError = '';
  }

  submitEditMatch(matchId: string): void {
    this.loadingEditMatch = true;
    this.editMatchError = '';

    // Create a proper Date object from local date/time inputs
    const localDateTime = new Date(`${this.editMatchData.matchDate}T${this.editMatchData.matchHour}`);

    const updateData: any = {
      matchId,
      groupId: this.groupId,
      homeTeam: this.editMatchData.homeTeam,
      awayTeam: this.editMatchData.awayTeam,
      matchDateTime: localDateTime.toISOString() // Send as ISO string (UTC)
    };

    // Include relative points if this is a relative group
    if (this.group?.betType === 'relative') {
      updateData.relativePoints = this.editMatchData.relativePoints;
    }

    this.matchService.editMatch(updateData).subscribe({
      next: () => {
        this.loadingEditMatch = false;
        this.editingMatchId = null;
        this.editingMatchDetails = false;
        this.loadMatches();
      },
      error: (error) => {
        this.editMatchError = error.error?.message || 'Failed to edit match';
        this.loadingEditMatch = false;
      }
    });
  }

  cancelEditMatch(): void {
    this.editingMatchId = null;
    this.editingMatchDetails = false;
    this.editMatchData = {
      homeTeam: '',
      awayTeam: '',
      matchDate: '',
      matchHour: '',
      relativePoints: { homeWin: 1, draw: 1, awayWin: 1 }
    };
    this.editMatchError = '';
  }

  // Delete match methods
  confirmDeleteMatch(match: Match): void {
    this.deletingMatchId = match._id;
    this.editingMatchId = null;
    this.editingMatchDetails = false;
  }

  deleteMatch(matchId: string): void {
    this.loadingDeleteMatch = true;

    this.matchService.deleteMatch(matchId, this.groupId).subscribe({
      next: () => {
        this.loadingDeleteMatch = false;
        this.deletingMatchId = null;
        this.loadMatches();
      },
      error: (error) => {
        console.error('Failed to delete match:', error);
        this.loadingDeleteMatch = false;
      }
    });
  }

  cancelDeleteMatch(): void {
    this.deletingMatchId = null;
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
