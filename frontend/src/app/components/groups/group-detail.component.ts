import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { GroupService } from '../../services/group.service';
import { MatchService } from '../../services/match.service';
import { AuthService } from '../../services/auth.service';
import { Group, GroupMember } from '../../models/group.model';
import { Match } from '../../models/match.model';
import { TranslatePipe } from '../../services/translate.pipe';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  template: `
    <div class="container" *ngIf="group">
      <button class="back-btn" routerLink="/groups">← {{ 'groups.backToGroups' | translate }}</button>

      <div class="group-header">
        <h1>{{ group.name }}</h1>
        <p class="description">{{ group.description || ('groups.noDescription' | translate) }}</p>
        <div class="invite-info">
          <span>{{ 'groups.inviteCode' | translate }}: <strong class="invite-code">{{ group.inviteCode }}</strong></span>
          <span class="member-count">{{ group.members.length }} {{ 'groups.members' | translate }}</span>
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
            <div *ngFor="let match of matches" class="match-card">
              <div class="match-header">
                <span class="competition">{{ match.competition }}</span>
                <span class="status" [class.finished]="match.status === 'FINISHED'">
                  {{ 'matches.' + match.status.toLowerCase() | translate }}
                </span>
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
                  {{ 'matches.placeBet' | translate }}
                </button>
                <span *ngIf="isMatchInPast(match.matchDate) && match.status === 'SCHEDULED'" class="past-match-label">
                  {{ 'matches.matchStartedLabel' | translate }}
                </span>
                <span *ngIf="match.status === 'FINISHED'" class="result">
                  {{ match.result.homeScore }} - {{ match.result.awayScore }}
                </span>
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
      max-width: 1200px;
      margin: 0 auto;
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
    .group-header {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 2rem;
    }
    .group-header h1 {
      margin: 0 0 0.5rem 0;
      color: #333;
    }
    .description {
      color: #666;
      margin: 0 0 1rem 0;
    }
    .invite-info {
      display: flex;
      gap: 2rem;
      color: #666;
    }
    .invite-code {
      color: #4CAF50;
      font-weight: 600;
      font-size: 1.1rem;
    }
    .content-grid {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 2rem;
    }
    @media (max-width: 768px) {
      .content-grid {
        grid-template-columns: 1fr;
      }
    }
    .leaderboard-section, .matches-section {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .matches-section {
      min-height: 400px;
    }
    h2 {
      margin: 0 0 1rem 0;
      color: #333;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .loading, .empty-state {
      text-align: center;
      padding: 2rem;
      color: #666;
    }
    .leaderboard-item {
      display: flex;
      align-items: center;
      padding: 0.75rem;
      border-bottom: 1px solid #f0f0f0;
    }
    .leaderboard-item:last-child {
      border-bottom: none;
    }
    .rank {
      font-weight: 600;
      color: #4CAF50;
      width: 30px;
    }
    .username {
      flex: 1;
      color: #333;
    }
    .points {
      font-weight: 600;
      color: #666;
    }
    .matches-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .match-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1rem;
    }
    .match-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }
    .competition {
      font-size: 0.9rem;
      color: #666;
    }
    .status {
      font-size: 0.85rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      background-color: #FFC107;
      color: white;
      font-weight: 500;
    }
    .status.finished {
      background-color: #4CAF50;
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
      color: #333;
    }
    .vs {
      color: #999;
      padding: 0 1rem;
    }
    .match-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.5rem;
    }
    .date {
      font-size: 0.9rem;
      color: #666;
    }
    .btn-primary {
      padding: 0.5rem 1rem;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
      text-decoration: none;
      display: inline-block;
    }
    .btn-primary:hover {
      background-color: #45a049;
    }
    .btn-bet {
      padding: 0.5rem 1rem;
      background-color: #2196F3;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .btn-bet:hover {
      background-color: #0b7dda;
    }
    .result {
      font-weight: 600;
      color: #4CAF50;
      font-size: 1.1rem;
    }
    .button-group {
      display: flex;
      gap: 0.5rem;
    }
    .btn-manage {
      padding: 0.5rem 1rem;
      background-color: #FF9800;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
      text-decoration: none;
      display: inline-block;
    }
    .btn-manage:hover {
      background-color: #F57C00;
    }
    .past-match-label {
      color: #999;
      font-size: 0.9rem;
      font-style: italic;
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private groupService: GroupService,
    private matchService: MatchService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.groupId = this.route.snapshot.params['id'];
    this.loadGroupDetails();
    this.loadLeaderboard();
    this.loadMatches();
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
        this.matches = response.data.slice(0, 5);
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
}
