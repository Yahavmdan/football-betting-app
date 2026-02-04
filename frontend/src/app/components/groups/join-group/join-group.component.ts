import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { GroupService } from '../../../services/group.service';
import { JoinGroupData } from '../../../models/group.model';
import { TranslatePipe } from '../../../services/translate.pipe';
import { TranslationService } from '../../../services/translation.service';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-join-group',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './join-group.component.html',
  styleUrls: ['./join-group.component.css']
})
export class JoinGroupComponent implements OnInit {
  joinData: JoinGroupData = {
    inviteCode: ''
  };
  loading = false;
  codeFromUrl = false; // Track if code came from URL (for auto-submit)

  constructor(
    private groupService: GroupService,
    private router: Router,
    private route: ActivatedRoute,
    private translationService: TranslationService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    // Check for invite code in route params (from /join/:code)
    const codeFromParams = this.route.snapshot.params['code'];
    if (codeFromParams) {
      this.joinData.inviteCode = codeFromParams.toUpperCase();
      this.codeFromUrl = true;
      // Auto-submit when code is provided via URL
      this.onSubmit();
    }
  }

  onSubmit(): void {
    this.loading = true;

    this.joinData.inviteCode = this.joinData.inviteCode.toUpperCase();

    this.groupService.joinGroup(this.joinData).subscribe({
      next: (response) => {
        // Show pending approval message
        this.toastService.show(response.message || this.translationService.translate('groups.joinRequestPending'), 'success');
        this.loading = false;
        // Navigate back to groups after a delay
        setTimeout(() => {
          void this.router.navigate(['/groups']);
        }, 2000);
      },
      error: (error) => {
        this.toastService.show(error.error?.message || this.translationService.translate('groups.joinFailed'), 'error');
        this.loading = false;
      }
    });
  }

  goBack(): void {
    void this.router.navigate(['/groups']);
  }
}
