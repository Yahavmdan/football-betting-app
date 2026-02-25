import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Bet, PlaceBetData, MemberBet } from '../models/bet.model';
import { environment } from '../../environments/environment';

const SILENT_HEADERS = new HttpHeaders().set('X-Skip-Loading', 'true');

@Injectable({
  providedIn: 'root'
})
export class BetService {
  private apiUrl = `${environment.apiUrl}/bets`;

  constructor(private http: HttpClient) {}

  placeBet(data: PlaceBetData): Observable<{ success: boolean; data: Bet; message?: string }> {
    return this.http.post<{ success: boolean; data: Bet; message?: string }>(`${this.apiUrl}`, data, { headers: SILENT_HEADERS });
  }

  getMyBets(groupId?: string): Observable<{ success: boolean; data: Bet[] }> {
    if (groupId) {
      return this.http.get<{ success: boolean; data: Bet[] }>(`${this.apiUrl}`, { params: { groupId }, headers: SILENT_HEADERS });
    }
    return this.http.get<{ success: boolean; data: Bet[] }>(`${this.apiUrl}`, { headers: SILENT_HEADERS });
  }

  getBetsByMatch(matchId: string, groupId: string): Observable<{ success: boolean; data: Bet[]; message?: string }> {
    return this.http.get<{ success: boolean; data: Bet[]; message?: string }>(
      `${this.apiUrl}/match/${matchId}`,
      { params: { groupId }, headers: SILENT_HEADERS }
    );
  }

  calculateBetPoints(): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/calculate-points`, {}, { headers: SILENT_HEADERS });
  }

  checkExistingBet(matchId: string, groupId: string): Observable<{ success: boolean; data: { hasBet: boolean; bet: Bet | null } }> {
    return this.http.get<{ success: boolean; data: { hasBet: boolean; bet: Bet | null } }>(
      `${this.apiUrl}/check`,
      { params: { matchId, groupId }, headers: SILENT_HEADERS }
    );
  }

  getGroupMembersBets(matchId: string, groupId: string): Observable<{ success: boolean; data: MemberBet[] }> {
    return this.http.get<{ success: boolean; data: MemberBet[] }>(
      `${this.apiUrl}/match/${matchId}/group/${groupId}/members`,
      { headers: SILENT_HEADERS }
    );
  }

  getAllBetsForGroup(groupId: string): Observable<{ success: boolean; data: Bet[] }> {
    return this.http.get<{ success: boolean; data: Bet[] }>(
      `${this.apiUrl}/group/${groupId}/all`,
      { headers: SILENT_HEADERS }
    );
  }

  getUserStatistics(userId: string, groupId: string): Observable<{ success: boolean; data: UserStatistics }> {
    return this.http.get<{ success: boolean; data: UserStatistics }>(
      `${this.apiUrl}/user/${userId}/group/${groupId}/stats`,
      { headers: SILENT_HEADERS }
    );
  }
}

export interface UserStatistics {
  groupStats: BetStats;
  globalStats: BetStats;
  groupsCount: number;
  statsAdjustment?: {
    totalBets: number;
    correctPredictions: number;
  } | null;
}

export interface BetStats {
  totalBets: number;
  calculatedBets: number;
  correctPredictions: number;
  successRate: number;
  predictions: {
    homeWins: number;
    draws: number;
    awayWins: number;
  };
  correctByType: {
    homeWins: number;
    draws: number;
    awayWins: number;
  };
}
