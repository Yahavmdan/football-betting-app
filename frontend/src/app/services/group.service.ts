import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Group, CreateGroupData, JoinGroupData, GroupMember, PendingMember } from '../models/group.model';
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

  joinGroup(data: JoinGroupData): Observable<{ success: boolean; message?: string; data: Group }> {
    return this.http.post<{ success: boolean; message?: string; data: Group }>(`${this.apiUrl}/join`, data);
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

  editGroup(groupId: string, data: { name?: string; description?: string }): Observable<{ success: boolean; message: string; data: Group }> {
    return this.http.put<{ success: boolean; message: string; data: Group }>(`${this.apiUrl}/${groupId}`, data);
  }

  deleteGroup(groupId: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${groupId}`);
  }

  leaveGroup(groupId: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/${groupId}/leave`, {});
  }

  // Filter preferences
  getFilterPreferences(groupId: string): Observable<{ success: boolean; data: any }> {
    return this.http.get<{ success: boolean; data: any }>(`${this.apiUrl}/${groupId}/filter-preferences`);
  }

  saveFilterPreferences(groupId: string, data: { filters: any; saveEnabled: boolean }): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/${groupId}/filter-preferences`, data);
  }

  clearFilterPreferences(groupId: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${groupId}/filter-preferences`);
  }

  // Member management
  getPendingMembers(groupId: string): Observable<{ success: boolean; data: PendingMember[] }> {
    return this.http.get<{ success: boolean; data: PendingMember[] }>(`${this.apiUrl}/${groupId}/pending`);
  }

  approveMember(groupId: string, userId: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/${groupId}/approve/${userId}`, {});
  }

  rejectMember(groupId: string, userId: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/${groupId}/reject/${userId}`, {});
  }

  kickMember(groupId: string, userId: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/${groupId}/kick/${userId}`, {});
  }
}
