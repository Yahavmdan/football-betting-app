import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { GroupService } from '../../../services/group.service';
import { MatchService } from '../../../services/match.service';
import { BetService } from '../../../services/bet.service';
import { AuthService } from '../../../services/auth.service';
import { TranslationService } from '../../../services/translation.service';
import { Group, GroupMember, PendingMember } from '../../../models/group.model';
import { Match } from '../../../models/match.model';
import { MemberBet, Bet } from '../../../models/bet.model';
import { TranslatePipe } from '../../../services/translate.pipe';
import { TeamTranslatePipe } from '../../../pipes/team-translate.pipe';
import { getTeamByName, getAllTeams, Team } from '../../../data/teams.data';
import { environment } from '../../../../environments/environment';
import { AppSelectComponent, SelectOption } from '../../shared/app-select/app-select.component';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe, TeamTranslatePipe, AppSelectComponent],
  templateUrl: './group-detail.component.html',
  styleUrls: ['./group-detail.component.css']
})
export class GroupDetailComponent implements OnInit {
  groupId: string = '';
  group: Group | null = null;
  leaderboard: GroupMember[] = [];
  matches: Match[] = [];
  filteredMatches: Match[] = [];
  allBets: Bet[] = [];
  loadingLeaderboard = true;
  loadingMatches = true;
  matchesWithBets: Set<string> = new Set();

  // Score update
  editingMatchId: string | null = null;
  updateScoreData: { homeScore: number | null; awayScore: number | null } = {
    homeScore: null,
    awayScore: null
  };
  loadingScoreUpdate = false;
  scoreUpdateError = '';

  // Group management
  editingGroup = false;
  editGroupData: { name: string; description: string } = { name: '', description: '' };
  loadingEditGroup = false;
  editGroupError = '';

  deletingGroup = false;
  loadingDeleteGroup = false;

  leavingGroup = false;
  loadingLeaveGroup = false;

  // Member management
  pendingMembers: PendingMember[] = [];
  loadingPendingMembers = false;
  kickingMemberId: string | null = null;
  loadingKickMember = false;

  // Member bets viewer
  viewingBetsForMatch: string | null = null;
  memberBets: MemberBet[] = [];
  loadingMemberBets = false;

  // Profile picture modal
  viewingProfilePicture: { username: string; profilePicture?: string | null; lastActive?: Date } | null = null;

  // Inline bet form state
  placingBetForMatch: string | null = null;
  inlineBetData: { matchId: string; groupId: string; outcome: '1' | 'X' | '2' | '' } = {
    matchId: '',
    groupId: '',
    outcome: ''
  };
  inlineWagerAmount: number | null = null;
  inlineLoadingBet = false;
  inlineBetError = '';
  inlineBetSuccess = '';
  inlineExistingBet: any = null;
  inlineUserCredits = 0;

  // Filter state
  showFilterDialog = false;
  allTeams: Team[] = getAllTeams();
  saveFiltersEnabled = false;
  private apiBaseUrl = environment.apiUrl.replace('/api', '');

  // Select options for filters
  memberSelectOptions: SelectOption[] = [];
  teamSelectOptions: SelectOption[] = [];
  filters = {
    showFinished: false,
    showNotStarted: false,
    showOngoing: false,
    dateFrom: '',
    dateTo: '',
    selectedMembers: [] as string[],
    selectedTeams: [] as string[],
    homeScore: null as number | null,
    awayScore: null as number | null
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private groupService: GroupService,
    private matchService: MatchService,
    private betService: BetService,
    public authService: AuthService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.groupId = this.route.snapshot.params['id'];
    this.loadGroupDetails();
    this.loadLeaderboard();
    this.loadSavedFilters(); // Load saved filters before loading matches
    this.loadMyBets();
    this.loadAllBets();
    this.initTeamSelectOptions();
  }

  private initTeamSelectOptions(): void {
    this.teamSelectOptions = this.allTeams.map(team => ({
      value: team.name,
      label: team.name,
      image: team.logo || undefined
    }));
  }

  loadGroupDetails(): void {
    this.groupService.getGroupById(this.groupId).subscribe({
      next: (response) => {
        this.group = response.data;
        // Load pending members after group is loaded (needs group data for canManageGroup check)
        this.loadPendingMembers();
      },
      error: (error) => {
        console.error('Failed to load group:', error);
        void this.router.navigate(['/groups']);
      }
    });
  }

  loadLeaderboard(): void {
    this.groupService.getLeaderboard(this.groupId).subscribe({
      next: (response) => {
        this.leaderboard = response.data;
        this.loadingLeaderboard = false;
        this.updateMemberSelectOptions();
      },
      error: (error) => {
        console.error('Failed to load leaderboard:', error);
        this.loadingLeaderboard = false;
      }
    });
  }

  private updateMemberSelectOptions(): void {
    this.memberSelectOptions = this.leaderboard.map(member => ({
      value: member.user._id,
      label: member.user.username
    }));
  }

  loadMatches(): void {
    this.matchService.getMatches(this.groupId).subscribe({
      next: (response) => {
        // Sort matches: upcoming (SCHEDULED) first by date, then finished by date descending
        const sorted = response.data.sort((a, b) => {
          // SCHEDULED matches come first
          if (a.status === 'SCHEDULED' && b.status !== 'SCHEDULED') return -1;
          if (a.status !== 'SCHEDULED' && b.status === 'SCHEDULED') return 1;

          // Within same status, sort by date
          const dateA = new Date(a.matchDate).getTime();
          const dateB = new Date(b.matchDate).getTime();

          if (a.status === 'SCHEDULED') {
            // Upcoming: earliest first
            return dateA - dateB;
          } else {
            // Finished: most recent first
            return dateB - dateA;
          }
        });

        this.matches = sorted;
        this.applyFilters();
        this.loadingMatches = false;
      },
      error: (error) => {
        console.error('Failed to load matches:', error);
        this.loadingMatches = false;
      }
    });
  }

  loadAllBets(): void {
    this.betService.getAllBetsForGroup(this.groupId).subscribe({
      next: (response) => {
        this.allBets = response.data;
      },
      error: (error) => {
        console.error('Failed to load all bets:', error);
      }
    });
  }

  isGroupCreator(): boolean {
    const currentUser = this.authService.getCurrentUser();
    return this.group?.creator?._id === currentUser?.id || this.group?.creator === currentUser?.id;
  }

  canManageGroup(): boolean {
    return this.isGroupCreator() || this.authService.isAdmin();
  }

  isMatchInPast(matchDate: Date | string): boolean {
    return new Date(matchDate) <= new Date();
  }

  loadMyBets(): void {
    this.betService.getMyBets(this.groupId).subscribe({
      next: (response) => {
        this.matchesWithBets = new Set(
          response.data.map(bet => bet.match?._id || bet.match)
        );
      },
      error: (error) => {
        console.error('Failed to load bets:', error);
      }
    });
  }

  hasBetOnMatch(matchId: string): boolean {
    return this.matchesWithBets.has(matchId);
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
        this.loadLeaderboard();
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
        this.loadLeaderboard();
      },
      error: (error) => {
        alert(error.error?.message || 'Failed to mark match as finished');
      }
    });
  }

  // Group edit methods
  openEditGroup(): void {
    this.editingGroup = true;
    this.deletingGroup = false;
    this.leavingGroup = false;
    this.editGroupData = {
      name: this.group?.name || '',
      description: this.group?.description || ''
    };
    this.editGroupError = '';
  }

  submitEditGroup(): void {
    this.loadingEditGroup = true;
    this.editGroupError = '';

    this.groupService.editGroup(this.groupId, {
      name: this.editGroupData.name,
      description: this.editGroupData.description
    }).subscribe({
      next: (response) => {
        this.group = response.data;
        this.loadingEditGroup = false;
        this.editingGroup = false;
      },
      error: (error) => {
        this.editGroupError = error.error?.message || 'Failed to update group';
        this.loadingEditGroup = false;
      }
    });
  }

  cancelEditGroup(): void {
    this.editingGroup = false;
    this.editGroupData = { name: '', description: '' };
    this.editGroupError = '';
  }

  // Group delete methods
  confirmDeleteGroup(): void {
    this.deletingGroup = true;
    this.editingGroup = false;
    this.leavingGroup = false;
  }

  deleteGroup(): void {
    this.loadingDeleteGroup = true;

    this.groupService.deleteGroup(this.groupId).subscribe({
      next: () => {
        this.loadingDeleteGroup = false;
        void this.router.navigate(['/groups']);
      },
      error: (error) => {
        console.error('Failed to delete group:', error);
        this.loadingDeleteGroup = false;
      }
    });
  }

  cancelDeleteGroup(): void {
    this.deletingGroup = false;
  }

  // Leave group methods
  confirmLeaveGroup(): void {
    this.leavingGroup = true;
    this.editingGroup = false;
    this.deletingGroup = false;
  }

  leaveGroup(): void {
    this.loadingLeaveGroup = true;

    this.groupService.leaveGroup(this.groupId).subscribe({
      next: () => {
        this.loadingLeaveGroup = false;
        void this.router.navigate(['/groups']);
      },
      error: (error) => {
        console.error('Failed to leave group:', error);
        this.loadingLeaveGroup = false;
      }
    });
  }

  cancelLeaveGroup(): void {
    this.leavingGroup = false;
  }

  // Member management methods
  loadPendingMembers(): void {
    if (!this.canManageGroup()) return;

    this.loadingPendingMembers = true;
    this.groupService.getPendingMembers(this.groupId).subscribe({
      next: (response) => {
        this.pendingMembers = response.data;
        this.loadingPendingMembers = false;
      },
      error: (error) => {
        console.error('Failed to load pending members:', error);
        this.loadingPendingMembers = false;
      }
    });
  }

  approveMember(userId: string): void {
    this.groupService.approveMember(this.groupId, userId).subscribe({
      next: () => {
        this.loadPendingMembers();
        this.loadLeaderboard();
        this.loadGroupDetails();
      },
      error: (error) => {
        console.error('Failed to approve member:', error);
      }
    });
  }

  rejectMember(userId: string): void {
    this.groupService.rejectMember(this.groupId, userId).subscribe({
      next: () => {
        this.loadPendingMembers();
      },
      error: (error) => {
        console.error('Failed to reject member:', error);
      }
    });
  }

  confirmKickMember(userId: string): void {
    this.kickingMemberId = userId;
  }

  kickMember(userId: string): void {
    this.loadingKickMember = true;
    this.groupService.kickMember(this.groupId, userId).subscribe({
      next: () => {
        this.loadingKickMember = false;
        this.kickingMemberId = null;
        this.loadLeaderboard();
        this.loadGroupDetails();
      },
      error: (error) => {
        console.error('Failed to kick member:', error);
        this.loadingKickMember = false;
      }
    });
  }

  cancelKickMember(): void {
    this.kickingMemberId = null;
  }

  isGroupCreatorMember(memberId: string): boolean {
    return this.group?.creator?._id === memberId || this.group?.creator === memberId;
  }

  // Member bets methods
  toggleMemberBets(matchId: string): void {
    if (this.viewingBetsForMatch === matchId) {
      this.closeMemberBets();
      return;
    }

    this.viewingBetsForMatch = matchId;
    this.loadingMemberBets = true;
    this.memberBets = [];

    this.betService.getGroupMembersBets(matchId, this.groupId).subscribe({
      next: (response) => {
        this.memberBets = response.data;
        this.loadingMemberBets = false;
      },
      error: (error) => {
        console.error('Failed to load member bets:', error);
        this.loadingMemberBets = false;
      }
    });
  }

  closeMemberBets(): void {
    this.viewingBetsForMatch = null;
    this.memberBets = [];
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

  // Profile picture helpers
  getProfilePictureUrl(path: string): string {
    if (!path) return '';
    // Cloudinary URLs are already full URLs
    return path;
  }

  onProfileImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  // Filter methods
  openFilterDialog(): void {
    this.showFilterDialog = true;
  }

  closeFilterDialog(): void {
    this.showFilterDialog = false;
  }

  hasActiveFilters(): boolean {
    return this.filters.showFinished ||
           this.filters.showNotStarted ||
           this.filters.showOngoing ||
           !!this.filters.dateFrom ||
           !!this.filters.dateTo ||
           this.filters.selectedMembers.length > 0 ||
           this.filters.selectedTeams.length > 0 ||
           this.filters.homeScore !== null ||
           this.filters.awayScore !== null;
  }

  getActiveFilterCount(): number {
    let count = 0;
    if (this.filters.showFinished) count++;
    if (this.filters.showNotStarted) count++;
    if (this.filters.showOngoing) count++;
    if (this.filters.dateFrom || this.filters.dateTo) count++;
    if (this.filters.selectedMembers.length > 0) count++;
    if (this.filters.selectedTeams.length > 0) count++;
    if (this.filters.homeScore !== null || this.filters.awayScore !== null) count++;
    return count;
  }

  clearFilters(): void {
    this.filters = {
      showFinished: false,
      showNotStarted: false,
      showOngoing: false,
      dateFrom: '',
      dateTo: '',
      selectedMembers: [],
      selectedTeams: [],
      homeScore: null,
      awayScore: null
    };
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.matches];
    const now = new Date();

    // Status filters (if any status filter is active, apply OR logic between them)
    const hasStatusFilter = this.filters.showFinished || this.filters.showNotStarted || this.filters.showOngoing;
    if (hasStatusFilter) {
      filtered = filtered.filter(match => {
        const matchDate = new Date(match.matchDate);
        const isFinished = match.status === 'FINISHED';
        const isNotStarted = match.status === 'SCHEDULED' && matchDate > now;
        const isOngoing = match.status === 'SCHEDULED' && matchDate <= now;

        return (this.filters.showFinished && isFinished) ||
               (this.filters.showNotStarted && isNotStarted) ||
               (this.filters.showOngoing && isOngoing);
      });
    }

    // Date range filter
    if (this.filters.dateFrom) {
      const fromDate = new Date(this.filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(match => new Date(match.matchDate) >= fromDate);
    }
    if (this.filters.dateTo) {
      const toDate = new Date(this.filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(match => new Date(match.matchDate) <= toDate);
    }

    // Members who betted filter
    if (this.filters.selectedMembers.length > 0) {
      filtered = filtered.filter(match => {
        // Check if any of the selected members have bet on this match
        return this.filters.selectedMembers.some(memberId => {
          return this.allBets.some(bet => {
            const betMatchId = typeof bet.match === 'string' ? bet.match : bet.match?._id;
            const betUserId = typeof bet.user === 'string' ? bet.user : bet.user?._id;
            return betMatchId === match._id && betUserId === memberId;
          });
        });
      });
    }

    // Teams filter
    if (this.filters.selectedTeams.length > 0) {
      filtered = filtered.filter(match => {
        return this.filters.selectedTeams.some(team =>
          match.homeTeam === team || match.awayTeam === team
        );
      });
    }

    // Score filter (for finished matches)
    if (this.filters.homeScore !== null || this.filters.awayScore !== null) {
      filtered = filtered.filter(match => {
        if (match.status !== 'FINISHED' || !match.result) return false;

        const homeMatch = this.filters.homeScore === null || match.result.homeScore === this.filters.homeScore;
        const awayMatch = this.filters.awayScore === null || match.result.awayScore === this.filters.awayScore;

        return homeMatch && awayMatch;
      });
    }

    this.filteredMatches = filtered;
    this.closeFilterDialog();

    // Save filters if enabled
    if (this.saveFiltersEnabled) {
      this.saveFiltersToServer();
    }
  }

  loadSavedFilters(): void {
    this.groupService.getFilterPreferences(this.groupId).subscribe({
      next: (response) => {
        if (response.data && response.data.filters) {
          this.filters = { ...this.filters, ...response.data.filters };
          this.saveFiltersEnabled = response.data.saveEnabled || false;
        }
        this.loadMatches(); // Load matches after filters are loaded
      },
      error: () => {
        // If no saved filters or error, just load matches with default filters
        this.loadMatches();
      }
    });
  }

  saveFiltersToServer(): void {
    this.groupService.saveFilterPreferences(this.groupId, {
      filters: this.filters,
      saveEnabled: this.saveFiltersEnabled
    }).subscribe({
      error: (error) => {
        console.error('Failed to save filter preferences:', error);
      }
    });
  }

  onSaveFiltersToggle(): void {
    if (this.saveFiltersEnabled) {
      // Save current filters
      this.saveFiltersToServer();
    } else {
      // Clear saved filters on server
      this.groupService.clearFilterPreferences(this.groupId).subscribe({
        error: (error) => {
          console.error('Failed to clear filter preferences:', error);
        }
      });
    }
  }

  // Winner and eliminated status helpers
  isWinner(member: GroupMember): boolean {
    // Winner: reached creditsGoal in relative betting groups
    if (this.group?.betType !== 'relative') return false;
    if (!this.group?.creditsGoal) return false;
    return member.points >= this.group.creditsGoal;
  }

  isEliminated(member: GroupMember): boolean {
    // Eliminated: has 0 credits AND no ongoing bets in relative betting groups
    // If user has credits invested in ongoing bets, they are not eliminated yet
    if (this.group?.betType !== 'relative') return false;
    return member.points <= 0 && !member.hasOngoingBets;
  }

  // Online status helper
  isUserOnline(lastActive?: Date): boolean {
    if (!lastActive) return false;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(lastActive) > fiveMinutesAgo;
  }

  // Profile picture modal methods
  openProfilePicture(user: { username: string; profilePicture?: string | null; lastActive?: Date }): void {
    this.viewingProfilePicture = user;
  }

  closeProfilePicture(): void {
    this.viewingProfilePicture = null;
  }

  // Inline bet form methods
  openInlineBetForm(match: Match): void {
    // Close any other open panels
    this.closeMemberBets();
    this.cancelScoreUpdate();

    this.placingBetForMatch = match._id;
    this.inlineBetData = {
      matchId: match._id,
      groupId: this.groupId,
      outcome: ''
    };
    this.inlineWagerAmount = null;
    this.inlineBetError = '';
    this.inlineBetSuccess = '';
    this.inlineExistingBet = null;

    // Load user credits for relative betting
    this.loadUserCredits();

    // Check for existing bet
    this.checkExistingBetForMatch(match._id);
  }

  closeInlineBetForm(): void {
    this.placingBetForMatch = null;
    this.inlineBetData = { matchId: '', groupId: '', outcome: '' };
    this.inlineWagerAmount = null;
    this.inlineBetError = '';
    this.inlineBetSuccess = '';
    this.inlineExistingBet = null;
  }

  loadUserCredits(): void {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (currentUserId && this.group?.members) {
      const member = this.group.members.find(m => m.user._id === currentUserId);
      if (member) {
        this.inlineUserCredits = member.points;
      }
    }
  }

  get inlineEffectiveCredits(): number {
    if (this.inlineExistingBet?.wagerAmount) {
      return this.inlineUserCredits + this.inlineExistingBet.wagerAmount;
    }
    return this.inlineUserCredits;
  }

  checkExistingBetForMatch(matchId: string): void {
    this.betService.checkExistingBet(matchId, this.groupId).subscribe({
      next: (response) => {
        if (response.data.hasBet && response.data.bet) {
          this.inlineExistingBet = response.data.bet;
          this.inlineBetData.outcome = response.data.bet.prediction.outcome;
          if (response.data.bet.wagerAmount) {
            this.inlineWagerAmount = response.data.bet.wagerAmount;
          }
        }
      },
      error: (error) => {
        console.error('Failed to check existing bet:', error);
      }
    });
  }

  selectInlineOutcome(outcome: '1' | 'X' | '2'): void {
    this.inlineBetData.outcome = outcome;
  }

  getMatchRelativePoints(match: Match): { homeWin: number; draw: number; awayWin: number } | null {
    if (!match || !match.relativePoints || match.relativePoints.length === 0) {
      return null;
    }
    const matchPoints = match.relativePoints.find(rp => rp.group === this.groupId);
    return matchPoints || null;
  }

  calculateInlinePotentialWin(match: Match): number {
    if (!this.inlineWagerAmount || !this.inlineBetData.outcome) {
      return 0;
    }

    const relativePoints = this.getMatchRelativePoints(match);
    if (!relativePoints) {
      return this.inlineWagerAmount;
    }

    let multiplier = 1;
    switch (this.inlineBetData.outcome) {
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

    return Math.round(this.inlineWagerAmount * multiplier);
  }

  submitInlineBet(): void {
    this.inlineLoadingBet = true;
    this.inlineBetError = '';
    this.inlineBetSuccess = '';

    const betDataToSubmit: any = {
      matchId: this.inlineBetData.matchId,
      groupId: this.inlineBetData.groupId,
      outcome: this.inlineBetData.outcome
    };

    if (this.group?.betType === 'relative' && this.inlineWagerAmount) {
      betDataToSubmit.wagerAmount = this.inlineWagerAmount;
    }

    this.betService.placeBet(betDataToSubmit).subscribe({
      next: (response) => {
        this.inlineBetSuccess = response.message || this.translationService.translate('bets.betPlacedSuccess');
        this.inlineLoadingBet = false;
        // Refresh data
        this.loadMyBets();
        this.loadLeaderboard();
        this.loadGroupDetails();
        // Close form after short delay
        setTimeout(() => {
          this.closeInlineBetForm();
        }, 1500);
      },
      error: (error) => {
        this.inlineBetError = error.error?.message || this.translationService.translate('bets.placeBetFailed');
        this.inlineLoadingBet = false;
      }
    });
  }
}
