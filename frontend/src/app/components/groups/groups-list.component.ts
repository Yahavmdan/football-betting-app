import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GroupService } from '../../services/group.service';
import { Group } from '../../models/group.model';
import { TranslatePipe } from '../../services/translate.pipe';

@Component({
  selector: 'app-groups-list',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  template: `
    <div class="container">
      <div class="header">
        <h1>{{ 'groups.myGroups' | translate }}</h1>
        <div class="actions">
          <button routerLink="/groups/create" class="btn-primary">{{ 'groups.createGroup' | translate }}</button>
          <button routerLink="/groups/join" class="btn-secondary">{{ 'groups.joinGroup' | translate }}</button>
        </div>
      </div>

      <div *ngIf="loading" class="loading">{{ 'auth.loading' | translate }}</div>

      <div *ngIf="!loading && groups.length === 0" class="empty-state">
        <p>{{ 'groups.noGroups' | translate }}</p>
        <p>{{ 'groups.getStarted' | translate }}</p>
      </div>

      <div class="groups-grid">
        <div *ngFor="let group of groups" class="group-card" [routerLink]="['/groups', group._id]">
          <h3>{{ group.name }}</h3>
          <p class="description">{{ group.description || ('groups.noDescription' | translate) }}</p>
          <div class="group-info">
            <span class="member-count">{{ group.members.length }} {{ 'groups.members' | translate }}</span>
            <span class="invite-code">{{ 'groups.code' | translate }}: {{ group.inviteCode }}</span>
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
    .actions {
      display: flex;
      gap: 1rem;
    }
    .btn-primary, .btn-secondary {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
    }
    .btn-primary {
      background-color: #4CAF50;
      color: white;
    }
    .btn-primary:hover {
      background-color: #45a049;
    }
    .btn-secondary {
      background-color: #2196F3;
      color: white;
    }
    .btn-secondary:hover {
      background-color: #0b7dda;
    }
    .loading {
      text-align: center;
      padding: 2rem;
      color: #666;
    }
    .empty-state {
      text-align: center;
      padding: 3rem;
      color: #666;
    }
    .groups-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
    }
    .group-card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .group-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .group-card h3 {
      margin: 0 0 0.5rem 0;
      color: #333;
    }
    .description {
      color: #666;
      margin: 0 0 1rem 0;
      min-height: 2rem;
    }
    .group-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.9rem;
      color: #999;
    }
    .invite-code {
      font-weight: 600;
      color: #4CAF50;
    }
  `]
})
export class GroupsListComponent implements OnInit {
  groups: Group[] = [];
  loading = true;

  constructor(private groupService: GroupService) {}

  ngOnInit(): void {
    this.loadGroups();
  }

  loadGroups(): void {
    this.groupService.getMyGroups().subscribe({
      next: (response) => {
        this.groups = response.data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load groups:', error);
        this.loading = false;
      }
    });
  }
}
