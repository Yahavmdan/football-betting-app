export interface Match {
  _id: string;
  externalApiId: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: Date;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';
  result: MatchResult;
  competition: string;
  groups: string[];
  relativePoints: RelativePoints[];
  createdAt: Date;
}

export interface MatchResult {
  homeScore: number | null;
  awayScore: number | null;
  outcome: '1' | 'X' | '2' | null;
}

export interface RelativePoints {
  group: string;
  homeWin: number;
  draw: number;
  awayWin: number;
}
