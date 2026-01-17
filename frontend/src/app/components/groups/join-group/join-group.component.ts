import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GroupService } from '../../../services/group.service';
import { JoinGroupData } from '../../../models/group.model';
import { TranslatePipe } from '../../../services/translate.pipe';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-join-group',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './join-group.component.html',
  styleUrls: ['./join-group.component.css']
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
          void this.router.navigate(['/groups']);
        }, 2000);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || this.translationService.translate('groups.joinFailed');
        this.loading = false;
      }
    });
  }

  goBack(): void {
    void this.router.navigate(['/groups']);
  }
}
