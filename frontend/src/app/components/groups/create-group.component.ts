import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GroupService } from '../../services/group.service';
import { CreateGroupData } from '../../models/group.model';
import { TranslatePipe } from '../../services/translate.pipe';

@Component({
  selector: 'app-create-group',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="container">
      <div class="form-card">
        <h2>{{ 'groups.createNewGroup' | translate }}</h2>
        <form (ngSubmit)="onSubmit()" #createGroupForm="ngForm">
          <div class="form-group">
            <label for="name">{{ 'groups.groupName' | translate }} *</label>
            <input
              type="text"
              id="name"
              name="name"
              [(ngModel)]="groupData.name"
              required
              maxlength="50"
              class="form-control"
              [placeholder]="'groups.enterGroupName' | translate"
            />
          </div>
          <div class="form-group">
            <label for="description">{{ 'groups.description' | translate }}</label>
            <textarea
              id="description"
              name="description"
              [(ngModel)]="groupData.description"
              maxlength="200"
              class="form-control"
              rows="4"
              [placeholder]="'groups.enterDescription' | translate"
            ></textarea>
          </div>
          <div *ngIf="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>
          <div class="button-group">
            <button type="button" (click)="goBack()" class="btn-secondary">{{ 'groups.cancel' | translate }}</button>
            <button type="submit" [disabled]="!createGroupForm.valid || loading" class="btn-primary">
              {{ loading ? ('groups.creating' | translate) : ('groups.createGroup' | translate) }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 600px;
      margin: 2rem auto;
      padding: 2rem;
    }
    .form-card {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h2 {
      margin-top: 0;
      margin-bottom: 1.5rem;
      color: #333;
    }
    .form-group {
      margin-bottom: 1.5rem;
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
      font-family: inherit;
    }
    .form-control:focus {
      outline: none;
      border-color: #4CAF50;
    }
    textarea.form-control {
      resize: vertical;
    }
    .button-group {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
    }
    .btn-primary, .btn-secondary {
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
      background-color: #f5f5f5;
      color: #333;
    }
    .btn-secondary:hover {
      background-color: #e0e0e0;
    }
    .error-message {
      color: #f44336;
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }
  `]
})
export class CreateGroupComponent {
  groupData: CreateGroupData = {
    name: '',
    description: ''
  };
  errorMessage = '';
  loading = false;

  constructor(
    private groupService: GroupService,
    private router: Router
  ) {}

  onSubmit(): void {
    this.loading = true;
    this.errorMessage = '';

    this.groupService.createGroup(this.groupData).subscribe({
      next: (response) => {
        this.router.navigate(['/groups', response.data._id]);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to create group. Please try again.';
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/groups']);
  }
}
