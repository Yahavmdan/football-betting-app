import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatchService } from '../../services/match.service';
import { GroupService } from '../../services/group.service';
import { AuthService } from '../../services/auth.service';
import { Match } from '../../models/match.model';
import { Group } from '../../models/group.model';
import { TranslatePipe } from '../../services/translate.pipe';

@Component({
  selector: 'app-manage-matches',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="container">
      <div class="header">
        <h1>Manage Matches - {{ group?.name }}</h1>
        <button (click)="goBack()" class="btn-secondary">{{ 'bets.back' | translate }}</button>
      </div>

      <div class="section">
        <h2>Israeli Premier League (Ligat Ha'al)</h2>
        <div class="fetch-section">
          <p class="league-info">Fetch matches from the past up to 2 weeks in the future</p>
          <div class="button-row">
            <button (click)="fetchMatches()" [disabled]="loadingFetch || !isGroupCreator()" class="btn-primary">
              {{ loadingFetch ? 'Fetching...' : 'Fetch Israeli League Matches' }}
            </button>
            <button (click)="updateResults()" [disabled]="loadingUpdate || !isGroupCreator()" class="btn-secondary">
              {{ loadingUpdate ? 'Updating...' : 'Update Match Results' }}
            </button>
          </div>
          <div *ngIf="!isGroupCreator()" class="warning-message" style="margin-top: 1rem;">
            Only the group creator can fetch matches and update results.
          </div>
        </div>
        <div *ngIf="fetchMessage" class="info-message">{{ fetchMessage }}</div>
      </div>

      <div class="section">
        <h2>Available Matches (Not in Group)</h2>
        <div *ngIf="loadingMatches" class="loading">{{ 'auth.loading' | translate }}</div>
        <div *ngIf="!loadingMatches && availableMatches.length === 0" class="empty-state">
          No matches available. Fetch matches from a league first.
        </div>
        <div class="matches-grid">
          <div *ngFor="let match of availableMatches" class="match-card">
            <div class="match-header">
              <span class="competition">{{ match.competition }}</span>
              <span class="status">{{ match.status }}</span>
            </div>
            <div class="match-teams">
              <span class="team">{{ match.homeTeam }}</span>
              <span class="vs">{{ 'matches.vs' | translate }}</span>
              <span class="team">{{ match.awayTeam }}</span>
            </div>
            <div class="match-footer">
              <span class="date">{{ match.matchDate | date:'short' }}</span>
              <button *ngIf="isGroupCreator()" (click)="addToGroup(match._id)" class="btn-add">Add to Group</button>
              <span *ngIf="!isGroupCreator()" class="restricted-label">Creator only</span>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Matches in This Group</h2>
        <div *ngIf="loadingGroupMatches" class="loading">{{ 'auth.loading' | translate }}</div>
        <div *ngIf="!loadingGroupMatches && groupMatches.length === 0" class="empty-state">
          No matches in this group yet.
        </div>
        <div class="matches-grid">
          <div *ngFor="let match of groupMatches" class="match-card active">
            <div class="match-header">
              <span class="competition">{{ match.competition }}</span>
              <span class="status" [class.finished]="match.status === 'FINISHED'">
                {{ match.status }}
              </span>
            </div>
            <div class="match-teams">
              <span class="team">{{ match.homeTeam }}</span>
              <span class="vs">{{ 'matches.vs' | translate }}</span>
              <span class="team">{{ match.awayTeam }}</span>
            </div>
            <div class="match-footer">
              <span class="date">{{ match.matchDate | date:'short' }}</span>
              <span *ngIf="match.status === 'FINISHED'" class="result">
                {{ match.result.homeScore }} - {{ match.result.awayScore }}
              </span>
            </div>
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
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    h1 {
      color: #333;
      margin: 0;
    }
    h2 {
      color: #333;
      margin-bottom: 1rem;
    }
    .section {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 2rem;
    }
    .fetch-section {
      margin-bottom: 1rem;
    }
    .league-info {
      color: #666;
      margin-bottom: 1rem;
      font-style: italic;
    }
    .button-row {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .form-group {
      flex: 1;
      max-width: 400px;
    }
    label {
      display: block;
      margin-bottom: 0.5rem;
      color: #555;
      font-weight: 500;
    }
    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
    }
    .btn-primary, .btn-secondary, .btn-add {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
    }
    .btn-primary {
      background-color: #4CAF50;
      color: white;
    }
    .btn-primary:hover:not(:disabled) {
      background-color: #45a049;
    }
    .btn-primary:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
    .btn-secondary {
      background-color: #2196F3;
      color: white;
    }
    .btn-secondary:hover:not(:disabled) {
      background-color: #0b7dda;
    }
    .btn-add {
      background-color: #FF9800;
      color: white;
      font-size: 0.9rem;
      padding: 0.5rem 1rem;
    }
    .btn-add:hover {
      background-color: #F57C00;
    }
    .info-message {
      padding: 1rem;
      background-color: #e3f2fd;
      border-radius: 4px;
      color: #1976D2;
    }
    .loading, .empty-state {
      text-align: center;
      padding: 2rem;
      color: #666;
    }
    .matches-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }
    .match-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1rem;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .match-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    .match-card.active {
      border-color: #4CAF50;
      background-color: #f1f8e9;
    }
    .match-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }
    .competition {
      font-size: 0.9rem;
      color: #666;
      font-weight: 500;
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
    .result {
      font-weight: 600;
      color: #4CAF50;
      font-size: 1.1rem;
    }
    .restricted-label {
      color: #999;
      font-size: 0.9rem;
      font-style: italic;
    }
    .warning-message {
      color: #ff9800;
      padding: 0.75rem;
      background-color: #fff3e0;
      border-radius: 4px;
      border-left: 4px solid #ff9800;
    }
  `]
})
export class ManageMatchesComponent implements OnInit {
  groupId: string = '';
  group: Group | null = null;
  availableMatches: Match[] = [];
  groupMatches: Match[] = [];
  loadingMatches = false;
  loadingGroupMatches = false;
  loadingFetch = false;
  loadingUpdate = false;
  fetchMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private matchService: MatchService,
    private groupService: GroupService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.groupId = this.route.snapshot.queryParams['groupId'];
    if (!this.groupId) {
      this.router.navigate(['/groups']);
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
    this.loadingMatches = true;
    this.loadingGroupMatches = true;

    this.matchService.getMatches().subscribe({
      next: (response) => {
        const allMatches = response.data;
        this.availableMatches = allMatches.filter(m => !m.groups.includes(this.groupId));
        this.loadingMatches = false;
      },
      error: (error) => {
        console.error('Failed to load matches:', error);
        this.loadingMatches = false;
      }
    });

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

  fetchMatches(): void {
    this.loadingFetch = true;
    this.fetchMessage = '';

    // Israeli league is the only league available (ID: 4644)
    this.matchService.fetchAndSaveMatches('4644').subscribe({
      next: (response) => {
        this.fetchMessage = response.message;
        this.loadingFetch = false;
        this.loadMatches();
      },
      error: (error) => {
        this.fetchMessage = error.error?.message || 'Failed to fetch matches';
        this.loadingFetch = false;
      }
    });
  }

  updateResults(): void {
    this.loadingUpdate = true;
    this.fetchMessage = '';

    // Israeli league is the only league available (ID: 4644)
    this.matchService.updateMatchResults('4644').subscribe({
      next: (response) => {
        this.fetchMessage = response.message;
        this.loadingUpdate = false;
        this.loadMatches();
      },
      error: (error) => {
        this.fetchMessage = error.error?.message || 'Failed to update results';
        this.loadingUpdate = false;
      }
    });
  }

  addToGroup(matchId: string): void {
    this.matchService.addMatchToGroup(matchId, this.groupId).subscribe({
      next: () => {
        this.loadMatches();
      },
      error: (error) => {
        console.error('Failed to add match to group:', error);
        alert('Failed to add match to group');
      }
    });
  }

  isGroupCreator(): boolean {
    if (!this.group) return false;
    const currentUser = this.authService.getCurrentUser();
    return this.group.creator?._id === currentUser?.id || this.group.creator === currentUser?.id;
  }

  goBack(): void {
    this.router.navigate(['/groups', this.groupId]);
  }
}
