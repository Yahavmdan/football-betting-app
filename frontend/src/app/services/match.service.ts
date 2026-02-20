import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Match, MatchEvent, MatchLineup, MatchTeamStatistics } from '../models/match.model';
import { League } from '../models/league.model';
import { environment } from '../../environments/environment';

const SILENT_HEADERS = new HttpHeaders().set('X-Skip-Loading', 'true');

@Injectable({
  providedIn: 'root'
})
export class MatchService {
  private apiUrl = `${environment.apiUrl}/matches`;

  constructor(private http: HttpClient) { }

  getMatches(groupId?: string): Observable<{ success: boolean; data: Match[] }> {
    const options = groupId ? { params: { groupId } } : {};
    return this.http.get<{ success: boolean; data: Match[] }>(`${this.apiUrl}`, options);
  }

  getMatchById(id: string, silent = false): Observable<{ success: boolean; data: Match }> {
    return this.http.get<{ success: boolean; data: Match }>(`${this.apiUrl}/${id}`, silent ? { headers: SILENT_HEADERS } : {});
  }

  addMatchToGroup(matchId: string, groupId: string): Observable<{ success: boolean; data: Match }> {
    return this.http.post<{ success: boolean; data: Match }>(`${this.apiUrl}/add-to-group`, {
      matchId,
      groupId
    });
  }

  getAvailableLeagues(): Observable<{ success: boolean; data: League[] }> {
    return this.http.get<{ success: boolean; data: League[] }>(`${this.apiUrl}/leagues/available`);
  }

  getLeagueFixtures(leagueId: string, season?: number, scheduled?: boolean): Observable<{ success: boolean; data: any[]; fromCache: boolean; cachedAt: string }> {
    const params: any = { leagueId };
    if (season) params.season = season.toString();
    if (scheduled) params.scheduled = 'true';
    return this.http.get<{ success: boolean; data: any[]; fromCache: boolean; cachedAt: string }>(`${this.apiUrl}/leagues/fixtures`, { params });
  }

  syncLeagueToGroup(groupId: string): Observable<{ success: boolean; message: string; data: { added: number; skipped: number; total: number } }> {
    return this.http.post<{ success: boolean; message: string; data: { added: number; skipped: number; total: number } }>(`${this.apiUrl}/sync-league`, { groupId });
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

  getHeadToHead(homeTeam: string, awayTeam: string, homeTeamId?: number, awayTeamId?: number): Observable<{ success: boolean; data: Match[] }> {
    const params: any = { homeTeam, awayTeam };
    if (homeTeamId) params.homeTeamId = homeTeamId.toString();
    if (awayTeamId) params.awayTeamId = awayTeamId.toString();
    return this.http.get<{ success: boolean; data: Match[] }>(`${this.apiUrl}/head-to-head`, { params, headers: SILENT_HEADERS });
  }

  getTeamRecentMatches(team: string, teamId?: number): Observable<{ success: boolean; data: Match[] }> {
    const params: any = { team };
    if (teamId) params.teamId = teamId.toString();
    return this.http.get<{ success: boolean; data: Match[] }>(`${this.apiUrl}/team-recent`, { params, headers: SILENT_HEADERS });
  }

  // Get all currently live fixtures worldwide
  getLiveFixtures(): Observable<{ success: boolean; data: any[]; count: number }> {
    return this.http.get<{ success: boolean; data: any[]; count: number }>(`${this.apiUrl}/live`);
  }

  // Add live fixtures to a group for testing
  addLiveFixturesToGroup(groupId: string, limit: number = 5): Observable<{ success: boolean; message: string; data: Match[] }> {
    return this.http.post<{ success: boolean; message: string; data: Match[] }>(`${this.apiUrl}/live/add-to-group`, {
      groupId,
      limit
    });
  }

  // Refresh live matches in a group with fresh data from API
  refreshLiveMatches(groupId: string): Observable<{ success: boolean; message: string; data: Match[] }> {
    return this.http.post<{ success: boolean; message: string; data: Match[] }>(`${this.apiUrl}/live/refresh/${groupId}`, {}, { headers: SILENT_HEADERS });
  }

  // Refresh a single match with fresh data from API (efficient - 1 API call per data type)
  // If groupId is provided, also fetches fresh odds for relative betting
  refreshSingleMatch(matchId: string, groupId?: string): Observable<{ success: boolean; message: string; data: Match }> {
    const params = groupId ? `?groupId=${groupId}` : '';
    return this.http.post<{ success: boolean; message: string; data: Match }>(`${this.apiUrl}/${matchId}/refresh${params}`, {}, { headers: SILENT_HEADERS });
  }

  // Get teams for a specific league (for automatic groups)
  getLeagueTeams(leagueId: string, season?: number, silent = true): Observable<{ success: boolean; data: ApiTeam[] }> {
    const params: any = { leagueId };
    if (season) params.season = season.toString();
    return this.http.get<{ success: boolean; data: ApiTeam[] }>(`${this.apiUrl}/leagues/teams`, {
      params,
      headers: silent ? SILENT_HEADERS : undefined
    });
  }

  // Get filtered fixtures from API (for automatic groups)
  getFilteredFixtures(filters: {
    leagueId: string;
    season?: number;
    dateFrom?: string;
    dateTo?: string;
    status?: string[];
    teamId?: string;
    homeScore?: number;
    awayScore?: number;
    groupId?: string;
  }): Observable<{ success: boolean; data: ApiFixture[] }> {
    const params: any = { leagueId: filters.leagueId };

    if (filters.season) params.season = filters.season.toString();
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    if (filters.status && filters.status.length > 0) params.status = filters.status.join(',');
    if (filters.teamId) params.teamId = filters.teamId;
    if (filters.homeScore !== undefined) params.homeScore = filters.homeScore.toString();
    if (filters.awayScore !== undefined) params.awayScore = filters.awayScore.toString();
    if (filters.groupId) params.groupId = filters.groupId;

    return this.http.get<{ success: boolean; data: ApiFixture[] }>(`${this.apiUrl}/leagues/fixtures/filtered`, { params });
  }

  // Get league standings/table
  getLeagueStandings(leagueId: string, season?: number): Observable<{ success: boolean; data: LeagueStandings }> {
    const params: any = { leagueId };
    if (season) params.season = season.toString();
    return this.http.get<{ success: boolean; data: LeagueStandings }>(`${this.apiUrl}/leagues/standings`, { params, headers: SILENT_HEADERS });
  }

  // Get match events (goals, cards, substitutions)
  getMatchEvents(matchId: string): Observable<{ success: boolean; data: MatchEvent[] }> {
    return this.http.get<{ success: boolean; data: MatchEvent[] }>(
      `${this.apiUrl}/${matchId}/events`,
      { headers: SILENT_HEADERS }
    );
  }

  // Get match lineups
  getMatchLineups(matchId: string): Observable<{ success: boolean; data: MatchLineup[] }> {
    return this.http.get<{ success: boolean; data: MatchLineup[] }>(
      `${this.apiUrl}/${matchId}/lineups`,
      { headers: SILENT_HEADERS }
    );
  }

  // Get match statistics
  getMatchStatistics(matchId: string): Observable<{ success: boolean; data: MatchTeamStatistics[] }> {
    return this.http.get<{ success: boolean; data: MatchTeamStatistics[] }>(
      `${this.apiUrl}/${matchId}/statistics`,
      { headers: SILENT_HEADERS }
    );
  }

  // Get personalized matches based on user preferences
  getPersonalizedMatches(silent: boolean = false): Observable<PersonalizedMatchesResponse> {
    const options = silent ? { headers: SILENT_HEADERS } : {};
    return this.http.get<PersonalizedMatchesResponse>(`${this.apiUrl}/personalized`, options);
  }
}

// API response types for automatic groups
export interface ApiTeam {
  id: number;
  name: string;
  code: string;
  logo: string;
  country: string;
}

export interface ApiFixture {
  externalApiId: string;
  homeTeam: string;
  homeTeamId: number;
  homeTeamLogo: string;
  awayTeam: string;
  awayTeamId: number;
  awayTeamLogo: string;
  matchDate: string;
  elapsed?: number;
  extraTime?: number;
  statusShort?: string;
  status: string;
  result: {
    homeScore: number;
    awayScore: number;
    outcome: string;
  } | null;
  competition: string;
  season: number;
  round: string;
  venue: string | null;
}

export interface LeagueStandings {
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
  };
  standings: StandingTeam[];
}

export interface StandingTeam {
  rank: number;
  team: {
    id: number;
    name: string;
    logo: string;
  };
  points: number;
  goalsDiff: number;
  form: string;
  description: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface PersonalizedMatch extends ApiFixture {
  isFavoriteTeam: boolean;
  leagueId: string;
}

export interface PersonalizedMatchesResponse {
  success: boolean;
  data: {
    matches: PersonalizedMatch[];
    liveMatches: PersonalizedMatch[];
    groupedByLeague: {
      [leagueId: string]: {
        league: {
          id: string;
          name: string;
          logo: string | null;
        };
        matches: PersonalizedMatch[];
      };
    };
    hasPreferences: boolean;
    dateRange?: { from: string; to: string };
  };
}
