import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { GroupService } from '../../services/group.service';
import { MatchService } from '../../services/match.service';
import { BetService } from '../../services/bet.service';
import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';
import { Group, GroupMember } from '../../models/group.model';
import { Match } from '../../models/match.model';
import { MemberBet, Bet } from '../../models/bet.model';
import { TranslatePipe } from '../../services/translate.pipe';
import { TeamTranslatePipe } from '../../pipes/team-translate.pipe';
import { getTeamByName, getAllTeams, Team } from '../../data/teams.data';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe, TeamTranslatePipe],
  template: `
    <div class="container" *ngIf="group">
      <button class="back-btn" routerLink="/groups">← {{ 'groups.backToGroups' | translate }}</button>

      <div class="group-header">
        <div class="group-header-top">
          <h1>{{ group.name }}</h1>
          <div class="group-actions">
            <button *ngIf="canManageGroup()" (click)="openEditGroup()" class="btn-edit-group">
              {{ 'common.edit' | translate }}
            </button>
            <button *ngIf="canManageGroup()" (click)="confirmDeleteGroup()" class="btn-delete-group">
              {{ 'common.delete' | translate }}
            </button>
            <button *ngIf="!isGroupCreator() && !authService.isAdmin()" (click)="confirmLeaveGroup()" class="btn-leave-group">
              {{ 'groups.leaveGroup' | translate }}
            </button>
          </div>
        </div>
        <p class="description">{{ group.description || ('groups.noDescription' | translate) }}</p>
        <div class="invite-info">
          <span>{{ 'groups.inviteCode' | translate }}: <strong class="invite-code">{{ group.inviteCode }}</strong></span>
          <span class="member-count">{{ group.members.length }} {{ 'groups.members' | translate }}</span>
        </div>

        <!-- Edit Group Form -->
        <div *ngIf="editingGroup" class="edit-group-form">
          <h3>{{ 'groups.editGroup' | translate }}</h3>
          <div class="form-group">
            <label>{{ 'groups.groupName' | translate }}</label>
            <input type="text" [(ngModel)]="editGroupData.name" class="form-control">
          </div>
          <div class="form-group">
            <label>{{ 'groups.description' | translate }}</label>
            <textarea [(ngModel)]="editGroupData.description" class="form-control" rows="3"></textarea>
          </div>
          <div class="button-row">
            <button (click)="submitEditGroup()" [disabled]="loadingEditGroup" class="btn-primary btn-small">
              {{ loadingEditGroup ? ('auth.loading' | translate) : ('common.save' | translate) }}
            </button>
            <button (click)="cancelEditGroup()" class="btn-secondary btn-small">
              {{ 'groups.cancel' | translate }}
            </button>
          </div>
          <div *ngIf="editGroupError" class="error-message">{{ editGroupError }}</div>
        </div>

        <!-- Delete Group Confirmation -->
        <div *ngIf="deletingGroup" class="delete-confirm">
          <p>{{ 'groups.confirmDelete' | translate }}</p>
          <div class="button-row">
            <button (click)="deleteGroup()" [disabled]="loadingDeleteGroup" class="btn-delete-group btn-small">
              {{ loadingDeleteGroup ? ('auth.loading' | translate) : ('common.delete' | translate) }}
            </button>
            <button (click)="cancelDeleteGroup()" class="btn-secondary btn-small">
              {{ 'groups.cancel' | translate }}
            </button>
          </div>
        </div>

        <!-- Leave Group Confirmation -->
        <div *ngIf="leavingGroup" class="leave-confirm">
          <p>{{ 'groups.confirmLeave' | translate }}</p>
          <div class="button-row">
            <button (click)="leaveGroup()" [disabled]="loadingLeaveGroup" class="btn-leave-group btn-small">
              {{ loadingLeaveGroup ? ('auth.loading' | translate) : ('groups.leaveGroup' | translate) }}
            </button>
            <button (click)="cancelLeaveGroup()" class="btn-secondary btn-small">
              {{ 'groups.cancel' | translate }}
            </button>
          </div>
        </div>
      </div>

      <div class="content-grid">
        <div class="leaderboard-section">
          <h2>{{ 'groups.leaderboard' | translate }}</h2>
          <div *ngIf="loadingLeaderboard" class="loading">{{ 'auth.loading' | translate }}</div>
          <div *ngIf="!loadingLeaderboard && leaderboard.length > 0" class="leaderboard">
            <div *ngFor="let member of leaderboard; let i = index" class="leaderboard-item"
                 [class.winner]="isWinner(member)"
                 [class.eliminated]="isEliminated(member)">
              <span class="rank">{{ i + 1 }}</span>
              <span class="username">
                {{ member.user.username }}
                <span *ngIf="isWinner(member)" class="trophy">🏆</span>
                <span *ngIf="isEliminated(member)" class="status-label">({{ 'groups.eliminated' | translate }})</span>
              </span>
              <span class="points">
                {{ member.points }} {{ group.betType === 'relative' ? ('groups.credits' | translate) : ('groups.points' | translate) }}
              </span>
            </div>
          </div>
          <div *ngIf="!loadingLeaderboard && leaderboard.length === 0" class="empty-state">
            {{ 'groups.noMembers' | translate }}
          </div>
        </div>

        <div class="matches-section">
          <div class="section-header">
            <h2>{{ 'groups.matches' | translate }} <span class="match-count">({{ filteredMatches.length }})</span></h2>
            <div class="header-actions">
              <label class="save-filter-checkbox" [title]="'filters.saveFiltersTooltip' | translate">
                <input type="checkbox" [(ngModel)]="saveFiltersEnabled" (change)="onSaveFiltersToggle()">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
              </label>
              <button (click)="openFilterDialog()" class="btn-filter" [class.has-filters]="hasActiveFilters()">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                {{ 'filters.filter' | translate }}
                <span *ngIf="hasActiveFilters()" class="filter-count">{{ getActiveFilterCount() }}</span>
              </button>
              <button
                *ngIf="canManageGroup()"
                [routerLink]="['/matches/manage']"
                [queryParams]="{groupId: groupId}"
                class="btn-manage"
              >
                {{ 'matches.manageMatches' | translate }}
              </button>
            </div>
          </div>

          <!-- Filter Dialog Overlay -->
          <div *ngIf="showFilterDialog" class="filter-overlay" (click)="closeFilterDialog()">
            <div class="filter-dialog" (click)="$event.stopPropagation()">
              <div class="filter-header">
                <h3>{{ 'filters.filterMatches' | translate }}</h3>
                <button (click)="closeFilterDialog()" class="btn-close-filter">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <div class="filter-body">
                <!-- Status Filter -->
                <div class="filter-section">
                  <label class="filter-label">{{ 'filters.matchStatus' | translate }}</label>
                  <div class="checkbox-group">
                    <label class="checkbox-item">
                      <input type="checkbox" [(ngModel)]="filters.showFinished">
                      <span>{{ 'filters.finished' | translate }}</span>
                    </label>
                    <label class="checkbox-item">
                      <input type="checkbox" [(ngModel)]="filters.showNotStarted">
                      <span>{{ 'filters.notStarted' | translate }}</span>
                    </label>
                    <label class="checkbox-item">
                      <input type="checkbox" [(ngModel)]="filters.showOngoing">
                      <span>{{ 'filters.ongoing' | translate }}</span>
                    </label>
                  </div>
                </div>

                <!-- Date Range Filter -->
                <div class="filter-section">
                  <label class="filter-label">{{ 'filters.dateRange' | translate }}</label>
                  <div class="date-range">
                    <input type="date" [(ngModel)]="filters.dateFrom" class="form-control">
                    <span class="date-separator">-</span>
                    <input type="date" [(ngModel)]="filters.dateTo" class="form-control">
                  </div>
                </div>

                <!-- Members Who Betted Filter -->
                <div class="filter-section">
                  <label class="filter-label">{{ 'filters.membersBetted' | translate }}</label>
                  <div class="multi-select-dropdown">
                    <div class="selected-items" (click)="toggleMemberDropdown()">
                      <span *ngIf="filters.selectedMembers.length === 0">{{ 'filters.selectMembers' | translate }}</span>
                      <span *ngIf="filters.selectedMembers.length > 0">{{ filters.selectedMembers.length }} {{ 'filters.selected' | translate }}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                    <div *ngIf="showMemberDropdown" class="dropdown-options">
                      <label *ngFor="let member of leaderboard" class="dropdown-option">
                        <input type="checkbox" [checked]="isMemberSelected(member.user._id)" (change)="toggleMemberSelection(member.user._id)">
                        <span>{{ member.user.username }}</span>
                      </label>
                    </div>
                  </div>
                </div>

                <!-- Teams Filter -->
                <div class="filter-section">
                  <label class="filter-label">{{ 'filters.teams' | translate }}</label>
                  <div class="multi-select-dropdown">
                    <div class="selected-items" (click)="toggleTeamDropdown()">
                      <span *ngIf="filters.selectedTeams.length === 0">{{ 'filters.selectTeams' | translate }}</span>
                      <span *ngIf="filters.selectedTeams.length > 0">{{ filters.selectedTeams.length }} {{ 'filters.selected' | translate }}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                    <div *ngIf="showTeamDropdown" class="dropdown-options team-dropdown">
                      <input type="text" [(ngModel)]="teamSearchQuery" class="team-search" [placeholder]="'filters.searchTeams' | translate">
                      <label *ngFor="let team of getFilteredTeams()" class="dropdown-option">
                        <input type="checkbox" [checked]="isTeamSelected(team.name)" (change)="toggleTeamSelection(team.name)">
                        <img *ngIf="team.logo" [src]="team.logo" class="team-option-logo" (error)="onImageError($event)">
                        <span>{{ team.name }}</span>
                      </label>
                    </div>
                  </div>
                </div>

                <!-- Score Filter (for finished matches) -->
                <div class="filter-section">
                  <label class="filter-label">{{ 'filters.score' | translate }}</label>
                  <div class="score-filter">
                    <div class="score-input-group">
                      <label>{{ 'filters.homeScore' | translate }}</label>
                      <input type="number" [(ngModel)]="filters.homeScore" min="0" class="form-control score-input" [placeholder]="'filters.any' | translate">
                    </div>
                    <span class="score-separator">-</span>
                    <div class="score-input-group">
                      <label>{{ 'filters.awayScore' | translate }}</label>
                      <input type="number" [(ngModel)]="filters.awayScore" min="0" class="form-control score-input" [placeholder]="'filters.any' | translate">
                    </div>
                  </div>
                </div>
              </div>

              <div class="filter-footer">
                <button (click)="clearFilters()" class="btn-secondary">{{ 'filters.clearAll' | translate }}</button>
                <button (click)="applyFilters()" class="btn-primary">{{ 'filters.apply' | translate }}</button>
              </div>
            </div>
          </div>
          <div *ngIf="loadingMatches" class="loading">{{ 'auth.loading' | translate }}</div>
          <div *ngIf="!loadingMatches && filteredMatches.length > 0" class="matches-list">
            <div *ngFor="let match of filteredMatches" class="match-card" [class.has-bet]="hasBetOnMatch(match._id)">
              <div class="match-header">
                <span class="competition">{{ match.competition }}</span>
                <div class="status-badges">
                  <span *ngIf="hasBetOnMatch(match._id)" class="bet-badge">✓ {{ 'bets.betPlaced' | translate }}</span>
                  <span class="status" [class.finished]="match.status === 'FINISHED'">
                    {{ 'matches.' + match.status.toLowerCase() | translate }}
                  </span>
                </div>
              </div>
              <div class="match-teams">
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
              <div class="match-footer">
                <span class="date">{{ match.matchDate | date:'dd/MM/yy, HH:mm' }}</span>
                <div class="match-actions">
                  <button
                    (click)="toggleMemberBets(match._id)"
                    class="btn-people"
                    [class.active]="viewingBetsForMatch === match._id"
                    [title]="'bets.viewGroupBets' | translate">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </button>
                  <button
                    [routerLink]="['/bets', 'place']"
                    [queryParams]="{matchId: match._id, groupId: groupId}"
                    class="btn-bet"
                    *ngIf="match.status === 'SCHEDULED' && !isMatchInPast(match.matchDate)"
                  >
                    {{ hasBetOnMatch(match._id) ? ('bets.editBet' | translate) : ('matches.placeBet' | translate) }}
                  </button>
                  <span *ngIf="isMatchInPast(match.matchDate) && match.status === 'SCHEDULED' && !canManageGroup()" class="past-match-label">
                    {{ 'matches.matchStartedLabel' | translate }}
                  </span>
                  <button
                    *ngIf="canManageGroup() && canUpdateScore(match)"
                    (click)="openScoreUpdate(match)"
                    class="btn-update-score">
                    {{ 'matches.updateScore' | translate }}
                  </button>
                  <button
                    *ngIf="canManageGroup() && match.status === 'SCHEDULED' && match.result && match.result.homeScore !== null"
                    (click)="markAsFinished(match._id)"
                    class="btn-mark-finished">
                    {{ 'matches.markAsFinished' | translate }}
                  </button>
                  <span *ngIf="match.status === 'FINISHED'" class="result">
                    {{ match.result.homeScore }} - {{ match.result.awayScore }}
                  </span>
                  <span *ngIf="match.status === 'SCHEDULED' && match.result && match.result.homeScore !== null" class="result ongoing">
                    {{ 'matches.ongoingScore' | translate }}: {{ match.result.homeScore }} - {{ match.result.awayScore }}
                  </span>
                </div>
              </div>
              <!-- Member Bets Panel -->
              <div *ngIf="viewingBetsForMatch === match._id" class="member-bets-panel">
                <div class="member-bets-header">
                  <h4>{{ 'bets.memberBets' | translate }}</h4>
                  <button (click)="closeMemberBets()" class="btn-close-bets">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
                <div *ngIf="loadingMemberBets" class="loading-bets">{{ 'auth.loading' | translate }}</div>
                <div *ngIf="!loadingMemberBets && memberBets.length > 0" class="member-bets-list">
                  <div *ngFor="let memberBet of memberBets" class="member-bet-item">
                    <span class="member-name">{{ memberBet.user.username }}</span>
                    <div class="bet-info">
                      <span *ngIf="memberBet.hasBet" class="bet-outcome" [class.home]="memberBet.bet?.outcome === '1'" [class.draw]="memberBet.bet?.outcome === 'X'" [class.away]="memberBet.bet?.outcome === '2'">
                        {{ memberBet.bet?.outcome === '1' ? (match.homeTeam | teamTranslate) : (memberBet.bet?.outcome === '2' ? (match.awayTeam | teamTranslate) : ('bets.draw' | translate)) }}
                      </span>
                      <span *ngIf="!memberBet.hasBet" class="no-bet">{{ 'bets.noBet' | translate }}</span>
                      <span *ngIf="memberBet.hasBet" class="bet-time">{{ memberBet.bet?.createdAt | date:'dd/MM/yy, HH:mm' }}</span>
                    </div>
                  </div>
                </div>
                <div *ngIf="!loadingMemberBets && memberBets.length === 0" class="empty-bets">
                  {{ 'groups.noMembers' | translate }}
                </div>
              </div>
              <!-- Score update form -->
              <div *ngIf="editingMatchId === match._id" class="score-update-form">
                <div class="score-form-row">
                  <div class="score-form-group">
                    <label>{{ match.homeTeam | teamTranslate }}</label>
                    <input
                      type="number"
                      [(ngModel)]="updateScoreData.homeScore"
                      class="score-input"
                      min="0">
                  </div>
                  <div class="score-form-group">
                    <label>{{ match.awayTeam | teamTranslate }}</label>
                    <input
                      type="number"
                      [(ngModel)]="updateScoreData.awayScore"
                      class="score-input"
                      min="0">
                  </div>
                </div>
                <div class="score-button-row">
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
                <div *ngIf="scoreUpdateError" class="error-message">{{ scoreUpdateError }}</div>
              </div>
            </div>
          </div>
          <div *ngIf="!loadingMatches && filteredMatches.length === 0" class="empty-state">
            {{ hasActiveFilters() ? ('filters.noMatchesFound' | translate) : ('groups.noMatches' | translate) }}
          </div>
        </div>
      </div>
    </div>
  `,
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

  // Member bets viewer
  viewingBetsForMatch: string | null = null;
  memberBets: MemberBet[] = [];
  loadingMemberBets = false;

  // Filter state
  showFilterDialog = false;
  showMemberDropdown = false;
  showTeamDropdown = false;
  teamSearchQuery = '';
  allTeams: Team[] = getAllTeams();
  saveFiltersEnabled = false;
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
  }

  loadGroupDetails(): void {
    this.groupService.getGroupById(this.groupId).subscribe({
      next: (response) => {
        this.group = response.data;
      },
      error: (error) => {
        console.error('Failed to load group:', error);
        this.router.navigate(['/groups']);
      }
    });
  }

  loadLeaderboard(): void {
    this.groupService.getLeaderboard(this.groupId).subscribe({
      next: (response) => {
        this.leaderboard = response.data;
        this.loadingLeaderboard = false;
      },
      error: (error) => {
        console.error('Failed to load leaderboard:', error);
        this.loadingLeaderboard = false;
      }
    });
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
        this.router.navigate(['/groups']);
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
        this.router.navigate(['/groups']);
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

  // Filter methods
  openFilterDialog(): void {
    this.showFilterDialog = true;
    this.showMemberDropdown = false;
    this.showTeamDropdown = false;
  }

  closeFilterDialog(): void {
    this.showFilterDialog = false;
    this.showMemberDropdown = false;
    this.showTeamDropdown = false;
  }

  toggleMemberDropdown(): void {
    this.showMemberDropdown = !this.showMemberDropdown;
    this.showTeamDropdown = false;
  }

  toggleTeamDropdown(): void {
    this.showTeamDropdown = !this.showTeamDropdown;
    this.showMemberDropdown = false;
  }

  isMemberSelected(memberId: string): boolean {
    return this.filters.selectedMembers.includes(memberId);
  }

  toggleMemberSelection(memberId: string): void {
    const index = this.filters.selectedMembers.indexOf(memberId);
    if (index === -1) {
      this.filters.selectedMembers.push(memberId);
    } else {
      this.filters.selectedMembers.splice(index, 1);
    }
  }

  isTeamSelected(teamName: string): boolean {
    return this.filters.selectedTeams.includes(teamName);
  }

  toggleTeamSelection(teamName: string): void {
    const index = this.filters.selectedTeams.indexOf(teamName);
    if (index === -1) {
      this.filters.selectedTeams.push(teamName);
    } else {
      this.filters.selectedTeams.splice(index, 1);
    }
  }

  getFilteredTeams(): Team[] {
    if (!this.teamSearchQuery) {
      return this.allTeams;
    }
    const query = this.teamSearchQuery.toLowerCase();
    return this.allTeams.filter(team => team.name.toLowerCase().includes(query));
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
    this.teamSearchQuery = '';
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
    // Eliminated: has 0 credits in relative betting groups
    if (this.group?.betType !== 'relative') return false;
    return member.points <= 0;
  }
}
