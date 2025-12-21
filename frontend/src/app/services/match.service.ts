import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Match } from '../models/match.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MatchService {
  private apiUrl = `${environment.apiUrl}/matches`;

  constructor(private http: HttpClient) {}

  getMatches(groupId?: string): Observable<{ success: boolean; data: Match[] }> {
    const options = groupId ? { params: { groupId } } : {};
    return this.http.get<{ success: boolean; data: Match[] }>(`${this.apiUrl}`, options);
  }

  getMatchById(id: string): Observable<{ success: boolean; data: Match }> {
    return this.http.get<{ success: boolean; data: Match }>(`${this.apiUrl}/${id}`);
  }

  addMatchToGroup(matchId: string, groupId: string): Observable<{ success: boolean; data: Match }> {
    return this.http.post<{ success: boolean; data: Match }>(`${this.apiUrl}/add-to-group`, {
      matchId,
      groupId
    });
  }

  getAvailableLeagues(): Observable<{ success: boolean; data: any[] }> {
    return this.http.get<{ success: boolean; data: any[] }>(`${this.apiUrl}/leagues/available`);
  }

  fetchAndSaveMatches(leagueId?: string): Observable<{ success: boolean; message: string; data: Match[] }> {
    return this.http.post<{ success: boolean; message: string; data: Match[] }>(`${this.apiUrl}/fetch`, { leagueId });
  }

  updateMatchResults(leagueId?: string): Observable<{ success: boolean; message: string; data: Match[] }> {
    return this.http.post<{ success: boolean; message: string; data: Match[] }>(`${this.apiUrl}/update-results`, { leagueId });
  }

  createManualMatch(data: {
    homeTeam: string;
    awayTeam: string;
    matchDateTime?: string; // ISO string
    matchDate?: string;
    matchHour?: string;
    groupId: string;
    homeScore?: number;
    awayScore?: number;
  }): Observable<{ success: boolean; message: string; data: Match }> {
    return this.http.post<{ success: boolean; message: string; data: Match }>(`${this.apiUrl}/create-manual`, data);
  }

  updateMatchScore(data: {
    matchId: string;
    groupId: string;
    homeScore: number;
    awayScore: number;
  }): Observable<{ success: boolean; message: string; data: Match }> {
    return this.http.post<{ success: boolean; message: string; data: Match }>(`${this.apiUrl}/update-score`, data);
  }

  markMatchAsFinished(data: {
    matchId: string;
    groupId: string;
  }): Observable<{ success: boolean; message: string; data: Match }> {
    return this.http.post<{ success: boolean; message: string; data: Match }>(`${this.apiUrl}/mark-finished`, data);
  }

  deleteMatch(matchId: string, groupId: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${matchId}`, {
      body: { groupId }
    });
  }

  editMatch(data: {
    matchId: string;
    groupId: string;
    homeTeam?: string;
    awayTeam?: string;
    matchDateTime?: string; // ISO string
    matchDate?: string;
    matchHour?: string;
    relativePoints?: { homeWin: number; draw: number; awayWin: number };
  }): Observable<{ success: boolean; message: string; data: Match }> {
    return this.http.put<{ success: boolean; message: string; data: Match }>(`${this.apiUrl}/${data.matchId}`, data);
  }
}
