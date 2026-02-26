import { Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { GroupService } from '../../../services/group.service';
import { MatchService, ApiTeam, ApiFixture, LeagueStandings, StandingTeam } from '../../../services/match.service';
import { BetService } from '../../../services/bet.service';
import { AuthService } from '../../../services/auth.service';
import { TranslationService } from '../../../services/translation.service';
import { Group, GroupMember, PendingMember } from '../../../models/group.model';
import { Match, MatchEvent, MatchLineup, MatchTeamStatistics } from '../../../models/match.model';
import { MemberBet, Bet } from '../../../models/bet.model';
import { UserStatistics } from '../../../services/bet.service';
import { TranslatePipe } from '../../../services/translate.pipe';
import { TeamTranslatePipe } from '../../../pipes/team-translate.pipe';
import { getTeamByName, getAllTeams, getTranslatedTeamName, Team } from '../../../data/teams.data';
import { environment } from '../../../../environments/environment';
import { AppSelectComponent, SelectOption } from '../../shared/app-select/app-select.component';
import { ToastService } from '../../shared/toast/toast.service';
import { MatchCardComponent } from '../../shared/match-card/match-card.component';
import { DashboardTabsComponent } from '../../shared/dashboard-tabs/dashboard-tabs.component';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe, TeamTranslatePipe, AppSelectComponent, MatchCardComponent, DashboardTabsComponent],
  templateUrl: './group-detail.component.html',
  styleUrls: ['./group-detail.component.css']
})
export class GroupDetailComponent implements OnInit, OnDestroy {
  readonly matchCardContext = this;
  @HostListener('window:scroll')
  onWindowScroll(): void {
    const separator = this.el.nativeElement.querySelector('.round-separator');
    if (separator) {
      const rect = separator.getBoundingClientRect();
      this.isRoundStuck = rect.top <= 71;
    }
  }

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
  matchesWithBets: Map<string, string> = new Map();
  refreshingLive = false;
  refreshingMatchId: string | null = null; // Track which individual match is being refreshed
  syncingMatches = false;

  // Live match auto-refresh (optimized)
  private liveRefreshInterval: ReturnType<typeof setInterval> | null = null;
  private isPageVisible = true;
  private readonly LIVE_REFRESH_INTERVAL_MS = 60000; // 1 minute
  showGroupMenu = false;

  // Score update
  editingMatchId: string | null = null;
  updateScoreData: { homeScore: number | null; awayScore: number | null } = {
    homeScore: null,
    awayScore: null
  };
  loadingScoreUpdate = false;

  // Group management
  editingGroup = false;
  editGroupData: { name: string; description: string } = { name: '', description: '' };
  loadingEditGroup = false;

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
  showBetting = true;
  showHeadToHead = false;
  showTeamForm = false;

  // Match details tabs
  activeMatchTab: 'events' | 'lineups' | 'statistics' = 'events';

  // Match events
  showMatchEvents = false;
  loadingMatchEvents = false;
  matchEvents: MatchEvent[] = [];
  processedEvents: any[] = [];
  private eventsRefreshInterval: ReturnType<typeof setInterval> | null = null;
  private readonly EVENTS_REFRESH_INTERVAL_MS = 60000; // 1 minute

  // Match lineups
  matchLineups: MatchLineup[] = [];
  loadingMatchLineups = false;

  // Match statistics
  matchStatistics: MatchTeamStatistics[] = [];
  loadingMatchStatistics = false;

  // Cached timestamp for online status checks (prevents ExpressionChangedAfterItHasBeenCheckedError)
  private cachedNow: number = Date.now();
  private onlineCheckInterval: ReturnType<typeof setInterval> | null = null;

  // Member bets viewer
  viewingBetsForMatch: string | null = null;
  memberBets: MemberBet[] = [];
  loadingMemberBets = false;

  // Profile picture modal
  viewingProfilePicture: { _id: string; username: string; profilePicture?: string | null; lastActive?: Date } | null = null;
  userStatistics: UserStatistics | null = null;
  loadingStatistics = false;

  // Admin adjustments
  adminEditingPoints = false;
  adminPointsValue: number | null = null;
  adminEditingStats = false;
  adminStatsTotalBets: number = 0;
  adminStatsCorrectPredictions: number = 0;
  loadingAdminAdjustment = false;

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
  inlineOddsNotAvailable = false;

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
  isRoundStuck = false;

  // Leaderboard collapse state
  isLeaderboardExpanded = false;

  // Round grouping for automatic groups
  matchesByRound: RoundGroup[] = [];
  allRounds: RoundGroup[] = []; // All rounds before pagination
  visiblePastRounds = 1; // Number of past rounds to show below current round
  visibleFutureRounds = 0; // Number of future rounds to show above current round
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
    private translationService: TranslationService,
    private el: ElementRef,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    this.groupId = this.route.snapshot.params['id'];
    this.loadGroupDetails();
    this.loadLeaderboard();
    this.loadSavedFilters(); // Load saved filters before loading matches
    this.loadMyBets();
    this.loadAllBets();
    this.initTeamSelectOptions();
    this.initTeamLogos();

    // Set up page visibility listener for auto-refresh optimization
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // Update cached timestamp periodically for online status checks
    this.onlineCheckInterval = setInterval(() => {
      this.cachedNow = Date.now();
    }, 30000); // Update every 30 seconds
  }

  private initTeamLogos(): void {
    // For automatic groups with API teams loaded, use teams from the group's league
    if (this.apiTeams.length > 0) {
      this.teamLogos = this.apiTeams.map(team => ({
        name: team.name,
        logo: team.logo
      })).filter(team => team.logo);
    } else {
      // Fallback to local teams (first 20) - will be replaced once API teams load
      this.teamLogos = this.allTeams.slice(0, 20).map(team => ({
        name: team.name,
        logo: team.logo || ''
      })).filter(team => team.logo);
    }
  }

  private initTeamSelectOptions(): void {
    const lang = this.translationService.getCurrentLanguage();
    // For automatic groups, use API teams; for manual groups, use local teams
    if (this.isAutomaticGroup() && this.apiTeams.length > 0) {
      this.teamSelectOptions = this.apiTeams.map(team => {
        const localTeam = getTeamByName(team.name);
        return {
          value: team.id.toString(), // Use team ID for API filtering
          label: getTranslatedTeamName(team.name, lang),
          image: (localTeam ? localTeam.logo : team.logo) || undefined
        };
      });
    } else {
      this.teamSelectOptions = this.allTeams.map(team => ({
        value: team.name,
        label: getTranslatedTeamName(team.name, lang),
        image: team.logo || undefined
      }));
    }
  }

  loadGroupDetails(silent = false): void {
    this.groupService.getGroupById(this.groupId, silent).subscribe({
      next: (response) => {
        this.group = response.data;
        // Load pending members after group is loaded (needs group data for canManageGroup check)
        this.loadPendingMembers();
        // For automatic groups, load teams from API and rebuild round options
        if (this.isAutomaticGroup()) {
          this.loadApiTeams();
          // Re-apply filters now that we know it's automatic (fixes sort order if matches loaded first)
          if (this.matches.length > 0) {
            this.applyFilters();
          }
        }
      },
      error: (error) => {
        console.error('Failed to load group:', error);
        void this.router.navigate(['/groups']);
      }
    });
  }

  isAutomaticGroup(): boolean {
    // All groups are now automatic - manual groups have been removed
    return true;
  }

  hasLiveMatches(): boolean {
    const now = new Date();
    const liveMatches = this.matches.filter(match => {
      if (this.isMatchLikelyFinished(match)) return false;
      const matchDate = new Date(match.matchDate);
      return match.status === 'LIVE' || (match.status === 'SCHEDULED' && matchDate <= now);
    });
    return liveMatches.length > 0;
  }

  refreshLiveMatches(): void {
    if (this.refreshingLive) return;

    this.refreshingLive = true;

    // Call the refresh API to get fresh live data from external API
    this.matchService.refreshLiveMatches(this.groupId).subscribe({
      next: (response) => {
        const updatedMatches = response.data;

        // Update only the live matches that were returned
        for (const updatedMatch of updatedMatches) {
          // Update in main matches array
          const index = this.matches.findIndex(m => m._id === updatedMatch._id);
          if (index !== -1) {
            const existing = this.matches[index];
            if (existing.round) updatedMatch.round = existing.round;
            this.matches[index] = updatedMatch;
          }

          // Update in filteredMatches
          const filteredIndex = this.filteredMatches.findIndex(m => m._id === updatedMatch._id);
          if (filteredIndex !== -1) {
            const existingFiltered = this.filteredMatches[filteredIndex];
            if (existingFiltered.round) updatedMatch.round = existingFiltered.round;
            this.filteredMatches[filteredIndex] = updatedMatch;
          }
        }

        this.groupMatchesByRound();
        this.refreshingLive = false;

        // Reload leaderboard if any match finished
        const justFinished = updatedMatches.some(m => m.status === 'FINISHED');
        if (justFinished) {
          this.loadLeaderboard(true);
        }
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
        const updatedMatch = response.data;

        // Preserve the original round to avoid re-categorizing the match
        if (match.round) {
          updatedMatch.round = match.round;
        }

        // Update the match in the local array
        const index = this.matches.findIndex(m => m._id === match._id);
        if (index !== -1) {
          if (!match.round && this.matches[index].round) {
            updatedMatch.round = this.matches[index].round;
          }
          this.matches[index] = updatedMatch;
        }

        // Also update in filtered matches
        const filteredIndex = this.filteredMatches.findIndex(m => m._id === match._id);
        if (filteredIndex !== -1) {
          this.filteredMatches[filteredIndex] = updatedMatch;
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
        this.initTeamLogos(); // Reinitialize team logos for trash talk with league teams
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
    document.body.style.overflow = this.showStandings ? 'hidden' : '';
    if (this.showStandings && !this.loadingStandings) {
      this.loadStandings();
    }
  }

  toggleLeaderboard(): void {
    this.isLeaderboardExpanded = !this.isLeaderboardExpanded;
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

  loadLeaderboard(silent = false): void {
    this.groupService.getLeaderboard(this.groupId, silent).subscribe({
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
        // Sort matches based on group type
        const isAutomatic = this.isAutomaticGroup();
        const sorted = response.data.sort((a, b) => {
          if (isAutomatic) {
            // Automatic groups: most recent first (all statuses)
            return new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime();
          }

          // Manual groups: SCHEDULED first by date, then finished by date descending
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

        this.matches = sorted;
        this.applyFilters();
        this.loadingMatches = false;

        // Start auto-refresh if there are live matches
        this.startLiveRefreshIfNeeded();

        // Reload leaderboard after matches load for automatic groups,
        // because the matches endpoint may have calculated points for
        // newly finished matches
        if (this.isAutomaticGroup()) {
          this.loadLeaderboard(true);
        }
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

    const onSuccess = () => {
      this.toastService.show(this.translationService.translate('groups.linkCopied'), 'success');
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(joinUrl).then(onSuccess).catch(() => this.fallbackCopy(joinUrl, onSuccess));
    } else {
      this.fallbackCopy(joinUrl, onSuccess);
    }
  }

  private fallbackCopy(text: string, onSuccess: () => void): void {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      onSuccess();
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
    document.body.removeChild(textarea);
  }

  isMatchInPast(matchDate: Date | string): boolean {
    return new Date(matchDate) <= new Date();
  }

  private isMatchLikelyFinished(match: Match): boolean {
    if (match.status !== 'SCHEDULED') return false;
    const matchTime = new Date(match.matchDate).getTime();
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
    return (Date.now() - matchTime) > THREE_HOURS_MS;
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
      // Stop events refresh when collapsing
      this.stopEventsRefreshInterval();
    } else {
      this.expandedMatchId = matchId;
      this.expandedMatch = match;
      // Reset collapsible sections - data fetched on demand
      // Collapse betting section by default for live matches
      this.showBetting = !(match.status === 'LIVE' || this.isMatchLive(match));
      this.showHeadToHead = false;
      this.showTeamForm = false;
      this.headToHeadMatches = [];
      this.homeTeamRecentMatches = [];
      this.awayTeamRecentMatches = [];
      // Reset events state
      this.matchEvents = [];
      this.processedEvents = [];
      this.showMatchEvents = false;
      // Reset lineups and statistics
      this.matchLineups = [];
      this.matchStatistics = [];
      this.activeMatchTab = 'events';

      // Auto-open and load match events for live/finished matches
      if (match.externalApiId && (match.status === 'LIVE' || match.status === 'FINISHED' || this.isMatchLive(match))) {
        this.showMatchEvents = true;
        this.loadMatchEvents(match);

        // Start events refresh interval for live matches
        if (match.status === 'LIVE' || this.isMatchLive(match)) {
          this.startEventsRefreshInterval();
        }
      }

      // Auto-open bet form if match can be bet on
      if (this.canPlaceBet(match)) {
        this.openInlineBetForm(match);
      }

      // Auto-load member bets
      this.loadMemberBets(matchId);
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

  toggleHeadToHead(): void {
    this.showHeadToHead = !this.showHeadToHead;
    if (this.showHeadToHead && this.expandedMatch && this.headToHeadMatches.length === 0 && !this.loadingHeadToHead) {
      this.loadHeadToHead(this.expandedMatch);
    }
  }

  toggleTeamForm(): void {
    this.showTeamForm = !this.showTeamForm;
    if (this.showTeamForm && this.expandedMatch && this.homeTeamRecentMatches.length === 0 && this.awayTeamRecentMatches.length === 0 && !this.loadingTeamForm) {
      this.loadTeamForm(this.expandedMatch);
    }
  }

  toggleMatchEvents(): void {
    this.showMatchEvents = !this.showMatchEvents;
    if (this.showMatchEvents && this.expandedMatch && this.matchEvents.length === 0 && !this.loadingMatchEvents) {
      this.loadMatchEvents(this.expandedMatch);
    }

    // Start or stop events refresh interval based on visibility
    if (this.showMatchEvents && this.expandedMatch &&
      (this.expandedMatch.status === 'LIVE' || this.isMatchLive(this.expandedMatch))) {
      this.startEventsRefreshInterval();
    } else {
      this.stopEventsRefreshInterval();
    }
  }

  private isMatchLive(match: Match): boolean {
    if (this.isMatchLikelyFinished(match)) return false;
    const now = new Date();
    const matchDate = new Date(match.matchDate);
    return match.status === 'LIVE' || (match.status === 'SCHEDULED' && matchDate <= now);
  }

  private startEventsRefreshInterval(): void {
    // Don't start if already running or page not visible
    if (this.eventsRefreshInterval || !this.isPageVisible) {
      return;
    }

    this.eventsRefreshInterval = setInterval(() => {
      if (!this.isPageVisible || !this.showMatchEvents || !this.expandedMatch) {
        this.stopEventsRefreshInterval();
        return;
      }

      // Refresh match data (score, minute) and events
      this.refreshExpandedMatchData();
    }, this.EVENTS_REFRESH_INTERVAL_MS);
  }

  private stopEventsRefreshInterval(): void {
    if (this.eventsRefreshInterval) {
      clearInterval(this.eventsRefreshInterval);
      this.eventsRefreshInterval = null;
    }
  }

  private refreshExpandedMatchData(): void {
    if (!this.expandedMatch) return;

    // Refresh match data (score, elapsed time)
    this.matchService.refreshSingleMatch(this.expandedMatch._id).subscribe({
      next: (response) => {
        const updatedMatch = response.data;

        // Preserve round
        if (this.expandedMatch?.round) {
          updatedMatch.round = this.expandedMatch.round;
        }

        // Update the expanded match reference
        this.expandedMatch = updatedMatch;

        // Update in matches arrays
        const index = this.matches.findIndex(m => m._id === updatedMatch._id);
        if (index !== -1) {
          this.matches[index] = updatedMatch;
        }
        const filteredIndex = this.filteredMatches.findIndex(m => m._id === updatedMatch._id);
        if (filteredIndex !== -1) {
          this.filteredMatches[filteredIndex] = updatedMatch;
        }

        this.groupMatchesByRound();

        // If match finished, stop the interval
        if (updatedMatch.status === 'FINISHED') {
          this.stopEventsRefreshInterval();
        }
      },
      error: (error) => {
        console.error('Failed to refresh expanded match:', error);
      }
    });

    // Refresh events and active tabs if showing
    if (this.showMatchEvents && this.expandedMatch.externalApiId) {
      if (this.activeMatchTab === 'events' || this.matchEvents.length > 0) {
        this.loadMatchEvents(this.expandedMatch, true);
      }
      if (this.activeMatchTab === 'lineups' && this.matchLineups.length > 0) {
        this.loadMatchLineups(this.expandedMatch, true);
      }
      if (this.activeMatchTab === 'statistics' && this.matchStatistics.length > 0) {
        this.loadMatchStatistics(this.expandedMatch, true);
      }
    }
  }

  loadMatchEvents(match: Match, silent: boolean = false): void {
    if (!match.externalApiId) return;

    if (!silent) this.loadingMatchEvents = true;

    this.matchService.getMatchEvents(match._id).subscribe({
      next: (response) => {
        // Normalize event types to capitalized form (Goal, Card, Subst, Var)
        this.matchEvents = (response.data || []).map(e => ({
          ...e,
          type: (e.type.charAt(0).toUpperCase() + e.type.slice(1).toLowerCase()) as any
        }));
        this.processedEvents = this.buildProcessedEvents(this.matchEvents, match);
        this.loadingMatchEvents = false;
      },
      error: (error) => {
        console.error('Failed to load match events:', error);
        this.loadingMatchEvents = false;
      }
    });
  }

  loadMatchLineups(match: Match, silent: boolean = false): void {
    if (!match.externalApiId) return;

    if (!silent) this.loadingMatchLineups = true;

    this.matchService.getMatchLineups(match._id).subscribe({
      next: (response) => {
        this.matchLineups = response.data || [];
        this.loadingMatchLineups = false;
      },
      error: (error) => {
        console.error('Failed to load match lineups:', error);
        this.loadingMatchLineups = false;
      }
    });
  }

  loadMatchStatistics(match: Match, silent: boolean = false): void {
    if (!match.externalApiId) return;

    if (!silent) this.loadingMatchStatistics = true;

    this.matchService.getMatchStatistics(match._id).subscribe({
      next: (response) => {
        this.matchStatistics = response.data || [];
        this.loadingMatchStatistics = false;
      },
      error: (error) => {
        console.error('Failed to load match statistics:', error);
        this.loadingMatchStatistics = false;
      }
    });
  }

  selectMatchTab(tab: 'events' | 'lineups' | 'statistics'): void {
    this.activeMatchTab = tab;
    if (!this.expandedMatch) return;

    // Load data if not already loaded
    if (tab === 'events' && this.matchEvents.length === 0 && !this.loadingMatchEvents) {
      this.loadMatchEvents(this.expandedMatch);
    } else if (tab === 'lineups' && this.matchLineups.length === 0 && !this.loadingMatchLineups) {
      this.loadMatchLineups(this.expandedMatch);
    } else if (tab === 'statistics' && this.matchStatistics.length === 0 && !this.loadingMatchStatistics) {
      this.loadMatchStatistics(this.expandedMatch);
    }
  }

  getStatValue(stats: MatchTeamStatistics[], teamIndex: number, statType: string): string | number {
    if (!stats || !stats[teamIndex]) return '-';
    const stat = stats[teamIndex].statistics.find(s => s.type === statType);
    return stat?.value ?? '-';
  }

  // Statistics name translations
  private readonly statTranslations: { [key: string]: { en: string; he: string } } = {
    'Shots on Goal': { en: 'Shots on Goal', he: 'בעיטות למסגרת' },
    'Shots off Goal': { en: 'Shots off Goal', he: 'בעיטות מחוץ למסגרת' },
    'Total Shots': { en: 'Total Shots', he: 'סה"כ בעיטות' },
    'Blocked Shots': { en: 'Blocked Shots', he: 'בעיטות חסומות' },
    'Shots insidebox': { en: 'Shots Inside Box', he: 'בעיטות מתוך הרחבה' },
    'Shots outsidebox': { en: 'Shots Outside Box', he: 'בעיטות מחוץ לרחבה' },
    'Fouls': { en: 'Fouls', he: 'עבירות' },
    'Corner Kicks': { en: 'Corner Kicks', he: 'קרנות' },
    'Offsides': { en: 'Offsides', he: 'נבדלים' },
    'Ball Possession': { en: 'Possession', he: 'אחזקת כדור' },
    'Yellow Cards': { en: 'Yellow Cards', he: 'כרטיסים צהובים' },
    'Red Cards': { en: 'Red Cards', he: 'כרטיסים אדומים' },
    'Goalkeeper Saves': { en: 'Saves', he: 'הצלות' },
    'Total passes': { en: 'Total Passes', he: 'סה"כ מסירות' },
    'Passes accurate': { en: 'Accurate Passes', he: 'מסירות מדויקות' },
    'Passes %': { en: 'Pass Accuracy', he: 'דיוק מסירות' },
    'expected_goals': { en: 'Expected Goals', he: 'שערים צפויים' },
    'goals_prevented': { en: 'Goals Prevented', he: 'שערים שנמנעו' }
  };

  translateStatName(statType: string): string {
    const lang = this.translationService.getCurrentLanguage();
    const translation = this.statTranslations[statType];
    if (translation) {
      return lang === 'he' ? translation.he : translation.en;
    }
    // Return original if no translation found
    return statType;
  }

  // Lineup pitch helpers
  getPlayerRow(grid: string | undefined, teamIndex: number): number {
    if (!grid) return 1;
    const row = parseInt(grid.split(':')[0], 10);
    // For away team (top half), invert the rows
    if (teamIndex === 1) {
      return row;
    }
    return row;
  }

  getPlayerCol(grid: string | undefined): number {
    if (!grid) return 1;
    return parseInt(grid.split(':')[1], 10);
  }

  getRowPlayerCount(players: any[], grid: string | undefined): number {
    if (!grid) return 1;
    const row = grid.split(':')[0];
    return players.filter(p => p.grid && p.grid.startsWith(row + ':')).length;
  }

  getShortName(fullName: string): string {
    if (!fullName) return '';
    const parts = fullName.split(' ');
    if (parts.length === 1) return fullName;
    // Return first initial + last name
    return parts[parts.length - 1];
  }

  getStatPercentage(stats: MatchTeamStatistics[], teamIndex: number, statType: string): number {
    if (!stats || stats.length < 2) return 50;
    const val1 = this.parseStatValue(stats[0].statistics.find(s => s.type === statType)?.value);
    const val2 = this.parseStatValue(stats[1].statistics.find(s => s.type === statType)?.value);
    const total = val1 + val2;
    if (total === 0) return 50;
    return teamIndex === 0 ? (val1 / total) * 100 : (val2 / total) * 100;
  }

  private parseStatValue(value: any): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Handle percentage strings like "65%"
      const numStr = value.replace('%', '');
      return parseFloat(numStr) || 0;
    }
    return 0;
  }

  buildProcessedEvents(events: MatchEvent[], match: Match): any[] {
    const result: any[] = [];
    let htInserted = false;
    let lastFirstHalfExtra = 0;
    let lastSecondHalfExtra = 0;

    // Find max extra time in each half
    for (const e of events) {
      if (e.time.elapsed <= 45 && e.time.extra) {
        lastFirstHalfExtra = Math.max(lastFirstHalfExtra, e.time.extra);
      }
      if (e.time.elapsed > 45 && e.time.extra) {
        lastSecondHalfExtra = Math.max(lastSecondHalfExtra, e.time.extra);
      }
    }

    // Check if match has reached half time
    const hasSecondHalfEvents = events.some(e => e.time.elapsed > 45);
    const matchReachedHalfTime = match.status === 'FINISHED' ||
      hasSecondHalfEvents ||
      (match.elapsed && match.elapsed >= 45) ||
      match.statusShort === 'HT' ||
      match.statusShort === '2H';

    // Sort events by time descending (most recent first)
    const sorted = [...events].sort((a, b) => {
      const timeA = a.time.elapsed * 100 + (a.time.extra || 0);
      const timeB = b.time.elapsed * 100 + (b.time.extra || 0);
      return timeB - timeA;
    });

    // Insert FT marker at the top for finished matches
    if (match.status === 'FINISHED') {
      result.push({
        isMarker: true,
        markerType: 'FT',
        label: lastSecondHalfExtra > 0 ? `90' + ${lastSecondHalfExtra}` : `90'`
      });
    }

    for (const event of sorted) {
      // Insert HT marker after last second-half event (before first-half events)
      // Only show HT if match has actually reached half time
      if (!htInserted && event.time.elapsed <= 45 && matchReachedHalfTime) {
        htInserted = true;
        result.push({
          isMarker: true,
          markerType: 'HT',
          label: lastFirstHalfExtra > 0 ? `45' + ${lastFirstHalfExtra}` : `45'`
        });
      }
      result.push({ isMarker: false, event });
    }

    return result;
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
        const betMap = new Map<string, string>();
        response.data.forEach(bet => {
          const match = bet.match;
          const outcome = bet.prediction?.outcome || '';
          if (match) {
            const matchId = match._id || match;
            betMap.set(matchId, outcome);
            if (match.externalApiId) {
              betMap.set(match.externalApiId, outcome);
            }
          }
        });
        this.matchesWithBets = betMap;
      },
      error: (error) => {
        console.error('Failed to load bets:', error);
      }
    });
  }

  hasBetOnMatch(matchId: string): boolean {
    return this.matchesWithBets.has(matchId);
  }

  getBetOutcome(matchId: string): string {
    return this.matchesWithBets.get(matchId) || '';
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
  }

  submitScoreUpdate(matchId: string): void {
    if (this.updateScoreData.homeScore === null || this.updateScoreData.awayScore === null) {
      return;
    }

    this.loadingScoreUpdate = true;

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
        this.loadLeaderboard(true);
      },
      error: (error) => {
        this.toastService.show(error.error?.message || 'Failed to update score', 'error');
        this.loadingScoreUpdate = false;
      }
    });
  }

  cancelScoreUpdate(): void {
    this.editingMatchId = null;
    this.updateScoreData = { homeScore: null, awayScore: null };
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
        this.toastService.show(error.error?.message || 'Failed to mark match as finished', 'error');
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
  }

  submitEditGroup(): void {
    this.loadingEditGroup = true;

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
        this.toastService.show(error.error?.message || 'Failed to update group', 'error');
        this.loadingEditGroup = false;
      }
    });
  }

  cancelEditGroup(): void {
    this.editingGroup = false;
    this.editGroupData = { name: '', description: '' };
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
        this.loadLeaderboard(true);
        this.loadGroupDetails(true);
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
        this.loadLeaderboard(true);
        this.loadGroupDetails(true);
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
  loadMemberBets(matchId: string): void {
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

  toggleMemberBets(matchId: string): void {
    if (this.viewingBetsForMatch === matchId) {
      this.closeMemberBets();
      return;
    }
    this.loadMemberBets(matchId);
  }

  closeMemberBets(): void {
    this.viewingBetsForMatch = null;
    this.memberBets = [];
  }

  // Team logo helpers
  getTeamLogo(teamName: string, match?: Match): string | null {
    // Always prefer local logo if available
    const localTeam = getTeamByName(teamName);
    if (localTeam) return localTeam.logo;

    // For automatic groups with API data, fall back to API logo
    if (this.isAutomaticGroup() && match) {
      if (match.homeTeam === teamName && match.homeTeamLogo) {
        return match.homeTeamLogo;
      }
      if (match.awayTeam === teamName && match.awayTeamLogo) {
        return match.awayTeamLogo;
      }
      const apiTeam = this.apiTeams.find(t => t.name === teamName);
      if (apiTeam) return apiTeam.logo;
    }
    return null;
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
    document.body.style.overflow = 'hidden';
  }

  closeFilterDialog(): void {
    this.showFilterDialog = false;
    document.body.style.overflow = '';
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
        const likelyFinished = this.isMatchLikelyFinished(match);
        const isFinished = match.status === 'FINISHED' || likelyFinished;
        const isNotStarted = match.status === 'SCHEDULED' && matchDate > now;
        const isOngoing = !likelyFinished && (match.status === 'LIVE' || (match.status === 'SCHEDULED' && matchDate <= now));

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

    // Sort most recent first for automatic groups
    if (this.isAutomaticGroup()) {
      filtered.sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime());
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

        // Merge local DB matches only for LIVE status overrides
        // Only replace API matches with local versions that have LIVE status set manually
        this.matches.forEach(localMatch => {
          if (localMatch.status !== 'LIVE') return;

          const existingIndex = fixtures.findIndex(f =>
            f.externalApiId === localMatch.externalApiId || f._id === localMatch._id
          );
          // Only replace existing API match, never add new ones
          if (existingIndex !== -1 && fixtures[existingIndex].status !== 'LIVE') {
            fixtures[existingIndex] = localMatch;
          }
        });

        // Sort matches: most recent first
        fixtures.sort((a, b) => {
          return new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime();
        });

        this.filteredMatches = fixtures;
        this.groupMatchesByRound();
        this.loadingMatches = false;
        this.closeFilterDialog();

        // Save filters if enabled
        if (this.saveFiltersEnabled) {
          this.saveFiltersToServer();
        }

        // Start live refresh if there are live matches
        this.startLiveRefreshIfNeeded();
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
    const fiveMinutesAgo = this.cachedNow - 5 * 60 * 1000;
    return new Date(lastActive).getTime() > fiveMinutesAgo;
  }

  // Profile picture modal methods
  openProfilePicture(user: { _id: string; username: string; profilePicture?: string | null; lastActive?: Date }): void {
    this.viewingProfilePicture = user;
    this.userStatistics = null;
    this.loadingStatistics = true;
    document.body.style.overflow = 'hidden';

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
    document.body.style.overflow = '';
    this.adminEditingPoints = false;
    this.adminEditingStats = false;
  }

  // Admin adjustment methods
  startEditingPoints(): void {
    if (!this.viewingProfilePicture) return;
    const member = this.leaderboard.find(m => m.user._id === this.viewingProfilePicture!._id);
    this.adminPointsValue = member?.points ?? 0;
    this.adminEditingPoints = true;
  }

  cancelEditingPoints(): void {
    this.adminEditingPoints = false;
    this.adminPointsValue = null;
  }

  savePointsAdjustment(): void {
    if (!this.viewingProfilePicture || this.adminPointsValue === null) return;
    this.loadingAdminAdjustment = true;

    this.groupService.adjustMemberPoints(this.groupId, this.viewingProfilePicture._id, this.adminPointsValue).subscribe({
      next: () => {
        this.loadingAdminAdjustment = false;
        this.adminEditingPoints = false;
        this.toastService.show('Points updated successfully', 'success');
        this.loadLeaderboard();
      },
      error: (error) => {
        this.loadingAdminAdjustment = false;
        this.toastService.show(error.error?.message || 'Failed to update points', 'error');
      }
    });
  }

  startEditingStats(): void {
    if (!this.userStatistics) return;
    this.adminStatsTotalBets = this.userStatistics.statsAdjustment?.totalBets ?? 0;
    this.adminStatsCorrectPredictions = this.userStatistics.statsAdjustment?.correctPredictions ?? 0;
    this.adminEditingStats = true;
  }

  cancelEditingStats(): void {
    this.adminEditingStats = false;
  }

  saveStatsAdjustment(): void {
    if (!this.viewingProfilePicture) return;
    this.loadingAdminAdjustment = true;

    this.groupService.adjustMemberStats(
      this.groupId,
      this.viewingProfilePicture._id,
      this.adminStatsTotalBets,
      this.adminStatsCorrectPredictions
    ).subscribe({
      next: (response) => {
        this.loadingAdminAdjustment = false;
        this.adminEditingStats = false;
        this.toastService.show('Statistics updated successfully', 'success');
        if (this.viewingProfilePicture) {
          this.betService.getUserStatistics(this.viewingProfilePicture._id, this.groupId).subscribe({
            next: (res) => {
              this.userStatistics = res.data;
            }
          });
        }
      },
      error: (error) => {
        this.loadingAdminAdjustment = false;
        this.toastService.show(error.error?.message || 'Failed to update statistics', 'error');
      }
    });
  }

  getMemberPoints(userId: string): number {
    const member = this.leaderboard.find(m => m.user._id === userId);
    return member?.points ?? 0;
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
    // Expand leaderboard if collapsed
    if (!this.isLeaderboardExpanded) {
      this.isLeaderboardExpanded = true;
    }
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
    if (this.onlineCheckInterval) {
      clearInterval(this.onlineCheckInterval);
    }
    this.stopLiveRefreshInterval();
    this.stopEventsRefreshInterval();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  // Arrow function to preserve 'this' context when used as event listener
  private handleVisibilityChange = (): void => {
    this.isPageVisible = !document.hidden;
    if (this.isPageVisible) {
      // Page became visible - restart intervals if needed
      this.startLiveRefreshIfNeeded();
      // Restart events refresh if events section is expanded for a live match
      if (this.showMatchEvents && this.expandedMatch &&
        (this.expandedMatch.status === 'LIVE' || this.isMatchLive(this.expandedMatch))) {
        this.startEventsRefreshInterval();
        // Also do an immediate refresh on visibility restore
        this.refreshExpandedMatchData();
      }
    } else {
      // Page became hidden - stop intervals to save resources
      this.stopLiveRefreshInterval();
      this.stopEventsRefreshInterval();
    }
  };

  private startLiveRefreshIfNeeded(): void {
    // Don't start if already running or page not visible
    if (this.liveRefreshInterval || !this.isPageVisible) {
      return;
    }
    // Run first refresh immediately
    this.refreshLiveMatchesSilently();

    // Then set up interval for subsequent refreshes
    this.liveRefreshInterval = setInterval(() => {
      // Double-check conditions before each refresh
      if (!this.isPageVisible || !this.hasLiveMatches()) {
        this.stopLiveRefreshInterval();
        return;
      }
      this.refreshLiveMatchesSilently();
    }, this.LIVE_REFRESH_INTERVAL_MS);
  }

  private stopLiveRefreshInterval(): void {
    if (this.liveRefreshInterval) {
      clearInterval(this.liveRefreshInterval);
      this.liveRefreshInterval = null;
    }
  }

  private refreshLiveMatchesSilently(): void {
    if (this.refreshingLive) return;

    this.refreshingLive = true;

    this.matchService.refreshLiveMatches(this.groupId).subscribe({
      next: (response) => {
        // Only update matches that changed (live matches)
        const updatedMatches = response.data;

        if (updatedMatches.length === 0) {
          this.refreshingLive = false;
          // Only stop if no more potentially live matches
          if (!this.hasLiveMatches()) {
            this.stopLiveRefreshInterval();
          }
          return;
        }

        let hasChanges = false;

        for (const updatedMatch of updatedMatches) {
          // Update in main matches array
          const index = this.matches.findIndex(m => m._id === updatedMatch._id);
          if (index !== -1) {
            const existing = this.matches[index];
            // Check if match data actually changed
            if (existing.status !== updatedMatch.status ||
              existing.elapsed !== updatedMatch.elapsed ||
              existing.result?.homeScore !== updatedMatch.result?.homeScore ||
              existing.result?.awayScore !== updatedMatch.result?.awayScore) {
              // Preserve round info
              if (existing.round) updatedMatch.round = existing.round;
              this.matches[index] = updatedMatch;
              hasChanges = true;
            }
          }

          // Also update in filteredMatches directly (avoid calling applyFilters which may trigger API)
          const filteredIndex = this.filteredMatches.findIndex(m => m._id === updatedMatch._id);
          if (filteredIndex !== -1) {
            const existingFiltered = this.filteredMatches[filteredIndex];
            // Preserve round info
            if (existingFiltered.round) updatedMatch.round = existingFiltered.round;
            this.filteredMatches[filteredIndex] = updatedMatch;
          }
        }

        if (hasChanges) {
          // Only re-group by round, don't call applyFilters (would trigger API call)
          this.groupMatchesByRound();

          // If a match just finished, reload leaderboard silently
          const justFinished = updatedMatches.some(m => m.status === 'FINISHED');
          if (justFinished) {
            this.loadLeaderboard(true);
          }
        }

        this.refreshingLive = false;

        // Check if we still have live matches, stop interval if not
        if (!this.hasLiveMatches()) {
          this.stopLiveRefreshInterval();
        }
      },
      error: (error) => {
        console.error('Failed to auto-refresh live matches:', error);
        this.refreshingLive = false;
      }
    });
  }

  // Inline bet form methods
  canPlaceBet(match: Match): boolean {
    return match.status === 'SCHEDULED' && !this.isMatchInPast(match.matchDate);
  }

  openInlineBetForm(match: Match): void {
    if (!this.canPlaceBet(match)) return;

    // Close any other open panels
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
    this.inlineOddsNotAvailable = false;

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

        // Preserve the original round to avoid re-categorizing the match
        const originalRound = match.round;
        if (originalRound) {
          updatedMatch.round = originalRound;
        }

        const matchIndex = this.matches.findIndex(m => m._id === match._id || m.externalApiId === match.externalApiId);
        if (matchIndex !== -1) {
          // Preserve existing round if updated match has a different one
          if (!originalRound && this.matches[matchIndex].round) {
            updatedMatch.round = this.matches[matchIndex].round;
          }
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
        // If match not found (404), odds are not available yet for this future match
        if (error.status === 404) {
          this.inlineOddsNotAvailable = true;
        }
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
    this.inlineOddsNotAvailable = false;
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
    // Auto-submit for non-relative groups
    if (this.group?.betType !== 'relative') {
      this.submitInlineBet();
    }
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
    // Prevent betting on started/finished matches
    const match = this.filteredMatches.find(m => m._id === this.inlineBetData.matchId) ||
      this.matches.find(m => m._id === this.inlineBetData.matchId);
    if (match && !this.canPlaceBet(match)) {
      this.toastService.show(
        this.translationService.translate('bets.matchStarted'),
        'error'
      );
      return;
    }

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
        this.toastService.show(
          this.translationService.translate('bets.betPlacedSuccess'),
          'success'
        );
        this.inlineLoadingBet = false;
        // Immediately mark this match as having a bet (instant feedback)
        this.matchesWithBets.set(this.inlineBetData.matchId, this.inlineBetData.outcome);
        // Refresh data silently (no group details reload to avoid global spinner)
        this.loadMyBets();
        this.loadLeaderboard(true);
      },
      error: (error) => {
        this.toastService.show(
          error.error?.message || this.translationService.translate('bets.placeBetFailed'),
          'error'
        );
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

      // Group matches by date
      const dateMap: { [key: string]: Match[] } = {};
      for (const match of matches) {
        const dateKey = new Date(match.matchDate).toDateString();
        if (!dateMap[dateKey]) dateMap[dateKey] = [];
        dateMap[dateKey].push(match);
      }
      const dateGroups: DateGroup[] = Object.keys(dateMap).map(key => ({
        date: key,
        matches: dateMap[key]
      }));

      return {
        round: round,
        roundNumber: this.extractRoundNumber(round),
        startDate: minDate,
        endDate: maxDate,
        matches: matches,
        dateGroups: dateGroups
      };
    });

    // Sort rounds by their number descending (most recent rounds first)
    this.allRounds.sort((a, b) => {
      const numA = this.extractRoundNumber(a.round);
      const numB = this.extractRoundNumber(b.round);
      return numB - numA;
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
  // Rounds are sorted descending (most recent first), so:
  //   - "future" rounds (upcoming) are at lower indices (top of list)
  //   - "past" rounds (older) are at higher indices (bottom of list)
  private applyRoundPagination(): void {
    if (this.allRounds.length === 0) {
      this.matchesByRound = [];
      this.hasMorePastRounds = false;
      this.hasMoreFutureRounds = false;
      return;
    }

    // Find the round closest to today's date
    // For each round, calculate the absolute distance from now to the round's date range
    const now = new Date().getTime();
    let closestIndex = 0;
    let closestDistance = Infinity;

    this.allRounds.forEach((round, index) => {
      // Use the midpoint between start and end date of the round
      const roundMid = (round.startDate.getTime() + round.endDate.getTime()) / 2;
      const distance = Math.abs(now - roundMid);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    this.currentRoundIndex = closestIndex;

    // Calculate visible range (rounds are descending)
    // Start at the current round, expand upward for future and downward for past
    const startIndex = Math.max(0, this.currentRoundIndex - this.visibleFutureRounds);
    const endIndex = Math.min(this.allRounds.length - 1, this.currentRoundIndex + this.visiblePastRounds);

    // Slice the visible rounds
    this.matchesByRound = this.allRounds.slice(startIndex, endIndex + 1);

    // Check if there are more rounds to load
    this.hasMoreFutureRounds = startIndex > 0;
    this.hasMorePastRounds = endIndex < this.allRounds.length - 1;
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
    this.visibleFutureRounds = 0;
  }

  extractRoundNumber(round: string): number {
    const match = round.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  formatMatchDate(dateStr: string): string {
    const d = new Date(dateStr);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
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
export interface DateGroup {
  date: string;
  matches: Match[];
}

export interface RoundGroup {
  round: string;
  roundNumber: number;
  startDate: Date;
  endDate: Date;
  matches: Match[];
  dateGroups: DateGroup[];
}
