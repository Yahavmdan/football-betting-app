import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Group, CreateGroupData, JoinGroupData, GroupMember } from '../models/group.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GroupService {
  private apiUrl = `${environment.apiUrl}/groups`;

  constructor(private http: HttpClient) {}

  createGroup(data: CreateGroupData): Observable<{ success: boolean; data: Group }> {
    return this.http.post<{ success: boolean; data: Group }>(`${this.apiUrl}`, data);
  }

  joinGroup(data: JoinGroupData): Observable<{ success: boolean; data: Group }> {
    return this.http.post<{ success: boolean; data: Group }>(`${this.apiUrl}/join`, data);
  }

  getMyGroups(): Observable<{ success: boolean; data: Group[] }> {
    return this.http.get<{ success: boolean; data: Group[] }>(`${this.apiUrl}`);
  }

  getGroupById(id: string): Observable<{ success: boolean; data: Group }> {
    return this.http.get<{ success: boolean; data: Group }>(`${this.apiUrl}/${id}`);
  }

  getLeaderboard(groupId: string): Observable<{ success: boolean; data: GroupMember[] }> {
    return this.http.get<{ success: boolean; data: GroupMember[] }>(`${this.apiUrl}/${groupId}/leaderboard`);
  }
}
