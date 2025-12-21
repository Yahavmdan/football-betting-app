export interface Group {
  _id: string;
  name: string;
  description?: string;
  betType: 'classic' | 'relative';
  startingCredits: number;
  creditsGoal: number;
  creator: any;
  members: GroupMember[];
  inviteCode: string;
  createdAt: Date;
}

export interface GroupMember {
  user: {
    _id: string;
    username: string;
    email: string;
  };
  joinedAt: Date;
  points: number;
}

export interface CreateGroupData {
  name: string;
  description?: string;
  betType?: 'classic' | 'relative';
  startingCredits?: number;
  creditsGoal?: number;
}

export interface JoinGroupData {
  inviteCode: string;
}
