import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GroupService } from '../../../services/group.service';
import { AuthService } from '../../../services/auth.service';
import { Group } from '../../../models/group.model';
import { User } from '../../../models/user.model';
import { TranslatePipe } from '../../../services/translate.pipe';
import { ToastService } from '../../shared/toast/toast.service';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-groups-list',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  templateUrl: './groups-list.component.html',
  styleUrls: ['./groups-list.component.css']
})
export class GroupsListComponent implements OnInit {
  groups: Group[] = [];
  loading = true;
  cancellingGroupId: string | null = null;
  currentUser: User | null = null;

  constructor(
    private groupService: GroupService,
    private authService: AuthService,
    private toastService: ToastService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
    this.loadGroups();
  }

  getProfilePictureUrl(path: string): string {
    if (!path) return '';
    return path;
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

  getLeagueLogo(leagueId: string): string {
    return `https://media.api-sports.io/football/leagues/${leagueId}.png`;
  }

  cancelJoinRequest(groupId: string, event: Event): void {
    event.stopPropagation();
    if (this.cancellingGroupId) return;

    const confirmMessage = this.translationService.translate('groups.confirmCancelRequest');
    if (!confirm(confirmMessage)) return;

    this.cancellingGroupId = groupId;
    this.groupService.cancelJoinRequest(groupId).subscribe({
      next: () => {
        this.toastService.show(this.translationService.translate('groups.joinRequestCancelled'), 'success');
        this.groups = this.groups.filter(g => g._id !== groupId);
        this.cancellingGroupId = null;
      },
      error: (error) => {
        this.toastService.show(error.error?.message || 'Failed to cancel request', 'error');
        this.cancellingGroupId = null;
      }
    });
  }
}
