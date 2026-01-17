import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GroupService } from '../../../services/group.service';
import { Group } from '../../../models/group.model';
import { TranslatePipe } from '../../../services/translate.pipe';

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
