import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { GroupService } from '../../services/group.service';
import { MatchService } from '../../services/match.service';
import { BetService } from '../../services/bet.service';
import { AuthService } from '../../services/auth.service';
import { Group, GroupMember } from '../../models/group.model';
import { Match } from '../../models/match.model';
import { MemberBet, Bet } from '../../models/bet.model';
import { TranslatePipe } from '../../services/translate.pipe';
import { getTeamByName, getAllTeams, Team } from '../../data/teams.data';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe],
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
            <div *ngFor="let member of leaderboard; let i = index" class="leaderboard-item">
              <span class="rank">{{ i + 1 }}</span>
              <span class="username">{{ member.user.username }}</span>
              <span class="points">{{ member.points }} {{ 'groups.points' | translate }}</span>
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
                  <span>{{ match.homeTeam }}</span>
                  <img *ngIf="getTeamLogo(match.homeTeam)" [src]="getTeamLogo(match.homeTeam)" [alt]="match.homeTeam" class="team-logo" (error)="onImageError($event)">
                </div>
                <span class="vs">{{ 'matches.vs' | translate }}</span>
                <div class="team team-away">
                  <img *ngIf="getTeamLogo(match.awayTeam)" [src]="getTeamLogo(match.awayTeam)" [alt]="match.awayTeam" class="team-logo" (error)="onImageError($event)">
                  <span>{{ match.awayTeam }}</span>
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
                  <span *ngIf="match.status === 'FINISHED'" class="result">
                    {{ match.result.homeScore }} - {{ match.result.awayScore }}
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
                        {{ memberBet.bet?.outcome === '1' ? match.homeTeam : (memberBet.bet?.outcome === '2' ? match.awayTeam : ('bets.draw' | translate)) }}
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
                    <label>{{ match.homeTeam }}</label>
                    <input
                      type="number"
                      [(ngModel)]="updateScoreData.homeScore"
                      class="score-input"
                      min="0">
                  </div>
                  <div class="score-form-group">
                    <label>{{ match.awayTeam }}</label>
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
  styles: [`
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
      animation: fadeIn 0.5s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
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
    .group-header {
      background: white;
      padding: 2rem;
      border-radius: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      margin-bottom: 2rem;
      border: 1px solid rgba(0, 0, 0, 0.04);
    }
    .group-header h1 {
      margin: 0 0 0.75rem 0;
      color: #1a1a2e;
      font-size: 1.75rem;
      font-weight: 700;
      font-family: 'Poppins', sans-serif;
    }
    .description {
      color: #64748b;
      margin: 0 0 1.25rem 0;
      line-height: 1.6;
    }
    .invite-info {
      display: flex;
      gap: 2rem;
      color: #64748b;
      flex-wrap: wrap;
    }
    .invite-code {
      color: #22c55e;
      font-weight: 700;
      font-size: 1.1rem;
      background: #f0fdf4;
      padding: 0.4rem 0.9rem;
      border-radius: 8px;
    }
    .content-grid {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 2rem;
    }
    @media (max-width: 968px) {
      .content-grid {
        grid-template-columns: 1fr;
      }
    }
    .leaderboard-section, .matches-section {
      background: white;
      padding: 1.75rem;
      border-radius: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border: 1px solid rgba(0, 0, 0, 0.04);
    }
    .matches-section {
      min-height: 400px;
    }
    h2 {
      margin: 0 0 1.25rem 0;
      color: #1a1a2e;
      font-size: 1.25rem;
      font-weight: 600;
      font-family: 'Poppins', sans-serif;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .loading, .empty-state {
      text-align: center;
      padding: 2.5rem;
      color: #64748b;
    }
    .leaderboard-item {
      display: flex;
      align-items: center;
      padding: 1rem;
      border-radius: 12px;
      margin-bottom: 0.5rem;
      transition: all 0.2s ease;
      background: #f8fafc;
    }
    .leaderboard-item:hover {
      background: #f1f5f9;
    }
    .leaderboard-item:first-child {
      background: linear-gradient(135deg, rgba(74, 222, 128, 0.15) 0%, rgba(34, 197, 94, 0.1) 100%);
    }
    .leaderboard-item:first-child .rank {
      color: #16a34a;
      font-size: 1.25rem;
    }
    .rank {
      font-weight: 700;
      color: #64748b;
      width: 35px;
      font-size: 1.1rem;
    }
    .username {
      flex: 1;
      color: #1a1a2e;
      font-weight: 500;
    }
    .points {
      font-weight: 700;
      color: #22c55e;
      background: #f0fdf4;
      padding: 0.35rem 0.75rem;
      border-radius: 8px;
      font-size: 0.9rem;
    }
    .matches-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .match-card {
      border: 2px solid #f1f5f9;
      border-radius: 16px;
      padding: 1.25rem;
      transition: all 0.3s ease;
      background: white;
    }
    .match-card:hover {
      border-color: #e2e8f0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .match-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .competition {
      font-size: 0.85rem;
      color: #64748b;
      font-weight: 500;
    }
    .status {
      font-size: 0.8rem;
      padding: 0.35rem 0.75rem;
      border-radius: 20px;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }
    .status.finished {
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
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
      color: #1a1a2e;
      font-size: 1rem;
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
      width: 28px;
      height: 28px;
      object-fit: contain;
      border-radius: 4px;
    }
    .vs {
      color: #94a3b8;
      padding: 0 1rem;
      font-weight: 400;
    }
    .match-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.75rem;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .match-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .date {
      font-size: 0.9rem;
      color: #64748b;
    }
    .btn-people {
      background: #f1f5f9;
      border: none;
      border-radius: 10px;
      padding: 0.5rem;
      cursor: pointer;
      color: #64748b;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .btn-people:hover {
      background: #e2e8f0;
      color: #475569;
    }
    .btn-people.active {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
    }
    .member-bets-panel {
      margin-top: 1rem;
      padding: 1rem;
      background: #f8fafc;
      border-radius: 12px;
      border: 2px solid #e2e8f0;
      animation: slideDown 0.2s ease-out;
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .member-bets-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    .member-bets-header h4 {
      margin: 0;
      color: #1a1a2e;
      font-size: 1rem;
      font-weight: 600;
    }
    .btn-close-bets {
      background: none;
      border: none;
      cursor: pointer;
      color: #64748b;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: all 0.2s ease;
    }
    .btn-close-bets:hover {
      background: #e2e8f0;
      color: #1a1a2e;
    }
    .loading-bets, .empty-bets {
      text-align: center;
      padding: 1rem;
      color: #64748b;
      font-size: 0.9rem;
    }
    .member-bets-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .member-bet-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.6rem 0.75rem;
      background: white;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .member-name {
      font-weight: 500;
      color: #1a1a2e;
      font-size: 0.9rem;
    }
    .bet-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .bet-outcome {
      font-weight: 600;
      font-size: 0.85rem;
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
    }
    .bet-outcome.home {
      background: #dbeafe;
      color: #1d4ed8;
    }
    .bet-outcome.draw {
      background: #f3f4f6;
      color: #4b5563;
    }
    .bet-outcome.away {
      background: #fee2e2;
      color: #dc2626;
    }
    .no-bet {
      color: #94a3b8;
      font-weight: 500;
    }
    .bet-time {
      font-size: 0.75rem;
      color: #94a3b8;
    }
    .btn-primary {
      padding: 0.6rem 1.25rem;
      background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
      color: white;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 600;
      text-decoration: none;
      display: inline-block;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(74, 222, 128, 0.3);
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(74, 222, 128, 0.4);
    }
    .btn-bet {
      padding: 0.6rem 1.25rem;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 600;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
    }
    .btn-bet:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }
    .result {
      font-weight: 700;
      color: #22c55e;
      font-size: 1.2rem;
      background: #f0fdf4;
      padding: 0.4rem 1rem;
      border-radius: 10px;
    }
    .button-group {
      display: flex;
      gap: 0.5rem;
    }
    .btn-manage {
      padding: 0.6rem 1.25rem;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 600;
      text-decoration: none;
      display: inline-block;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
    }
    .btn-manage:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
    }
    .past-match-label {
      color: #94a3b8;
      font-size: 0.9rem;
      font-style: italic;
    }
    .match-card.has-bet {
      border-color: #86efac;
      background: linear-gradient(135deg, rgba(74, 222, 128, 0.05) 0%, rgba(34, 197, 94, 0.02) 100%);
    }
    .status-badges {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .bet-badge {
      font-size: 0.75rem;
      padding: 0.3rem 0.6rem;
      border-radius: 20px;
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      color: white;
      font-weight: 600;
    }
    .btn-update-score {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 600;
      transition: all 0.3s ease;
    }
    .btn-update-score:hover {
      transform: translateY(-2px);
    }
    .score-update-form {
      margin-top: 1.25rem;
      padding-top: 1.25rem;
      border-top: 2px solid #f1f5f9;
    }
    .score-form-row {
      display: flex;
      gap: 1rem;
      margin-bottom: 0.75rem;
    }
    .score-form-group {
      flex: 1;
    }
    .score-form-group label {
      display: block;
      font-size: 0.85rem;
      color: #64748b;
      margin-bottom: 0.4rem;
      font-weight: 500;
    }
    .score-input {
      width: 100%;
      max-width: 80px;
      padding: 0.6rem;
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      font-size: 1rem;
      text-align: center;
      transition: all 0.3s ease;
    }
    .score-input:focus {
      border-color: #4ade80;
      box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.15);
      outline: none;
    }
    .score-button-row {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.75rem;
    }
    .btn-small {
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
    }
    .btn-secondary {
      background: #f1f5f9;
      color: #475569;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s ease;
    }
    .btn-secondary:hover {
      background: #e2e8f0;
    }
    .error-message {
      color: #ef4444;
      font-size: 0.85rem;
      margin-top: 0.75rem;
      padding: 0.6rem 0.9rem;
      background: #fee2e2;
      border-radius: 8px;
      border-left: 3px solid #ef4444;
    }
    .group-header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    .group-actions {
      display: flex;
      gap: 0.5rem;
    }
    .btn-edit-group {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      border: none;
      padding: 0.6rem 1.25rem;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 600;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
    }
    .btn-edit-group:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }
    .btn-delete-group {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
      border: none;
      padding: 0.6rem 1.25rem;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 600;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
    }
    .btn-delete-group:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
    }
    .btn-leave-group {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      border: none;
      padding: 0.6rem 1.25rem;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 600;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
    }
    .btn-leave-group:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
    }
    .edit-group-form {
      margin-top: 1.5rem;
      padding: 1.75rem;
      background: #f8fafc;
      border-radius: 16px;
      border: 2px solid #e2e8f0;
    }
    .edit-group-form h3 {
      margin: 0 0 1.25rem 0;
      color: #1a1a2e;
      font-size: 1.1rem;
      font-weight: 600;
    }
    .form-group {
      margin-bottom: 1.25rem;
    }
    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      color: #475569;
      font-weight: 600;
      font-size: 0.9rem;
    }
    .form-control {
      width: 100%;
      padding: 0.85rem 1rem;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      font-size: 1rem;
      box-sizing: border-box;
      transition: all 0.3s ease;
      background: white;
    }
    .form-control:focus {
      border-color: #4ade80;
      box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.15);
      outline: none;
    }
    .button-row {
      display: flex;
      gap: 0.75rem;
      margin-top: 0.75rem;
    }
    .delete-confirm, .leave-confirm {
      margin-top: 1.25rem;
      padding: 1.25rem;
      background: #fee2e2;
      border-radius: 12px;
      border-left: 4px solid #ef4444;
    }
    .leave-confirm {
      background: #fef3c7;
      border-left-color: #f59e0b;
    }
    .delete-confirm p, .leave-confirm p {
      margin: 0 0 0.75rem 0;
      color: #1a1a2e;
      font-weight: 500;
    }
    @media (max-width: 768px) {
      .container {
        padding: 1.25rem;
      }
      .group-header-top {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
      .group-actions {
        flex-wrap: wrap;
        width: 100%;
      }
      .group-actions button {
        flex: 1;
        min-width: 120px;
      }
    }
    /* Filter Dialog Styles */
    .header-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    .save-filter-checkbox {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 8px;
      background: #f1f5f9;
      border: 2px solid #e2e8f0;
      color: #64748b;
      transition: all 0.2s ease;
    }
    .save-filter-checkbox:hover {
      background: #e2e8f0;
      color: #475569;
    }
    .save-filter-checkbox:has(input:checked) {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(22, 163, 74, 0.1) 100%);
      border-color: #22c55e;
      color: #16a34a;
    }
    .save-filter-checkbox input {
      display: none;
    }
    .match-count {
      font-size: 0.9rem;
      color: #64748b;
      font-weight: 400;
    }
    .btn-filter {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 1rem;
      background: #f1f5f9;
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      color: #475569;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .btn-filter:hover {
      background: #e2e8f0;
      border-color: #cbd5e1;
    }
    .btn-filter.has-filters {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(29, 78, 216, 0.05) 100%);
      border-color: #3b82f6;
      color: #1d4ed8;
    }
    .filter-count {
      background: #3b82f6;
      color: white;
      font-size: 0.75rem;
      padding: 0.15rem 0.5rem;
      border-radius: 10px;
      font-weight: 700;
    }
    .filter-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease-out;
    }
    .filter-dialog {
      background: white;
      border-radius: 20px;
      width: 90%;
      max-width: 500px;
      max-height: 85vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
      animation: slideUp 0.3s ease-out;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .filter-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 2px solid #f1f5f9;
    }
    .filter-header h3 {
      margin: 0;
      color: #1a1a2e;
      font-size: 1.25rem;
      font-weight: 600;
    }
    .btn-close-filter {
      background: none;
      border: none;
      cursor: pointer;
      color: #64748b;
      padding: 0.25rem;
      border-radius: 8px;
      transition: all 0.2s ease;
    }
    .btn-close-filter:hover {
      background: #f1f5f9;
      color: #1a1a2e;
    }
    .filter-body {
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;
    }
    .filter-section {
      margin-bottom: 1.5rem;
    }
    .filter-section:last-child {
      margin-bottom: 0;
    }
    .filter-label {
      display: block;
      font-size: 0.9rem;
      font-weight: 600;
      color: #1a1a2e;
      margin-bottom: 0.75rem;
    }
    .checkbox-group {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .checkbox-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      padding: 0.5rem 0.75rem;
      background: #f8fafc;
      border-radius: 8px;
      border: 2px solid #e2e8f0;
      transition: all 0.2s ease;
    }
    .checkbox-item:hover {
      border-color: #cbd5e1;
    }
    .checkbox-item input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: #3b82f6;
    }
    .checkbox-item span {
      font-size: 0.9rem;
      color: #475569;
    }
    .date-range {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .date-range .form-control {
      flex: 1;
      padding: 0.6rem 0.75rem;
      font-size: 0.9rem;
    }
    .date-separator {
      color: #94a3b8;
      font-weight: 500;
    }
    .multi-select-dropdown {
      position: relative;
    }
    .selected-items {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      background: #f8fafc;
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .selected-items:hover {
      border-color: #cbd5e1;
    }
    .selected-items span {
      color: #64748b;
      font-size: 0.9rem;
    }
    .dropdown-options {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      margin-top: 0.5rem;
      max-height: 200px;
      overflow-y: auto;
      z-index: 10;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .team-dropdown {
      max-height: 250px;
    }
    .team-search {
      width: 100%;
      padding: 0.75rem 1rem;
      border: none;
      border-bottom: 2px solid #f1f5f9;
      font-size: 0.9rem;
      outline: none;
    }
    .dropdown-option {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      cursor: pointer;
      transition: background 0.2s ease;
    }
    .dropdown-option:hover {
      background: #f8fafc;
    }
    .dropdown-option input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: #3b82f6;
    }
    .dropdown-option span {
      font-size: 0.9rem;
      color: #1a1a2e;
    }
    .team-option-logo {
      width: 24px;
      height: 24px;
      object-fit: contain;
      border-radius: 4px;
    }
    .score-filter {
      display: flex;
      align-items: flex-end;
      gap: 0.75rem;
    }
    .score-input-group {
      flex: 1;
    }
    .score-input-group label {
      display: block;
      font-size: 0.8rem;
      color: #64748b;
      margin-bottom: 0.4rem;
    }
    .score-filter .score-input {
      width: 100%;
      max-width: none;
      padding: 0.6rem;
      text-align: center;
    }
    .score-separator {
      color: #94a3b8;
      font-weight: 600;
      font-size: 1.25rem;
      padding-bottom: 0.5rem;
    }
    .filter-footer {
      display: flex;
      gap: 0.75rem;
      padding: 1.25rem 1.5rem;
      border-top: 2px solid #f1f5f9;
      background: #f8fafc;
    }
    .filter-footer .btn-secondary {
      flex: 1;
    }
    .filter-footer .btn-primary {
      flex: 1;
    }
    @media (max-width: 640px) {
      .header-actions {
        flex-wrap: wrap;
      }
      .filter-dialog {
        width: 95%;
        max-height: 90vh;
      }
      .checkbox-group {
        flex-direction: column;
      }
      .date-range {
        flex-direction: column;
      }
      .date-separator {
        display: none;
      }
      .score-filter {
        flex-direction: column;
      }
      .score-separator {
        display: none;
      }
    }
  `]
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
    public authService: AuthService
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
}
