import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GroupService } from '../../services/group.service';
import { JoinGroupData } from '../../models/group.model';
import { TranslatePipe } from '../../services/translate.pipe';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-join-group',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="container">
      <div class="form-card">
        <h2>{{ 'groups.joinGroup' | translate }}</h2>
        <p class="info-text">{{ 'groups.enterInviteCode' | translate }}</p>
        <form (ngSubmit)="onSubmit()" #joinGroupForm="ngForm">
          <div class="form-group">
            <label for="inviteCode">{{ 'groups.inviteCode' | translate }} *</label>
            <input
              type="text"
              id="inviteCode"
              name="inviteCode"
              [(ngModel)]="joinData.inviteCode"
              required
              class="form-control invite-code-input"
              [placeholder]="'groups.enterCode' | translate"
              maxlength="8"
            />
          </div>
          <div *ngIf="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>
          <div *ngIf="successMessage" class="success-message">
            {{ successMessage }}
          </div>
          <div class="button-group">
            <button type="button" (click)="goBack()" class="btn-secondary">{{ 'groups.cancel' | translate }}</button>
            <button type="submit" [disabled]="!joinGroupForm.valid || loading" class="btn-primary">
              {{ loading ? ('groups.joining' | translate) : ('groups.joinGroup' | translate) }}
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
      margin-bottom: 0.5rem;
      color: #333;
    }
    .info-text {
      color: #666;
      margin-bottom: 1.5rem;
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
    }
    .invite-code-input {
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 2px;
    }
    .form-control:focus {
      outline: none;
      border-color: #4CAF50;
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
    .success-message {
      color: #4CAF50;
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }
  `]
})
export class JoinGroupComponent {
  joinData: JoinGroupData = {
    inviteCode: ''
  };
  errorMessage = '';
  successMessage = '';
  loading = false;

  constructor(
    private groupService: GroupService,
    private router: Router,
    private translationService: TranslationService
  ) {}

  onSubmit(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.joinData.inviteCode = this.joinData.inviteCode.toUpperCase();

    this.groupService.joinGroup(this.joinData).subscribe({
      next: (response) => {
        this.successMessage = this.translationService.translate('groups.successJoined');
        setTimeout(() => {
          this.router.navigate(['/groups', response.data._id]);
        }, 1000);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || this.translationService.translate('groups.joinFailed');
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/groups']);
  }
}
