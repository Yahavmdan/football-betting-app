import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { GroupService } from '../../../services/group.service';
import { MatchService, ApiTeam, ApiFixture, LeagueStandings, StandingTeam } from '../../../services/match.service';
import { BetService } from '../../../services/bet.service';
import { AuthService } from '../../../services/auth.service';
import { TranslationService } from '../../../services/translation.service';
import { Group, GroupMember, PendingMember } from '../../../models/group.model';
import { Match } from '../../../models/match.model';
import { MemberBet, Bet } from '../../../models/bet.model';
import { UserStatistics } from '../../../services/bet.service';
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
export class GroupDetailComponent implements OnInit, OnDestroy {
  @HostListener('document:click')
  onDocumentClick(): void {
    this.showGroupMenu = false;
  }

  groupId: string = '';
  group: Group | null = null;
  leaderboard: GroupMember[] = [];
  matches: Match[] = [];
  filteredMatches: Match[] = [];
  allBets: Bet[] = [];
  loadingLeaderboard = true;
  loadingMatches = true;
  matchesWithBets: Set<string> = new Set();
  refreshingLive = false;
  refreshingMatchId: string | null = null; // Track which individual match is being refreshed
  syncingMatches = false;
  linkCopied = false;
  showGroupMenu = false;

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

  // Match card expand/collapse
  expandedMatchId: string | null = null;
  expandedMatch: Match | null = null; // Store the actual match object for H2H and form data
  headToHeadMatches: Match[] = [];
  homeTeamRecentMatches: Match[] = [];
  awayTeamRecentMatches: Match[] = [];
  loadingHeadToHead = false;
  loadingTeamForm = false;

  // Member bets viewer
  viewingBetsForMatch: string | null = null;
  memberBets: MemberBet[] = [];
  loadingMemberBets = false;

  // Profile picture modal
  viewingProfilePicture: { _id: string; username: string; profilePicture?: string | null; lastActive?: Date } | null = null;
  userStatistics: UserStatistics | null = null;
  loadingStatistics = false;

  // Trash talk
  showTrashTalkInput = false;
  trashTalkMessage = '';
  trashTalkTeamLogo: string | null = null;
  trashTalkBgColor: string | null = null;
  trashTalkTextColor: string | null = null;
  loadingTrashTalk = false;
  visibleTrashTalks: Map<string, boolean> = new Map();
  private trashTalkInterval: any;

  // Team logos for trash talk
  teamLogos: { name: string; logo: string }[] = [];

  // Color palette for trash talk
  colorPalette: string[] = [
    '#FFD700', '#FFA500', '#FF6600', '#DC143C', '#8B0000',
    '#FF1493', '#9400D3', '#800080', '#0000FF', '#1E90FF',
    '#00BFFF', '#00CED1', '#008000', '#00FF00', '#32CD32',
    '#808080', '#000000', '#FFFFFF'
  ];

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

  // API teams for automatic groups
  apiTeams: ApiTeam[] = [];
  loadingApiTeams = false;

  // League standings
  showStandings = false;
  leagueStandings: LeagueStandings | null = null;
  loadingStandings = false;
  standingsError = '';

  // Round grouping for automatic groups
  matchesByRound: RoundGroup[] = [];
  allRounds: RoundGroup[] = []; // All rounds before pagination
  visiblePastRounds = 1; // Number of past rounds to show (default: last played round)
  visibleFutureRounds = 1; // Number of future rounds to show (default: next round)
  hasMorePastRounds = false;
  hasMoreFutureRounds = false;
  currentRoundIndex = 0; // Index of the "current" round (first with upcoming matches)

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
    this.initTeamLogos();
  }

  private initTeamLogos(): void {
    // Get team logos for selection
    this.teamLogos = this.allTeams.slice(0, 20).map(team => ({
      name: team.name,
      logo: team.logo || ''
    })).filter(team => team.logo);
  }

  private initTeamSelectOptions(): void {
    // For automatic groups, use API teams; for manual groups, use local teams
    if (this.isAutomaticGroup() && this.apiTeams.length > 0) {
      this.teamSelectOptions = this.apiTeams.map(team => ({
        value: team.id.toString(), // Use team ID for API filtering
        label: team.name,
        image: team.logo || undefined
      }));
    } else {
      this.teamSelectOptions = this.allTeams.map(team => ({
        value: team.name,
        label: team.name,
        image: team.logo || undefined
      }));
    }
  }

  loadGroupDetails(): void {
    this.groupService.getGroupById(this.groupId).subscribe({
      next: (response) => {
        this.group = response.data;
        // Load pending members after group is loaded (needs group data for canManageGroup check)
        this.loadPendingMembers();
        // For automatic groups, load teams from API and rebuild round options
        if (this.isAutomaticGroup()) {
          this.loadApiTeams();
        }
      },
      error: (error) => {
        console.error('Failed to load group:', error);
        void this.router.navigate(['/groups']);
      }
    });
  }

  isAutomaticGroup(): boolean {
    return this.group?.matchType === 'automatic';
  }

  hasLiveMatches(): boolean {
    const now = new Date();
    return this.filteredMatches.some(match => {
      // Match is live if status is LIVE OR (status is SCHEDULED and matchDate is in the past)
      const matchDate = new Date(match.matchDate);
      return match.status === 'LIVE' || (match.status === 'SCHEDULED' && matchDate <= now);
    });
  }

  refreshLiveMatches(): void {
    if (this.refreshingLive) return;

    this.refreshingLive = true;

    // Call the refresh API to get fresh live data from external API
    this.matchService.refreshLiveMatches(this.groupId).subscribe({
      next: (response) => {
        // Update matches with fresh data
        this.matches = response.data.sort((a, b) => {
          // SCHEDULED/LIVE matches come first
          if ((a.status === 'SCHEDULED' || a.status === 'LIVE') && b.status === 'FINISHED') return -1;
          if (a.status === 'FINISHED' && (b.status === 'SCHEDULED' || b.status === 'LIVE')) return 1;

          const dateA = new Date(a.matchDate).getTime();
          const dateB = new Date(b.matchDate).getTime();

          if (a.status !== 'FINISHED') {
            return dateA - dateB;
          } else {
            return dateB - dateA;
          }
        });
        this.applyFilters();
        this.refreshingLive = false;
      },
      error: (error) => {
        console.error('Failed to refresh live matches:', error);
        this.refreshingLive = false;
      }
    });
  }

  // Refresh a single match (more efficient - 1 API call per match)
  refreshSingleMatch(match: Match, event: Event): void {
    event.stopPropagation(); // Prevent expanding/collapsing the match card

    if (this.refreshingMatchId) return; // Already refreshing a match

    this.refreshingMatchId = match._id;

    this.matchService.refreshSingleMatch(match._id).subscribe({
      next: (response) => {
        // Update the match in the local array
        const index = this.matches.findIndex(m => m._id === match._id);
        if (index !== -1) {
          this.matches[index] = response.data;
        }

        // Also update in filtered matches
        const filteredIndex = this.filteredMatches.findIndex(m => m._id === match._id);
        if (filteredIndex !== -1) {
          this.filteredMatches[filteredIndex] = response.data;
        }

        this.groupMatchesByRound();
        this.refreshingMatchId = null;
      },
      error: (error) => {
        console.error('Failed to refresh match:', error);
        this.refreshingMatchId = null;
      }
    });
  }

  // Check if a match can be refreshed (is from API and is live or started)
  canRefreshMatch(match: Match): boolean {
    if (!match.externalApiId) return false; // Only API matches can be refreshed
    const now = new Date();
    const matchDate = new Date(match.matchDate);
    // Can refresh if LIVE or SCHEDULED but already started
    return match.status === 'LIVE' || (match.status === 'SCHEDULED' && matchDate <= now);
  }

  loadApiTeams(): void {
    if (!this.group?.selectedLeague) return;

    this.loadingApiTeams = true;
    this.matchService.getLeagueTeams(this.group.selectedLeague, this.group.selectedSeason).subscribe({
      next: (response) => {
        this.apiTeams = response.data;
        this.initTeamSelectOptions(); // Reinitialize with API teams
        this.loadingApiTeams = false;
      },
      error: (error) => {
        console.error('Failed to load API teams:', error);
        this.loadingApiTeams = false;
      }
    });
  }

  toggleStandings(): void {
    this.showStandings = !this.showStandings;
    if (this.showStandings && !this.leagueStandings && !this.loadingStandings) {
      this.loadStandings();
    }
  }

  loadStandings(): void {
    if (!this.group?.selectedLeague) return;

    this.loadingStandings = true;
    this.standingsError = '';
    this.matchService.getLeagueStandings(this.group.selectedLeague, this.group.selectedSeason).subscribe({
      next: (response) => {
        this.leagueStandings = response.data;
        this.loadingStandings = false;
      },
      error: (error) => {
        console.error('Failed to load standings:', error);
        this.standingsError = error.error?.message || 'Failed to load standings';
        this.loadingStandings = false;
      }
    });
  }

  syncMatches(): void {
    if (this.syncingMatches || !this.group?.selectedLeague) return;

    this.syncingMatches = true;
    this.matchService.syncLeagueToGroup(this.groupId).subscribe({
      next: () => {
        this.syncingMatches = false;
        // Reload matches to show newly synced data
        this.loadMatches();
      },
      error: (error) => {
        console.error('Failed to sync matches:', error);
        this.syncingMatches = false;
      }
    });
  }

  loadLeaderboard(): void {
    this.groupService.getLeaderboard(this.groupId).subscribe({
      next: (response) => {
        this.leaderboard = response.data;
        this.loadingLeaderboard = false;
        this.updateMemberSelectOptions();
        this.startTrashTalkRotation();
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

  copyJoinLink(): void {
    if (!this.group?.inviteCode) return;

    const joinUrl = `${window.location.origin}/join/${this.group.inviteCode}`;

    navigator.clipboard.writeText(joinUrl).then(() => {
      this.linkCopied = true;
      setTimeout(() => {
        this.linkCopied = false;
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy link:', err);
    });
  }

  isMatchInPast(matchDate: Date | string): boolean {
    return new Date(matchDate) <= new Date();
  }

  toggleMatchExpand(match: Match): void {
    const matchId = match._id;
    if (this.expandedMatchId === matchId) {
      this.expandedMatchId = null;
      this.expandedMatch = null;
      // Close any open panels when collapsing
      this.viewingBetsForMatch = null;
      this.placingBetForMatch = null;
      this.editingMatchId = null;
      this.headToHeadMatches = [];
      this.homeTeamRecentMatches = [];
      this.awayTeamRecentMatches = [];
    } else {
      this.expandedMatchId = matchId;
      this.expandedMatch = match;
      // Fetch head-to-head history and team form
      this.loadHeadToHead(match);
      this.loadTeamForm(match);
    }
  }

  loadHeadToHead(match: Match): void {
    if (!match) {
      console.error('Match not provided for head-to-head');
      return;
    }

    this.loadingHeadToHead = true;
    this.headToHeadMatches = [];

    // Pass team IDs for API-Football lookup (for automatic groups)
    this.matchService.getHeadToHead(
      match.homeTeam,
      match.awayTeam,
      match.homeTeamId,
      match.awayTeamId
    ).subscribe({
      next: (response) => {
        this.headToHeadMatches = response.data;
        this.loadingHeadToHead = false;
      },
      error: (error) => {
        console.error('Failed to load head-to-head:', error);
        this.loadingHeadToHead = false;
      }
    });
  }

  loadTeamForm(match: Match): void {
    if (!match) {
      console.error('Match not provided for team form');
      return;
    }

    this.loadingTeamForm = true;
    this.homeTeamRecentMatches = [];
    this.awayTeamRecentMatches = [];

    // Load home team recent matches (with teamId for API-Football)
    this.matchService.getTeamRecentMatches(match.homeTeam, match.homeTeamId).subscribe({
      next: (response) => {
        this.homeTeamRecentMatches = response.data;
      },
      error: (error) => {
        console.error('Failed to load home team form:', error);
      }
    });

    // Load away team recent matches (with teamId for API-Football)
    this.matchService.getTeamRecentMatches(match.awayTeam, match.awayTeamId).subscribe({
      next: (response) => {
        this.awayTeamRecentMatches = response.data;
        this.loadingTeamForm = false;
      },
      error: (error) => {
        console.error('Failed to load away team form:', error);
        this.loadingTeamForm = false;
      }
    });
  }

  getTeamResult(match: Match, team: string): 'W' | 'D' | 'L' {
    if (!match.result) return 'D';
    const isHome = match.homeTeam === team;
    const homeScore = match.result.homeScore ?? 0;
    const awayScore = match.result.awayScore ?? 0;

    if (homeScore === awayScore) return 'D';
    if (isHome) {
      return homeScore > awayScore ? 'W' : 'L';
    } else {
      return awayScore > homeScore ? 'W' : 'L';
    }
  }

  loadMyBets(): void {
    this.betService.getMyBets(this.groupId).subscribe({
      next: (response) => {
        const betMatchIds: string[] = [];
        response.data.forEach(bet => {
          const match = bet.match;
          if (match) {
            // Add the MongoDB _id
            betMatchIds.push(match._id || match);
            // Also add externalApiId if present (for API matches)
            if (match.externalApiId) {
              betMatchIds.push(match.externalApiId);
            }
          }
        });
        this.matchesWithBets = new Set(betMatchIds);
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
    // Can update if match is not finished, not live, and match has started
    if (match.status === 'FINISHED') return false;
    if (match.status === 'LIVE') return false; // Don't allow manual score updates for live matches
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
  getTeamLogo(teamName: string, match?: Match): string | null {
    // For automatic groups with API data, use the logo from the match
    if (this.isAutomaticGroup() && match) {
      if (match.homeTeam === teamName && match.homeTeamLogo) {
        return match.homeTeamLogo;
      }
      if (match.awayTeam === teamName && match.awayTeamLogo) {
        return match.awayTeamLogo;
      }
      // Try to find in API teams list
      const apiTeam = this.apiTeams.find(t => t.name === teamName);
      if (apiTeam) return apiTeam.logo;
    }
    // Fall back to local team data
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
    this.resetRoundPagination(); // Reset to show only current rounds
    this.applyFilters();
  }

  applyFilters(): void {
    // For automatic groups, use API-based filtering
    if (this.isAutomaticGroup() && this.group?.selectedLeague) {
      this.applyApiFilters();
      return;
    }

    // For manual groups, use local filtering
    this.applyLocalFilters();
  }

  private applyLocalFilters(): void {
    let filtered = [...this.matches];
    const now = new Date();

    // Status filters (if any status filter is active, apply OR logic between them)
    const hasStatusFilter = this.filters.showFinished || this.filters.showNotStarted || this.filters.showOngoing;
    if (hasStatusFilter) {
      filtered = filtered.filter(match => {
        const matchDate = new Date(match.matchDate);
        const isFinished = match.status === 'FINISHED';
        const isNotStarted = match.status === 'SCHEDULED' && matchDate > now;
        // Ongoing includes: LIVE status OR SCHEDULED with past matchDate (started but not marked as LIVE yet)
        const isOngoing = match.status === 'LIVE' || (match.status === 'SCHEDULED' && matchDate <= now);

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
    this.groupMatchesByRound();
    this.closeFilterDialog();

    // Save filters if enabled
    if (this.saveFiltersEnabled) {
      this.saveFiltersToServer();
    }
  }

  private applyApiFilters(): void {
    this.loadingMatches = true;

    // Build API filter params
    const apiFilters: any = {
      leagueId: this.group!.selectedLeague!
    };

    if (this.group?.selectedSeason) {
      apiFilters.season = this.group.selectedSeason;
    }

    // Status filter - map to API status values
    const statusFilters: string[] = [];
    if (this.filters.showFinished) statusFilters.push('FINISHED');
    if (this.filters.showNotStarted) statusFilters.push('SCHEDULED');
    if (this.filters.showOngoing) statusFilters.push('LIVE');
    if (statusFilters.length > 0) {
      apiFilters.status = statusFilters;
    }

    // Date filters - ensure proper order
    let dateFrom = this.filters.dateFrom;
    let dateTo = this.filters.dateTo;

    // Swap dates if they're reversed
    if (dateFrom && dateTo && dateFrom > dateTo) {
      console.log(`Frontend: Swapping reversed dates: ${dateFrom} <-> ${dateTo}`);
      [dateFrom, dateTo] = [dateTo, dateFrom];
    }

    if (dateFrom) {
      apiFilters.dateFrom = dateFrom;
    }
    if (dateTo) {
      apiFilters.dateTo = dateTo;
    }

    // Team filter (API supports single team, so use first selected)
    if (this.filters.selectedTeams.length === 1) {
      apiFilters.teamId = this.filters.selectedTeams[0];
    }

    // Score filter
    if (this.filters.homeScore !== null) {
      apiFilters.homeScore = this.filters.homeScore;
    }
    if (this.filters.awayScore !== null) {
      apiFilters.awayScore = this.filters.awayScore;
    }

    // Add groupId to fetch local DB matches as well
    if (this.groupId) {
      apiFilters.groupId = this.groupId;
    }

    this.matchService.getFilteredFixtures(apiFilters).subscribe({
      next: (response) => {
        // Transform API fixtures to match format for display
        let fixtures = response.data.map(fixture => this.apiFixtureToMatch(fixture));

        // Apply multiple team filter locally if more than one team selected
        if (this.filters.selectedTeams.length > 1) {
          fixtures = fixtures.filter(match => {
            const matchHomeId = (match as any).homeTeamId?.toString();
            const matchAwayId = (match as any).awayTeamId?.toString();
            return this.filters.selectedTeams.some(teamId =>
              matchHomeId === teamId || matchAwayId === teamId
            );
          });
        }

        // Apply members who betted filter locally (requires local bet data)
        if (this.filters.selectedMembers.length > 0) {
          // For API matches, we need to match by externalApiId
          fixtures = fixtures.filter(match => {
            return this.filters.selectedMembers.some(memberId => {
              return this.allBets.some(bet => {
                const betMatch = typeof bet.match === 'object' ? bet.match : null;
                const betUserId = typeof bet.user === 'string' ? bet.user : bet.user?._id;
                // Match by externalApiId if available
                if (betMatch && 'externalApiId' in betMatch) {
                  return (betMatch as any).externalApiId === match.externalApiId && betUserId === memberId;
                }
                return false;
              });
            });
          });
        }

        // Merge local DB matches (for matches with status updated locally, like LIVE)
        const localMatches = this.matches.filter(localMatch => {
          // Include local matches that don't exist in API results or have different status
          const apiMatch = fixtures.find(f =>
            f.externalApiId === localMatch.externalApiId || f._id === localMatch._id
          );
          // If not in API results, include it if it passes the status filter
          if (!apiMatch) {
            if (statusFilters.length === 0) return true;
            return statusFilters.includes(localMatch.status);
          }
          // If in API but local has LIVE status (manually set), prefer local
          if (localMatch.status === 'LIVE' && apiMatch.status !== 'LIVE') {
            return true;
          }
          return false;
        });

        // Add local matches to fixtures, replacing API version if exists
        localMatches.forEach(localMatch => {
          const existingIndex = fixtures.findIndex(f =>
            f.externalApiId === localMatch.externalApiId || f._id === localMatch._id
          );
          if (existingIndex !== -1) {
            fixtures[existingIndex] = localMatch;
          } else {
            fixtures.push(localMatch);
          }
        });

        // Sort matches: LIVE first, then upcoming, then finished
        fixtures.sort((a, b) => {
          // LIVE matches come first
          if (a.status === 'LIVE' && b.status !== 'LIVE') return -1;
          if (a.status !== 'LIVE' && b.status === 'LIVE') return 1;
          // Then SCHEDULED
          if (a.status === 'SCHEDULED' && b.status !== 'SCHEDULED') return -1;
          if (a.status !== 'SCHEDULED' && b.status === 'SCHEDULED') return 1;

          const dateA = new Date(a.matchDate).getTime();
          const dateB = new Date(b.matchDate).getTime();

          if (a.status === 'SCHEDULED') {
            return dateA - dateB;
          } else {
            return dateB - dateA;
          }
        });

        this.filteredMatches = fixtures;
        this.groupMatchesByRound();
        this.loadingMatches = false;
        this.closeFilterDialog();

        // Save filters if enabled
        if (this.saveFiltersEnabled) {
          this.saveFiltersToServer();
        }
      },
      error: (error) => {
        console.error('Failed to load filtered fixtures:', error);
        this.loadingMatches = false;
        // Fall back to local filtering
        this.applyLocalFilters();
      }
    });
  }

  private apiFixtureToMatch(fixture: ApiFixture): Match {
    // Find the local match to get relativePoints (stored in our DB, not from API)
    const localMatch = this.matches.find(m =>
      m.externalApiId === fixture.externalApiId
    );

    return {
      _id: localMatch?._id || fixture.externalApiId, // Use real DB _id if available
      externalApiId: fixture.externalApiId,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      matchDate: new Date(fixture.matchDate),
      status: fixture.status as 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED',
      result: fixture.result ? {
        homeScore: fixture.result.homeScore,
        awayScore: fixture.result.awayScore,
        outcome: fixture.result.outcome as '1' | 'X' | '2'
      } : undefined,
      competition: fixture.competition,
      season: fixture.season?.toString(),
      groups: localMatch?.groups || [],
      // Include relativePoints from local match (stored in our DB)
      relativePoints: localMatch?.relativePoints,
      // Store additional API data for filtering
      homeTeamId: fixture.homeTeamId,
      awayTeamId: fixture.awayTeamId,
      homeTeamLogo: fixture.homeTeamLogo,
      awayTeamLogo: fixture.awayTeamLogo,
      round: fixture.round,
      // Live match fields
      elapsed: fixture.elapsed,
      extraTime: fixture.extraTime,
      statusShort: fixture.statusShort
    } as Match & { homeTeamId?: number; awayTeamId?: number; homeTeamLogo?: string; awayTeamLogo?: string };
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
  openProfilePicture(user: { _id: string; username: string; profilePicture?: string | null; lastActive?: Date }): void {
    this.viewingProfilePicture = user;
    this.userStatistics = null;
    this.loadingStatistics = true;

    this.betService.getUserStatistics(user._id, this.groupId).subscribe({
      next: (response) => {
        this.userStatistics = response.data;
        this.loadingStatistics = false;
      },
      error: (error) => {
        console.error('Failed to load user statistics:', error);
        this.loadingStatistics = false;
      }
    });
  }

  closeProfilePicture(): void {
    this.viewingProfilePicture = null;
    this.userStatistics = null;
  }

  // Trash talk methods
  startTrashTalkRotation(): void {
    // Clear any existing interval
    if (this.trashTalkInterval) {
      clearTimeout(this.trashTalkInterval);
    }

    // Schedule first trash talk after a random delay
    this.scheduleNextTrashTalk();
  }

  scheduleNextTrashTalk(): void {
    // Random delay between 5-10 seconds
    const delay = 5000 + Math.random() * 5000;

    this.trashTalkInterval = setTimeout(() => {
      this.showRandomTrashTalk();
      // Schedule next one after this one finishes
      this.scheduleNextTrashTalk();
    }, delay);
  }

  showRandomTrashTalk(): void {
    // Get members with trash talk messages
    const membersWithTrashTalk = this.leaderboard.filter(m => m.trashTalk?.message);
    if (membersWithTrashTalk.length === 0) return;

    // Pick one random member to show
    const randomIndex = Math.floor(Math.random() * membersWithTrashTalk.length);
    const member = membersWithTrashTalk[randomIndex];

    // Show the trash talk
    this.visibleTrashTalks.set(member.user._id, true);

    // Hide after 4 seconds with fade out
    setTimeout(() => {
      this.visibleTrashTalks.set(member.user._id, false);
    }, 4000);
  }

  isTrashTalkVisible(userId: string): boolean {
    return this.visibleTrashTalks.get(userId) === true;
  }

  showTrashTalkManual(userId: string): void {
    // Show the trash talk bubble for this user
    this.visibleTrashTalks.set(userId, true);

    // Hide after 4 seconds
    setTimeout(() => {
      this.visibleTrashTalks.set(userId, false);
    }, 4000);
  }

  openTrashTalkInput(): void {
    // Find current user's trash talk
    const currentUserId = this.authService.getCurrentUser()?.id;
    const member = this.leaderboard.find(m => m.user._id === currentUserId);
    this.trashTalkMessage = member?.trashTalk?.message || '';
    this.trashTalkTeamLogo = member?.trashTalk?.teamLogo || null;
    this.trashTalkBgColor = member?.trashTalk?.bgColor || null;
    this.trashTalkTextColor = member?.trashTalk?.textColor || null;
    this.showTrashTalkInput = true;
  }

  closeTrashTalkInput(): void {
    this.showTrashTalkInput = false;
    this.trashTalkMessage = '';
    this.trashTalkTeamLogo = null;
    this.trashTalkBgColor = null;
    this.trashTalkTextColor = null;
  }

  selectTrashTalkTeam(team: { name: string; logo: string }): void {
    this.trashTalkTeamLogo = team.logo;
  }

  clearTrashTalkTeam(): void {
    this.trashTalkTeamLogo = null;
  }

  selectTrashTalkColor(color: string): void {
    this.trashTalkBgColor = color;
  }

  clearTrashTalkColor(): void {
    this.trashTalkBgColor = null;
  }

  selectTrashTalkTextColor(color: string): void {
    this.trashTalkTextColor = color;
  }

  clearTrashTalkTextColor(): void {
    this.trashTalkTextColor = null;
  }

  submitTrashTalk(): void {
    this.loadingTrashTalk = true;
    const message = this.trashTalkMessage.trim() || null;
    const currentUserId = this.authService.getCurrentUser()?.id;

    this.groupService.updateTrashTalk(this.groupId, message, this.trashTalkTeamLogo, this.trashTalkBgColor, this.trashTalkTextColor).subscribe({
      next: () => {
        this.loadingTrashTalk = false;
        this.showTrashTalkInput = false;

        // Update the leaderboard and show the message immediately
        this.groupService.getLeaderboard(this.groupId).subscribe({
          next: (response) => {
            this.leaderboard = response.data;

            // Show the user's message immediately if they set one
            if (message && currentUserId) {
              this.visibleTrashTalks.set(currentUserId, true);
              setTimeout(() => {
                this.visibleTrashTalks.set(currentUserId, false);
              }, 4000);
            }
          }
        });
      },
      error: (error) => {
        console.error('Failed to update trash talk:', error);
        this.loadingTrashTalk = false;
      }
    });
  }

  getCurrentUserTrashTalk(): string | null {
    const currentUserId = this.authService.getCurrentUser()?.id;
    const member = this.leaderboard.find(m => m.user._id === currentUserId);
    return member?.trashTalk?.message || null;
  }

  ngOnDestroy(): void {
    if (this.trashTalkInterval) {
      clearTimeout(this.trashTalkInterval);
    }
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

    // For API matches in relative groups, refresh to get latest odds
    if (match.externalApiId && this.group?.betType === 'relative') {
      this.refreshMatchOdds(match);
    }
  }

  // Refresh a single match to get latest odds (for relative betting)
  private refreshMatchOdds(match: Match): void {
    this.matchService.refreshSingleMatch(match._id, this.groupId).subscribe({
      next: (response) => {
        // Update the match in local arrays with fresh data
        const updatedMatch = response.data;

        const matchIndex = this.matches.findIndex(m => m._id === match._id || m.externalApiId === match.externalApiId);
        if (matchIndex !== -1) {
          this.matches[matchIndex] = updatedMatch;
        }

        const filteredIndex = this.filteredMatches.findIndex(m => m._id === match._id || m.externalApiId === match.externalApiId);
        if (filteredIndex !== -1) {
          this.filteredMatches[filteredIndex] = updatedMatch;
        }

        // Re-group matches by round to reflect updated data
        this.groupMatchesByRound();
      },
      error: (error) => {
        console.error('Failed to refresh match odds:', error);
        // Don't show error to user - just use existing odds
      }
    });
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

  getMatchRelativePoints(match: Match): { homeWin: number; draw: number; awayWin: number; fromApi?: boolean } | null {
    // For relative groups, always return points (use defaults if not available)
    if (this.group?.betType !== 'relative') {
      return null;
    }

    if (match && match.relativePoints && match.relativePoints.length > 0) {
      // Convert to string for comparison (group could be ObjectId or string)
      const matchPoints = match.relativePoints.find(rp =>
        rp.group?.toString() === this.groupId || rp.group === this.groupId
      );
      if (matchPoints) {
        return matchPoints;
      }
    }

    // Return default values for relative groups without specific odds
    return { homeWin: 1, draw: 1, awayWin: 1, fromApi: false };
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

    // For API matches (externalApiId), include the full match data so backend can create it if needed
    if (this.inlineBetData.matchId.startsWith('apifootball_')) {
      const match = this.filteredMatches.find(m => m._id === this.inlineBetData.matchId) ||
                    this.matches.find(m => m._id === this.inlineBetData.matchId);
      if (match) {
        betDataToSubmit.matchData = {
          externalApiId: match.externalApiId,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          matchDate: match.matchDate,
          status: match.status,
          competition: match.competition,
          season: match.season,
          homeTeamId: (match as any).homeTeamId,
          awayTeamId: (match as any).awayTeamId,
          homeTeamLogo: (match as any).homeTeamLogo,
          awayTeamLogo: (match as any).awayTeamLogo
        };
      }
    }

    this.betService.placeBet(betDataToSubmit).subscribe({
      next: (response) => {
        this.inlineBetSuccess = response.message || this.translationService.translate('bets.betPlacedSuccess');
        this.inlineLoadingBet = false;
        // Immediately mark this match as having a bet (instant feedback)
        this.matchesWithBets.add(this.inlineBetData.matchId);
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

  // Round grouping methods for automatic groups
  groupMatchesByRound(): void {
    if (!this.isAutomaticGroup()) {
      this.matchesByRound = [];
      this.allRounds = [];
      return;
    }

    const roundMap = new Map<string, Match[]>();

    // Group matches by round
    this.filteredMatches.forEach(match => {
      const round = match.round || 'Unknown';
      if (!roundMap.has(round)) {
        roundMap.set(round, []);
      }
      roundMap.get(round)!.push(match);
    });

    // Convert to array and calculate date ranges
    this.allRounds = Array.from(roundMap.entries()).map(([round, matches]) => {
      // Sort matches within round by date
      matches.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());

      const dates = matches.map(m => new Date(m.matchDate));
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

      return {
        round: round,
        roundNumber: this.extractRoundNumber(round),
        startDate: minDate,
        endDate: maxDate,
        matches: matches
      };
    });

    // Sort rounds by their number (extract number from round string)
    this.allRounds.sort((a, b) => {
      const numA = this.extractRoundNumber(a.round);
      const numB = this.extractRoundNumber(b.round);
      return numA - numB;
    });

    // Apply pagination only when no filters are active
    if (this.hasActiveFilters()) {
      // Show all rounds when filters are applied
      this.matchesByRound = [...this.allRounds];
      this.hasMorePastRounds = false;
      this.hasMoreFutureRounds = false;
    } else {
      // Apply round pagination
      this.applyRoundPagination();
    }
  }

  // Find the current round and apply pagination
  private applyRoundPagination(): void {
    if (this.allRounds.length === 0) {
      this.matchesByRound = [];
      this.hasMorePastRounds = false;
      this.hasMoreFutureRounds = false;
      return;
    }

    const now = new Date();

    // Find the "current" round: first round that has upcoming matches (not all finished)
    // If all rounds are finished, use the last round
    this.currentRoundIndex = this.allRounds.findIndex(round => {
      // A round is "current" if it has at least one match that is not finished
      return round.matches.some(match => match.status !== 'FINISHED');
    });

    // If all rounds are finished, set current to the last round
    if (this.currentRoundIndex === -1) {
      this.currentRoundIndex = this.allRounds.length - 1;
    }

    // Calculate visible range
    // Past rounds: from (currentRoundIndex - visiblePastRounds) to (currentRoundIndex - 1)
    // Future rounds: from currentRoundIndex to (currentRoundIndex + visibleFutureRounds - 1)
    const startIndex = Math.max(0, this.currentRoundIndex - this.visiblePastRounds);
    const endIndex = Math.min(this.allRounds.length - 1, this.currentRoundIndex + this.visibleFutureRounds - 1);

    // Slice the visible rounds
    this.matchesByRound = this.allRounds.slice(startIndex, endIndex + 1);

    // Check if there are more rounds to load
    this.hasMorePastRounds = startIndex > 0;
    this.hasMoreFutureRounds = endIndex < this.allRounds.length - 1;
  }

  // Load more previous rounds (3 at a time)
  loadPreviousRounds(): void {
    this.visiblePastRounds += 3;
    this.applyRoundPagination();
  }

  // Load more future rounds (3 at a time)
  loadFutureRounds(): void {
    this.visibleFutureRounds += 3;
    this.applyRoundPagination();
  }

  // Reset pagination when filters change
  resetRoundPagination(): void {
    this.visiblePastRounds = 1;
    this.visibleFutureRounds = 1;
  }

  extractRoundNumber(round: string): number {
    const match = round.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  formatRoundDateRange(startDate: Date, endDate: Date): string {
    const formatDate = (d: Date) => {
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear().toString().slice(-2);
      return `${day}/${month}/${year}`;
    };

    if (startDate.toDateString() === endDate.toDateString()) {
      return formatDate(startDate);
    }
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }
}

// Interface for round grouping
export interface RoundGroup {
  round: string;
  roundNumber: number;
  startDate: Date;
  endDate: Date;
  matches: Match[];
}
