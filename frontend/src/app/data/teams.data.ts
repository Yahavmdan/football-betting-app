export interface Team {
    id: number;
    name: string;
    nameEn: string;
    nameHe: string;
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
            {
                id: 1,
                name: 'מכבי תל אביב',
                nameEn: 'Maccabi Tel Aviv',
                nameHe: 'מכבי תל אביב',
                logo: 'assets/team-logos/1.png'
            },
            {id: 2, name: 'מכבי חיפה', nameEn: 'Maccabi Haifa', nameHe: 'מכבי חיפה', logo: 'assets/team-logos/2.png'},
            {
                id: 3,
                name: 'הפועל באר שבע',
                nameEn: 'Hapoel Beer Sheva',
                nameHe: 'הפועל באר שבע',
                logo: 'assets/team-logos/3.png'
            },
            {
                id: 4,
                name: 'בית"ר ירושלים',
                nameEn: 'Beitar Jerusalem',
                nameHe: 'בית"ר ירושלים',
                logo: 'assets/team-logos/4.png'
            },
            {
                id: 5,
                name: 'הפועל תל אביב',
                nameEn: 'Hapoel Tel Aviv',
                nameHe: 'הפועל תל אביב',
                logo: 'assets/team-logos/5.png'
            },
            {
                id: 6,
                name: 'מכבי נתניה',
                nameEn: 'Maccabi Netanya',
                nameHe: 'מכבי נתניה',
                logo: 'assets/team-logos/6.png'
            },
            {id: 7, name: 'בני סכנין', nameEn: 'Bnei Sakhnin', nameHe: 'בני סכנין', logo: 'assets/team-logos/7.png'},
            {id: 8, name: 'הפועל חיפה', nameEn: 'Hapoel Haifa', nameHe: 'הפועל חיפה', logo: 'assets/team-logos/8.png'},
            {id: 9, name: 'מ.ס אשדוד', nameEn: 'Ashdod', nameHe: 'מ.ס אשדוד', logo: 'assets/team-logos/9.png'},
            {
                id: 10,
                name: 'הפועל ירושלים',
                nameEn: 'Hapoel Katamon',
                nameHe: 'הפועל ירושלים',
                logo: 'assets/team-logos/10.png'
            },
            {
                id: 11,
                name: 'מכבי בני ריינה',
                nameEn: 'Maccabi Bnei Raina',
                nameHe: 'מכבי בני ריינה',
                logo: 'assets/team-logos/11.png'
            },
            {
                id: 12,
                name: 'עירוני טבריה',
                nameEn: 'Ironi Tiberias',
                nameHe: 'עירוני טבריה',
                logo: 'assets/team-logos/12.png'
            },
            {
                id: 13,
                name: 'הפועל פתח תקווה',
                nameEn: 'Hapoel Petah Tikva',
                nameHe: 'הפועל פתח תקווה',
                logo: 'assets/team-logos/13.png'
            },
            {
                id: 14,
                name: 'עירוני קריית שמונה',
                nameEn: 'Ironi Kiryat Shmona',
                nameHe: 'עירוני קריית שמונה',
                logo: 'assets/team-logos/14.png'
            }
        ]
    },
    {
        name: 'Israeli National League',
        nameHe: 'הליגה הלאומית',
        teams: [
            {
                id: 15,
                name: 'בני יהודה',
                nameEn: 'Bnei Yehuda',
                nameHe: 'בני יהודה',
                logo: 'assets/team-logos/15.png'
            },
            {
                id: 16,
                name: 'הפועל ראשון לציון',
                nameEn: 'Hapoel Rishon LeZion',
                nameHe: 'הפועל ראשון לציון',
                logo: 'assets/team-logos/16.png'
            },
            {
                id: 17,
                name: 'הפועל כפר סבא',
                nameEn: 'Hapoel Kfar Saba',
                nameHe: 'הפועל כפר סבא',
                logo: 'assets/team-logos/17.png'
            },
            {id: 18, name: 'הפועל עכו', nameEn: 'Hapoel Acre', nameHe: 'הפועל עכו', logo: 'assets/team-logos/18.png'},
            {
                id: 19,
                name: 'הפועל נוף הגליל',
                nameEn: 'Hapoel Nazareth Illit',
                nameHe: 'הפועל נוף הגליל',
                logo: 'assets/team-logos/19.png'
            },
            {
                id: 20,
                name: 'מכבי הרצליה',
                nameEn: 'Maccabi Herzliya',
                nameHe: 'מכבי הרצליה',
                logo: 'assets/team-logos/20.png'
            },
            {
                id: 21,
                name: 'הפועל רעננה',
                nameEn: 'Hapoel Ra\'anana',
                nameHe: 'הפועל רעננה',
                logo: 'assets/team-logos/21.png'
            },
            {
                id: 22,
                name: 'מכבי קביליו יפו',
                nameEn: 'Maccabi Kabilio Jaffa',
                nameHe: 'מכבי קביליו יפו',
                logo: 'assets/team-logos/22.png'
            },
            {
                id: 23,
                name: 'הפועל עפולה',
                nameEn: 'Hapoel Afula',
                nameHe: 'הפועל עפולה',
                logo: 'assets/team-logos/23.png'
            },
            {
                id: 24,
                name: 'עירוני מודיעין',
                nameEn: 'Ironi Modi\'in',
                nameHe: 'עירוני מודיעין',
                logo: 'assets/team-logos/24.png'
            },
            {
                id: 25,
                name: 'מ.ס קרית ים',
                nameEn: 'Kiryat Yam SC',
                nameHe: 'מ.ס קרית ים',
                logo: 'assets/team-logos/25.png'
            },
            {
                id: 26,
                name: 'הפועל רמת גן גבעתיים',
                nameEn: 'Hapoel Ramat Gan',
                nameHe: 'הפועל רמת גן גבעתיים',
                logo: 'assets/team-logos/26.png'
            },
            {
                id: 30,
                name: 'מכבי פתח תקווה',
                nameEn: 'Maccabi Petah Tikva',
                nameHe: 'מכבי פתח תקווה',
                logo: 'assets/team-logos/30.png'
            },
            {id: 31, name: "מ.ס כפר קאסם", nameEn: "Kafr Qasim", nameHe: "מ.ס כפר קאסם", logo: "assets/team-logos/31.png"},
            {id: 33, name: "הפועל כפר שלם", nameEn: "Hapoel Kfar Shalem", nameHe: "הפועל כפר שלם", logo: "assets/team-logos/33.png"},
            {id: 32, name: "הפועל חדרה", nameEn: "Hapoel Hadera", nameHe: "הפועל חדרה", logo: "assets/team-logos/32.png"},
        ]
    }
];

// Helper function to get all teams as a flat array
export function getAllTeams(): Team[] {
    return ISRAELI_LEAGUES.flatMap(league => league.teams);
}

// Helper function to get team by name (searches in both Hebrew and English names)
export function getTeamByName(name: string): Team | undefined {
    return getAllTeams().find(team =>
        team.name === name ||
        team.nameEn === name ||
        team.nameHe === name
    );
}

// Helper function to get translated team name based on language
export function getTranslatedTeamName(teamName: string, language: string): string {
    const team = getTeamByName(teamName);
    if (!team) {
        return teamName; // Return original if team not found
    }
    return language === 'he' ? team.nameHe : team.nameEn;
}
