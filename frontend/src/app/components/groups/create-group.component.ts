import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GroupService } from '../../services/group.service';
import { CreateGroupData } from '../../models/group.model';
import { TranslatePipe } from '../../services/translate.pipe';
import { TranslationService } from '../../services/translation.service';

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
      max-width: 640px;
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
    }
    h2 {
      margin-top: 0;
      margin-bottom: 2rem;
      color: #1a1a2e;
      font-size: 1.75rem;
      font-weight: 700;
      font-family: 'Poppins', sans-serif;
    }
    .form-group {
      margin-bottom: 1.75rem;
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
      padding: 1rem 1.25rem;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      font-size: 1rem;
      font-family: inherit;
      transition: all 0.3s ease;
      background: #f8fafc;
    }
    .form-control:focus {
      outline: none;
      border-color: #4ade80;
      background: white;
      box-shadow: 0 0 0 4px rgba(74, 222, 128, 0.15);
    }
    .form-control::placeholder {
      color: #94a3b8;
    }
    textarea.form-control {
      resize: vertical;
      min-height: 120px;
    }
    .button-group {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      margin-top: 2rem;
    }
    .btn-primary, .btn-secondary {
      padding: 0.9rem 1.75rem;
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
export class CreateGroupComponent {
  groupData: CreateGroupData = {
    name: '',
    description: ''
  };
  errorMessage = '';
  loading = false;

  constructor(
    private groupService: GroupService,
    private router: Router,
    private translationService: TranslationService
  ) {}

  onSubmit(): void {
    this.loading = true;
    this.errorMessage = '';

    this.groupService.createGroup(this.groupData).subscribe({
      next: (response) => {
        this.router.navigate(['/groups', response.data._id]);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || this.translationService.translate('groups.createFailed');
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/groups']);
  }
}
