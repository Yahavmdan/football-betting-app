import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FavoriteTeam } from '../models/user.model';
import { ApiTeam } from './match.service';

export interface UpdatePreferencesRequest {
  favoriteLeagues?: string[];
  favoriteTournaments?: string[];
  favoriteTeams?: FavoriteTeam[];
}

export interface PreferencesResponse {
  success: boolean;
  message: string;
  data: {
    favoriteLeagues: string[];
    favoriteTournaments: string[];
    favoriteTeams: FavoriteTeam[];
    preferencesConfigured: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PreferencesService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  updatePreferences(data: UpdatePreferencesRequest): Observable<PreferencesResponse> {
    // Skip global loading spinner - we show item-level spinner instead
    const headers = new HttpHeaders().set('X-Skip-Loading', 'true');
    return this.http.put<PreferencesResponse>(`${this.apiUrl}/preferences`, data, { headers });
  }

  dismissReminder(): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/preferences/dismiss`, {});
  }

  getLeagueTeams(leagueId: string, season?: number): Observable<{ success: boolean; data: ApiTeam[] }> {
    const params: any = { leagueId };
    if (season) params.season = season.toString();
    return this.http.get<{ success: boolean; data: ApiTeam[] }>(`${environment.apiUrl}/matches/leagues/teams`, { params });
  }
}
