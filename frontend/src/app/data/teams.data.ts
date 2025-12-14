export interface Team {
  id: number;
  name: string;
  logo: string;
}

export interface League {
  name: string;
  nameHe: string;
  teams: Team[];
}

export const ISRAELI_LEAGUES: League[] = [
  {
    name: 'Israeli Premier League',
    nameHe: 'ליגת העל',
    teams: [
      { id: 1, name: 'מכבי תל אביב', logo: 'assets/team-logos/1.png' },
      { id: 2, name: 'מכבי חיפה', logo: 'assets/team-logos/2.png' },
      { id: 3, name: 'הפועל באר שבע', logo: 'assets/team-logos/3.png' },
      { id: 4, name: 'בית"ר ירושלים', logo: 'assets/team-logos/4.png' },
      { id: 5, name: 'הפועל תל אביב', logo: 'assets/team-logos/5.png' },
      { id: 6, name: 'מכבי נתניה', logo: 'assets/team-logos/6.png' },
      { id: 7, name: 'בני סכנין', logo: 'assets/team-logos/7.png' },
      { id: 8, name: 'הפועל חיפה', logo: 'assets/team-logos/8.png' },
      { id: 9, name: 'מ.ס אשדוד', logo: 'assets/team-logos/9.png' },
      { id: 10, name: 'הפועל ירושלים', logo: 'assets/team-logos/10.png' },
      { id: 11, name: 'מכבי בני ריינה', logo: 'assets/team-logos/11.png' },
      { id: 12, name: 'עירוני טבריה', logo: 'assets/team-logos/12.png' },
      { id: 13, name: 'הפועל פתח תקווה', logo: 'assets/team-logos/13.png' },
      { id: 14, name: 'עירוני קריית שמונה', logo: 'assets/team-logos/14.png' }
    ]
  },
  {
    name: 'Israeli National League',
    nameHe: 'הליגה הלאומית',
    teams: [
      { id: 15, name: 'בני יהודה תל אביב', logo: 'assets/team-logos/15.png' },
      { id: 16, name: 'הפועל ראשון לציון', logo: 'assets/team-logos/16.png' },
      { id: 17, name: 'הפועל כפר סבא', logo: 'assets/team-logos/17.png' },
      { id: 18, name: 'הפועל עכו', logo: 'assets/team-logos/18.png' },
      { id: 19, name: 'הפועל נוף הגליל', logo: 'assets/team-logos/19.png' },
      { id: 20, name: 'מכבי הרצליה', logo: 'assets/team-logos/20.png' },
      { id: 21, name: 'הפועל רעננה', logo: 'assets/team-logos/21.png' },
      { id: 22, name: 'מכבי קביליו יפו', logo: 'assets/team-logos/22.png' },
      { id: 23, name: 'הפועל עפולה', logo: 'assets/team-logos/23.png' },
      { id: 24, name: 'עירוני מודיעין', logo: 'assets/team-logos/24.png' },
      { id: 25, name: 'מ.ס קרית ים', logo: 'assets/team-logos/25.png' },
      { id: 26, name: 'הפועל רמת גן גבעתיים', logo: 'assets/team-logos/26.png' },
      { id: 27, name: 'סקציה נס ציונה', logo: 'assets/team-logos/27.png' },
      { id: 28, name: 'א.ס אשדוד', logo: 'assets/team-logos/28.png' },
      { id: 29, name: 'הפועל אום אל פאחם', logo: 'assets/team-logos/29.png' },
      { id: 30, name: 'מכבי פתח תקווה', logo: 'assets/team-logos/30.png' }
    ]
  }
];

// Helper function to get all teams as a flat array
export function getAllTeams(): Team[] {
  return ISRAELI_LEAGUES.flatMap(league => league.teams);
}

// Helper function to get team by name
export function getTeamByName(name: string): Team | undefined {
  return getAllTeams().find(team => team.name === name);
}
