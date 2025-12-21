export interface Bet {
  _id: string;
  user: string | any;
  match: string | any;
  group: string | any;
  prediction: BetPrediction;
  wagerAmount: number | null;
  points: number | null;
  calculated: boolean;
  createdAt: Date;
}

export interface BetPrediction {
  outcome: '1' | 'X' | '2';
}

export interface PlaceBetData {
  matchId: string;
  groupId: string;
  outcome: '1' | 'X' | '2';
  wagerAmount?: number;
}

export interface MemberBet {
  user: {
    _id: string;
    username: string;
  };
  hasBet: boolean;
  bet: {
    outcome: '1' | 'X' | '2';
    createdAt: Date;
    points: number | null;
  } | null;
}
