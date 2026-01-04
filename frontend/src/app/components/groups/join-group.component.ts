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
      max-width: 560px;
      margin: 2rem auto;
      padding: 2rem;
      animation: fadeIn 0.5s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .form-card {
      background: white;
      padding: 2.5rem;
      border-radius: 24px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(0, 0, 0, 0.04);
      text-align: center;
    }
    h2 {
      margin-top: 0;
      margin-bottom: 0.75rem;
      color: #1a1a2e;
      font-size: 1.75rem;
      font-weight: 700;
      font-family: 'Poppins', sans-serif;
    }
    .info-text {
      color: #64748b;
      margin-bottom: 2rem;
      font-size: 1rem;
    }
    .form-group {
      margin-bottom: 1.75rem;
      text-align: left;
    }
    label {
      display: block;
      margin-bottom: 0.6rem;
      color: #475569;
      font-weight: 600;
      font-size: 0.95rem;
    }
    .form-control {
      width: 100%;
      padding: 1.25rem 1.5rem;
      border: 3px solid #e2e8f0;
      border-radius: 16px;
      font-size: 1.25rem;
      transition: all 0.3s ease;
      background: #f8fafc;
    }
    .invite-code-input {
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 4px;
      text-align: center;
      font-family: 'Poppins', monospace;
    }
    .form-control:focus {
      outline: none;
      border-color: #4ade80;
      background: white;
      box-shadow: 0 0 0 4px rgba(74, 222, 128, 0.15);
    }
    .form-control::placeholder {
      color: #94a3b8;
      letter-spacing: 2px;
      font-weight: 500;
    }
    .button-group {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 2rem;
    }
    .btn-primary, .btn-secondary {
      padding: 0.9rem 2rem;
      border: none;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .btn-primary {
      background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
      color: white;
      box-shadow: 0 4px 15px rgba(74, 222, 128, 0.3);
    }
    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(74, 222, 128, 0.4);
    }
    .btn-primary:disabled {
      background: linear-gradient(135deg, #cbd5e0 0%, #94a3b8 100%);
      box-shadow: none;
      cursor: not-allowed;
      transform: none;
    }
    .btn-secondary {
      background: #f1f5f9;
      color: #475569;
    }
    .btn-secondary:hover {
      background: #e2e8f0;
    }
    .error-message {
      color: #dc2626;
      margin-bottom: 1.25rem;
      padding: 1rem;
      background: #fee2e2;
      border-radius: 12px;
      border-left: 4px solid #ef4444;
      font-weight: 500;
      font-size: 0.95rem;
      text-align: left;
    }
    .success-message {
      color: #16a34a;
      margin-bottom: 1.25rem;
      padding: 1rem;
      background: #dcfce7;
      border-radius: 12px;
      border-left: 4px solid #22c55e;
      font-weight: 500;
      font-size: 0.95rem;
      text-align: left;
    }
    @media (max-width: 640px) {
      .container {
        padding: 1rem;
      }
      .form-card {
        padding: 1.5rem;
      }
      .button-group {
        flex-direction: column-reverse;
      }
      .btn-primary, .btn-secondary {
        width: 100%;
      }
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
        // Show pending approval message
        this.successMessage = response.message || this.translationService.translate('groups.joinRequestPending');
        this.loading = false;
        // Navigate back to groups after a delay
        setTimeout(() => {
          this.router.navigate(['/groups']);
        }, 2000);
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
