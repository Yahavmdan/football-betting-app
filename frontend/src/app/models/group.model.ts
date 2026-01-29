export interface Group {
  _id: string;
  name: string;
  description?: string;
  betType: 'classic' | 'relative';
  startingCredits: number;
  creditsGoal: number;
  showBets: boolean;
  matchType: 'manual' | 'automatic';
  selectedLeague?: string;
  selectedSeason?: number;
  creator: any;
  members: GroupMember[];
  pendingMembers: PendingMember[];
  inviteCode: string;
  createdAt: Date;
  isPending?: boolean;
}

export interface TrashTalk {
  message: string | null;
  teamLogo: string | null;
  bgColor: string | null;
  textColor: string | null;
  updatedAt: Date | null;
}

export interface GroupMember {
  user: {
    _id: string;
    username: string;
    email: string;
    profilePicture?: string | null;
    lastActive?: Date;
  };
  joinedAt: Date;
  points: number;
  hasOngoingBets?: boolean;
  trashTalk?: TrashTalk;
}

export interface PendingMember {
  user: {
    _id: string;
    username: string;
    email: string;
    profilePicture?: string | null;
    lastActive?: Date;
  };
  requestedAt: Date;
}

export interface CreateGroupData {
  name: string;
  description?: string;
  betType?: 'classic' | 'relative';
  startingCredits?: number;
  creditsGoal?: number;
  showBets?: boolean;
  matchType?: 'manual' | 'automatic';
  selectedLeague?: string;
  selectedSeason?: number;
}

export interface JoinGroupData {
  inviteCode: string;
}
