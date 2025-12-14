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
import { TranslatePipe } from '../../services/translate.pipe';

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
            <button *ngIf="isGroupCreator()" (click)="openEditGroup()" class="btn-edit-group">
              {{ 'common.edit' | translate }}
            </button>
            <button *ngIf="isGroupCreator()" (click)="confirmDeleteGroup()" class="btn-delete-group">
              {{ 'common.delete' | translate }}
            </button>
            <button *ngIf="!isGroupCreator()" (click)="confirmLeaveGroup()" class="btn-leave-group">
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
            <h2>{{ 'groups.matches' | translate }}</h2>
            <button
              *ngIf="isGroupCreator()"
              [routerLink]="['/matches/manage']"
              [queryParams]="{groupId: groupId}"
              class="btn-manage"
            >
              {{ 'matches.manageMatches' | translate }}
            </button>
          </div>
          <div *ngIf="loadingMatches" class="loading">{{ 'auth.loading' | translate }}</div>
          <div *ngIf="!loadingMatches && matches.length > 0" class="matches-list">
            <div *ngFor="let match of matches" class="match-card" [class.has-bet]="hasBetOnMatch(match._id)">
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
                <span class="team">{{ match.homeTeam }}</span>
                <span class="vs">{{ 'matches.vs' | translate }}</span>
                <span class="team">{{ match.awayTeam }}</span>
              </div>
              <div class="match-footer">
                <span class="date">{{ match.matchDate | date:'short' }}</span>
                <button
                  [routerLink]="['/bets', 'place']"
                  [queryParams]="{matchId: match._id, groupId: groupId}"
                  class="btn-bet"
                  *ngIf="match.status === 'SCHEDULED' && !isMatchInPast(match.matchDate)"
                >
                  {{ hasBetOnMatch(match._id) ? ('bets.editBet' | translate) : ('matches.placeBet' | translate) }}
                </button>
                <span *ngIf="isMatchInPast(match.matchDate) && match.status === 'SCHEDULED' && !isGroupCreator()" class="past-match-label">
                  {{ 'matches.matchStartedLabel' | translate }}
                </span>
                <button
                  *ngIf="isGroupCreator() && canUpdateScore(match)"
                  (click)="openScoreUpdate(match)"
                  class="btn-update-score">
                  {{ 'matches.updateScore' | translate }}
                </button>
                <span *ngIf="match.status === 'FINISHED'" class="result">
                  {{ match.result.homeScore }} - {{ match.result.awayScore }}
                </span>
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
          <div *ngIf="!loadingMatches && matches.length === 0" class="empty-state">
            {{ 'groups.noMatches' | translate }}
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
    .date {
      font-size: 0.9rem;
      color: #64748b;
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
  `]
})
export class GroupDetailComponent implements OnInit {
  groupId: string = '';
  group: Group | null = null;
  leaderboard: GroupMember[] = [];
  matches: Match[] = [];
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private groupService: GroupService,
    private matchService: MatchService,
    private betService: BetService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.groupId = this.route.snapshot.params['id'];
    this.loadGroupDetails();
    this.loadLeaderboard();
    this.loadMatches();
    this.loadMyBets();
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

        this.matches = sorted.slice(0, 10);
        this.loadingMatches = false;
      },
      error: (error) => {
        console.error('Failed to load matches:', error);
        this.loadingMatches = false;
      }
    });
  }

  isGroupCreator(): boolean {
    const currentUser = this.authService.getCurrentUser();
    return this.group?.creator?._id === currentUser?.id || this.group?.creator === currentUser?.id;
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
}
