import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatchService, PersonalizedMatch } from '../../services/match.service';
import { PreferencesService } from '../../services/preferences.service';
import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../services/translate.pipe';
import { MatchEvent, MatchLineup, MatchTeamStatistics } from '../../models/match.model';
import { User } from '../../models/user.model';
import { getTeamByName } from '../../data/teams.data';
import { MatchCardComponent } from '../shared/match-card/match-card.component';

interface LeagueGroup {
    league: {
        id: string;
        name: string;
        logo: string | null;
    };
    matches: PersonalizedMatch[];
    isCollapsed: boolean;
}

interface ProcessedEvent {
    isMarker?: boolean;
    markerType?: 'HT' | 'FT' | 'KO';
    label?: string;
    event?: MatchEvent;
}

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, RouterModule, TranslatePipe, MatchCardComponent],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
    readonly matchCardContext = this;
    currentUser: User | null = null;
    loading = true;
    hasPreferences = false;
    // Matches
    allMatches: PersonalizedMatch[] = [];
    liveMatches: PersonalizedMatch[] = [];
    leagueGroups: LeagueGroup[] = [];

    // Expanded match state
    expandedMatchId: string | null = null;
    activeMatchTab: 'events' | 'lineups' | 'statistics' = 'events';

    // Match events
    matchEvents: MatchEvent[] = [];
    processedEvents: ProcessedEvent[] = [];
    loadingMatchEvents = false;

    // Match lineups
    matchLineups: MatchLineup[] = [];
    loadingMatchLineups = false;

    // Match statistics
    matchStatistics: MatchTeamStatistics[] = [];
    loadingMatchStatistics = false;

    // Head to Head
    headToHeadMatches: any[] = [];
    loadingHeadToHead = false;
    showHeadToHead = false;

    // Team Form
    homeTeamRecentMatches: any[] = [];
    awayTeamRecentMatches: any[] = [];
    loadingTeamForm = false;
    showTeamForm = false;

    // Current expanded match reference
    currentExpandedMatch: PersonalizedMatch | null = null;

    // Auto-refresh
    private refreshInterval: ReturnType<typeof setInterval> | null = null;
    private readonly REFRESH_INTERVAL_MS = 60000; // 1 minute

    constructor(
        private matchService: MatchService,
        private preferencesService: PreferencesService,
        private authService: AuthService,
        public translationService: TranslationService
    ) {
    }

    ngOnInit(): void {
        this.authService.currentUser$.subscribe(user => {
            this.currentUser = user;
            if (user) {
                this.loadPersonalizedMatches();
                this.startAutoRefresh();
            }
        });
    }

    ngOnDestroy(): void {
        this.stopAutoRefresh();
    }

    loadPersonalizedMatches(silent: boolean = false): void {
        if (!silent) {
            this.loading = true;
        }
        this.matchService.getPersonalizedMatches(silent).subscribe({
            next: (response) => {
                this.hasPreferences = response.data.hasPreferences;
                this.allMatches = response.data.matches;
                this.liveMatches = response.data.liveMatches || [];

                // Convert grouped data to array and sort by league name
                // Preserve collapsed state when refreshing
                const previousCollapsedState = new Map(
                    this.leagueGroups.map(g => [g.league.id, g.isCollapsed])
                );

                this.leagueGroups = Object.entries(response.data.groupedByLeague)
                    .map(([leagueId, data]) => ({
                        league: data.league,
                        matches: data.matches,
                        isCollapsed: previousCollapsedState.get(data.league.id) ?? false
                    }))
                    .sort((a, b) => a.league.name.localeCompare(b.league.name));

                // Re-fetch details for the currently expanded match during silent refresh
                if (silent && this.expandedMatchId) {
                    this.refreshExpandedMatchDetails();
                }

                if (!silent) {
                    this.loading = false;
                }
            },
            error: (error) => {
                console.error('Failed to load personalized matches:', error);
                if (!silent) {
                    this.loading = false;
                }
            }
        });
    }

    /** Re-fetch events/lineups/statistics for the currently expanded match */
    private refreshExpandedMatchDetails(): void {
        if (!this.expandedMatchId) return;

        // Always refresh events (most important for live matches)
        if (this.activeMatchTab === 'events' || this.matchEvents.length > 0) {
            this.loadMatchEvents(this.expandedMatchId, true);
        }
        // Also refresh the active tab data
        if (this.activeMatchTab === 'lineups' && this.matchLineups.length > 0) {
            this.loadMatchLineups(this.expandedMatchId, true);
        }
        if (this.activeMatchTab === 'statistics' && this.matchStatistics.length > 0) {
            this.loadMatchStatistics(this.expandedMatchId, true);
        }
    }

    toggleLeagueCollapse(leagueGroup: LeagueGroup): void {
        leagueGroup.isCollapsed = !leagueGroup.isCollapsed;
    }

    toggleMatchExpand(match: PersonalizedMatch): void {
        if (this.expandedMatchId === match.externalApiId) {
            this.expandedMatchId = null;
            this.currentExpandedMatch = null;
            this.resetExpandedState();
        } else {
            // Reset state when switching to a different match
            this.resetExpandedState();
            this.expandedMatchId = match.externalApiId;
            this.currentExpandedMatch = match;
            this.activeMatchTab = 'events';
            this.showHeadToHead = false;
            this.showTeamForm = false;
            this.loadMatchEvents(match.externalApiId);
            // Load H2H and team form
            if (match.homeTeam && match.awayTeam) {
                this.loadHeadToHead(match.homeTeam, match.awayTeam, match.homeTeamId, match.awayTeamId);
                this.loadTeamForm(match.homeTeam, match.awayTeam, match.homeTeamId, match.awayTeamId);
            }
        }
    }

    private resetExpandedState(): void {
        this.matchEvents = [];
        this.processedEvents = [];
        this.matchLineups = [];
        this.matchStatistics = [];
        this.headToHeadMatches = [];
        this.homeTeamRecentMatches = [];
        this.awayTeamRecentMatches = [];
    }

    selectMatchTab(tab: 'events' | 'lineups' | 'statistics'): void {
        this.activeMatchTab = tab;
        if (this.expandedMatchId) {
            if (tab === 'events' && this.matchEvents.length === 0) {
                this.loadMatchEvents(this.expandedMatchId);
            } else if (tab === 'lineups' && this.matchLineups.length === 0) {
                this.loadMatchLineups(this.expandedMatchId);
            } else if (tab === 'statistics' && this.matchStatistics.length === 0) {
                this.loadMatchStatistics(this.expandedMatchId);
            }
        }
    }

    loadMatchEvents(matchId: string, silent: boolean = false): void {
        if (!silent) this.loadingMatchEvents = true;
        this.matchService.getMatchEvents(matchId).subscribe({
            next: (response) => {
                this.matchEvents = response.data || [];
                this.processedEvents = this.processEvents(this.matchEvents);
                this.loadingMatchEvents = false;
            },
            error: (error) => {
                console.error('Failed to load match events:', error);
                this.loadingMatchEvents = false;
            }
        });
    }

    loadMatchLineups(matchId: string, silent: boolean = false): void {
        if (!silent) this.loadingMatchLineups = true;
        this.matchService.getMatchLineups(matchId).subscribe({
            next: (response) => {
                this.matchLineups = response.data || [];
                this.loadingMatchLineups = false;
            },
            error: (error) => {
                console.error('Failed to load match lineups:', error);
                this.loadingMatchLineups = false;
            }
        });
    }

    loadMatchStatistics(matchId: string, silent: boolean = false): void {
        if (!silent) this.loadingMatchStatistics = true;
        this.matchService.getMatchStatistics(matchId).subscribe({
            next: (response) => {
                this.matchStatistics = response.data || [];
                this.loadingMatchStatistics = false;
            },
            error: (error) => {
                console.error('Failed to load match statistics:', error);
                this.loadingMatchStatistics = false;
            }
        });
    }

    loadHeadToHead(homeTeam: string, awayTeam: string, homeTeamId?: number, awayTeamId?: number): void {
        this.loadingHeadToHead = true;
        this.matchService.getHeadToHead(homeTeam, awayTeam, homeTeamId, awayTeamId).subscribe({
            next: (response) => {
                this.headToHeadMatches = response.data || [];
                this.loadingHeadToHead = false;
            },
            error: (error) => {
                console.error('Failed to load H2H:', error);
                this.loadingHeadToHead = false;
            }
        });
    }

    loadTeamForm(homeTeam: string, awayTeam: string, homeTeamId?: number, awayTeamId?: number): void {
        this.loadingTeamForm = true;
        this.matchService.getTeamRecentMatches(homeTeam, homeTeamId).subscribe({
            next: (response) => {
                this.homeTeamRecentMatches = response.data || [];
            },
            error: (error) => {
                console.error('Failed to load home team form:', error);
            }
        });
        this.matchService.getTeamRecentMatches(awayTeam, awayTeamId).subscribe({
            next: (response) => {
                this.awayTeamRecentMatches = response.data || [];
                this.loadingTeamForm = false;
            },
            error: (error) => {
                console.error('Failed to load away team form:', error);
                this.loadingTeamForm = false;
            }
        });
    }

    toggleHeadToHead(): void {
        this.showHeadToHead = !this.showHeadToHead;
    }

    toggleTeamForm(): void {
        this.showTeamForm = !this.showTeamForm;
    }

    processEvents(events: MatchEvent[]): ProcessedEvent[] {
        if (!events || events.length === 0) return [];

        // Sort events by time in reverse (latest first for display)
        const sortedEvents = [...events].sort((a, b) => {
            const timeA = a.time.elapsed + (a.time.extra || 0);
            const timeB = b.time.elapsed + (b.time.extra || 0);
            return timeB - timeA;
        });

        const processed: ProcessedEvent[] = [];
        let addedHT = false;
        let addedFT = false;

        for (const event of sortedEvents) {
            const totalTime = event.time.elapsed + (event.time.extra || 0);

            // Add FT marker before first event after 90
            if (totalTime > 90 && !addedFT) {
                processed.push({ isMarker: true, markerType: 'FT', label: "90'" });
                addedFT = true;
            }

            // Add HT marker before first event after 45
            if (totalTime > 45 && totalTime <= 90 && !addedHT) {
                processed.push({ isMarker: true, markerType: 'HT', label: "45'" });
                addedHT = true;
            }

            processed.push({ event });
        }

        // Add kickoff marker at the end
        processed.push({ isMarker: true, markerType: 'KO', label: "0'" });

        return processed;
    }

    getTeamResult(match: any, teamName: string): string {
        const homeScore = match.result?.homeScore ?? 0;
        const awayScore = match.result?.awayScore ?? 0;
        const isHome = match.homeTeam === teamName;

        if (homeScore === awayScore) return 'D';
        if (isHome) {
            return homeScore > awayScore ? 'W' : 'L';
        } else {
            return awayScore > homeScore ? 'W' : 'L';
        }
    }

    getStatValue(stats: MatchTeamStatistics[], teamIndex: number, statType: string): string {
        const teamStats = stats[teamIndex]?.statistics || [];
        const stat = teamStats.find(s => s.type === statType);
        return stat?.value?.toString() || '0';
    }

    getStatPercentage(stats: MatchTeamStatistics[], teamIndex: number, statType: string): number {
        const homeValue = this.parseStatValue(this.getStatValue(stats, 0, statType));
        const awayValue = this.parseStatValue(this.getStatValue(stats, 1, statType));
        const total = homeValue + awayValue;
        if (total === 0) return 50;
        return teamIndex === 0 ? (homeValue / total) * 100 : (awayValue / total) * 100;
    }

    shouldShowStat(stats: MatchTeamStatistics[], statType: string): boolean {
        const homeValue = this.parseStatValue(this.getStatValue(stats, 0, statType));
        const awayValue = this.parseStatValue(this.getStatValue(stats, 1, statType));
        return homeValue !== 0 || awayValue !== 0;
    }

    private parseStatValue(value: string): number {
        const num = parseFloat(value.replace('%', ''));
        return isNaN(num) ? 0 : num;
    }

    translateStatName(statType: string): string {
        const translations: { [key: string]: { en: string; he: string } } = {
            'Shots on Goal': { en: 'Shots on Goal', he: 'בעיטות למסגרת' },
            'Shots off Goal': { en: 'Shots off Goal', he: 'בעיטות מחוץ למסגרת' },
            'Total Shots': { en: 'Total Shots', he: 'סה"כ בעיטות' },
            'Blocked Shots': { en: 'Blocked Shots', he: 'בעיטות חסומות' },
            'Shots insidebox': { en: 'Shots Inside Box', he: 'בעיטות מתוך הרחבה' },
            'Shots outsidebox': { en: 'Shots Outside Box', he: 'בעיטות מחוץ לרחבה' },
            'Fouls': { en: 'Fouls', he: 'עבירות' },
            'Corner Kicks': { en: 'Corner Kicks', he: 'קרנות' },
            'Offsides': { en: 'Offsides', he: 'נבדלים' },
            'Ball Possession': { en: 'Ball Possession', he: 'אחזקת כדור' },
            'Yellow Cards': { en: 'Yellow Cards', he: 'כרטיסים צהובים' },
            'Red Cards': { en: 'Red Cards', he: 'כרטיסים אדומים' },
            'Goalkeeper Saves': { en: 'Goalkeeper Saves', he: 'הצלות שוער' },
            'Total passes': { en: 'Total Passes', he: 'סה"כ מסירות' },
            'Passes accurate': { en: 'Accurate Passes', he: 'מסירות מדויקות' },
            'Passes %': { en: 'Pass Accuracy', he: 'דיוק מסירות' },
            'expected_goals': { en: 'Expected Goals', he: 'גולים צפויים' },
            'goals_prevented': { en: 'Goals Prevented', he: 'שערים שנמנעו' }
        };

        const lang = this.translationService.getCurrentLanguage();
        // @ts-ignore
        return translations[statType]?.[lang] || statType;
    }

    // Lineup helper methods
    getPlayerRow(grid: string | null | undefined, teamIndex: number): number {
        if (!grid) return 1;
        const [row] = grid.split(':').map(Number);
        // No inversion needed - CSS handles direction via top/bottom positioning
        // Row 1 = GK (near own goal), Row 5 = forwards (toward center)
        return row;
    }

    getPlayerCol(grid: string | null | undefined): number {
        if (!grid) return 1;
        const [, col] = grid.split(':').map(Number);
        return col;
    }

    getRowPlayerCount(players: any[], grid: string | null | undefined): number {
        if (!grid) return 1;
        const [row] = grid.split(':').map(Number);
        return players.filter(p => p.grid?.startsWith(row + ':')).length;
    }

    getShortName(fullName: string): string {
        if (!fullName) return '';
        const parts = fullName.split(' ');
        if (parts.length === 1) return fullName;
        return parts[parts.length - 1];
    }

    isMatchInPast(matchDate: string): boolean {
        return new Date(matchDate) < new Date();
    }

    hasFavoriteTeam(match: PersonalizedMatch): boolean {
        const favoriteTeams = this.currentUser?.settings?.favoriteTeams;
        if (!favoriteTeams || favoriteTeams.length === 0) return false;

        return favoriteTeams.some(fav =>
            fav.teamId === match.homeTeamId || fav.teamId === match.awayTeamId
        );
    }

    getTeamLogo(teamName: string, match: PersonalizedMatch): string | null {
        // Always prefer local logo if available
        const localTeam = getTeamByName(teamName);
        if (localTeam) return localTeam.logo;

        // Fall back to API logo from match data
        if (match.homeTeam === teamName && match.homeTeamLogo) {
            return match.homeTeamLogo;
        }
        if (match.awayTeam === teamName && match.awayTeamLogo) {
            return match.awayTeamLogo;
        }
        return null;
    }

    onImageError(event: Event): void {
        (event.target as HTMLImageElement).style.display = 'none';
    }

    getProfilePictureUrl(path: string): string {
        if (!path) return '';
        return path;
    }

    formatMatchDate(dateStr: string): string {
        const date = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const isToday = date.toDateString() === today.toDateString();
        const isTomorrow = date.toDateString() === tomorrow.toDateString();
        const isYesterday = date.toDateString() === yesterday.toDateString();

        const timeStr = date.toLocaleTimeString(this.translationService.getCurrentLanguage() === 'he' ? 'he-IL' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        if (isToday) {
            return `${this.translationService.translate('common.today')} ${timeStr}`;
        } else if (isTomorrow) {
            return `${this.translationService.translate('common.tomorrow')} ${timeStr}`;
        } else if (isYesterday) {
            return `${this.translationService.translate('common.yesterday')} ${timeStr}`;
        }

        return date.toLocaleDateString(this.translationService.getCurrentLanguage() === 'he' ? 'he-IL' : 'en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    private startAutoRefresh(): void {
        if (this.refreshInterval) return;

        this.refreshInterval = setInterval(() => {
            // Only refresh if there are live matches
            if (this.liveMatches.length > 0) {
                // Silent refresh - no loading spinner
                this.loadPersonalizedMatches(true);
            }
        }, this.REFRESH_INTERVAL_MS);
    }

    private stopAutoRefresh(): void {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    refreshMatches(): void {
        this.loadPersonalizedMatches();
    }
}
