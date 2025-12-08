export interface Bet {
  _id: string;
  user: string | any;
  match: string | any;
  group: string | any;
  prediction: BetPrediction;
  points: number | null;
  calculated: boolean;
  createdAt: Date;
}

export interface BetPrediction {
  outcome: '1' | 'X' | '2';
  homeScore: number;
  awayScore: number;
}

export interface PlaceBetData {
  matchId: string;
  groupId: string;
  outcome: '1' | 'X' | '2';
  homeScore: number;
  awayScore: number;
}
