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
        <div *ngFor="let group of groups"
             class="group-card"
             [class.pending]="group.isPending"
             [routerLink]="group.isPending ? null : ['/groups', group._id]"
             [style.cursor]="group.isPending ? 'default' : 'pointer'">
          <div *ngIf="group.isPending" class="pending-badge">
            {{ 'groups.joinRequestPending' | translate }}
          </div>
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
      max-width: 1400px;
      margin: 0 auto;
      padding: 2.5rem;
      animation: fadeIn 0.5s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2.5rem;
      flex-wrap: wrap;
      gap: 1.5rem;
    }
    h1 {
      color: #1a1a2e;
      margin: 0;
      font-size: 2.25rem;
      font-weight: 700;
      font-family: 'Poppins', sans-serif;
    }
    .actions {
      display: flex;
      gap: 1rem;
    }
    .btn-primary, .btn-secondary {
      padding: 0.9rem 1.75rem;
      border: none;
      border-radius: 12px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s ease;
    }
    .btn-primary {
      background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
      color: white;
      box-shadow: 0 4px 15px rgba(74, 222, 128, 0.3);
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(74, 222, 128, 0.4);
    }
    .btn-secondary {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
    }
    .btn-secondary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
    }
    .loading {
      text-align: center;
      padding: 3rem;
      color: #64748b;
      font-size: 1.1rem;
    }
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      color: #64748b;
      background: white;
      border-radius: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }
    .empty-state p {
      margin: 0.5rem 0;
      font-size: 1.1rem;
    }
    .groups-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.75rem;
    }
    .group-card {
      background: white;
      padding: 1.75rem;
      border-radius: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid rgba(0, 0, 0, 0.04);
      position: relative;
      overflow: hidden;
    }
    .group-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
      transform: scaleX(0);
      transition: transform 0.3s ease;
    }
    .group-card:hover:not(.pending) {
      transform: translateY(-8px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
    }
    .group-card:hover:not(.pending)::before {
      transform: scaleX(1);
    }
    .group-card.pending {
      opacity: 0.7;
      background: #f8fafc;
      border: 2px dashed #94a3b8;
    }
    .group-card.pending::before {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      transform: scaleX(1);
    }
    .pending-badge {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      padding: 0.35rem 0.75rem;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
    }
    .group-card h3 {
      margin: 0 0 0.75rem 0;
      color: #1a1a2e;
      font-size: 1.25rem;
      font-weight: 600;
    }
    .description {
      color: #64748b;
      margin: 0 0 1.25rem 0;
      min-height: 2.5rem;
      line-height: 1.5;
      font-size: 0.95rem;
    }
    .group-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.9rem;
      color: #94a3b8;
      padding-top: 1rem;
      border-top: 1px solid #f1f5f9;
    }
    .member-count {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .invite-code {
      font-weight: 700;
      color: #22c55e;
      background: #f0fdf4;
      padding: 0.35rem 0.75rem;
      border-radius: 8px;
      font-size: 0.85rem;
    }
    @media (max-width: 768px) {
      .container {
        padding: 1rem;
      }
      .header {
        flex-direction: column;
        align-items: flex-start;
      }
      h1 {
        font-size: 1.75rem;
      }
      .actions {
        width: 100%;
      }
      .btn-primary, .btn-secondary {
        flex: 1;
        justify-content: center;
      }
      .groups-grid {
        grid-template-columns: 1fr;
      }
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
