import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Bet, PlaceBetData, MemberBet } from '../models/bet.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BetService {
  private apiUrl = `${environment.apiUrl}/bets`;

  constructor(private http: HttpClient) {}

  placeBet(data: PlaceBetData): Observable<{ success: boolean; data: Bet; message?: string }> {
    return this.http.post<{ success: boolean; data: Bet; message?: string }>(`${this.apiUrl}`, data);
  }

  getMyBets(groupId?: string): Observable<{ success: boolean; data: Bet[] }> {
    const options = groupId ? { params: { groupId } } : {};
    return this.http.get<{ success: boolean; data: Bet[] }>(`${this.apiUrl}`, options);
  }

  getBetsByMatch(matchId: string, groupId: string): Observable<{ success: boolean; data: Bet[]; message?: string }> {
    return this.http.get<{ success: boolean; data: Bet[]; message?: string }>(
      `${this.apiUrl}/match/${matchId}`,
      { params: { groupId } }
    );
  }

  calculateBetPoints(): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/calculate-points`, {});
  }

  checkExistingBet(matchId: string, groupId: string): Observable<{ success: boolean; data: { hasBet: boolean; bet: Bet | null } }> {
    return this.http.get<{ success: boolean; data: { hasBet: boolean; bet: Bet | null } }>(
      `${this.apiUrl}/check`,
      { params: { matchId, groupId } }
    );
  }

  getGroupMembersBets(matchId: string, groupId: string): Observable<{ success: boolean; data: MemberBet[] }> {
    return this.http.get<{ success: boolean; data: MemberBet[] }>(
      `${this.apiUrl}/match/${matchId}/group/${groupId}/members`
    );
  }

  getAllBetsForGroup(groupId: string): Observable<{ success: boolean; data: Bet[] }> {
    return this.http.get<{ success: boolean; data: Bet[] }>(
      `${this.apiUrl}/group/${groupId}/all`
    );
  }

  getUserStatistics(userId: string, groupId: string): Observable<{ success: boolean; data: UserStatistics }> {
    return this.http.get<{ success: boolean; data: UserStatistics }>(
      `${this.apiUrl}/user/${userId}/group/${groupId}/stats`
    );
  }
}

export interface UserStatistics {
  groupStats: BetStats;
  globalStats: BetStats;
  groupsCount: number;
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
