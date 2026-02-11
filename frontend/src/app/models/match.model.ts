export interface Match {
  _id: string;
  externalApiId: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: Date;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';
  result?: MatchResult;
  competition: string;
  season?: string;
  groups: string[];
  relativePoints?: RelativePoints[];
  createdAt?: Date;
  // API-specific fields (for automatic groups)
  homeTeamId?: number;
  awayTeamId?: number;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  round?: string;
  // Live match fields
  elapsed?: number;  // Minutes elapsed in the match
  extraTime?: number;  // Extra/stoppage time minutes
  statusShort?: string;  // e.g., "1H", "HT", "2H"
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
  fromApi?: boolean;
}

export interface MatchEvent {
  time: { elapsed: number; extra?: number };
  team: { id: number; name: string; logo: string };
  player: { id: number; name: string } | null;
  assist: { id: number; name: string } | null;
  type: 'Goal' | 'Card' | 'Subst' | 'Var';
  detail: string;
}
