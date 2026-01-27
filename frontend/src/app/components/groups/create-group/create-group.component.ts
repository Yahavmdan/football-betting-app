import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {GroupService} from '../../../services/group.service';
import {MatchService} from '../../../services/match.service';
import {CreateGroupData} from '../../../models/group.model';
import {League} from '../../../models/league.model';
import {TranslatePipe} from '../../../services/translate.pipe';
import {TranslationService} from '../../../services/translation.service';
import {AppToggleComponent} from '../../shared/app-toggle/app-toggle.component';
import {AppSelectComponent, SelectGroup} from '../../shared/app-select/app-select.component';

@Component({
    selector: 'app-create-group',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslatePipe, AppToggleComponent, AppSelectComponent],
    templateUrl: './create-group.component.html',
    styleUrls: ['./create-group.component.css']
})
export class CreateGroupComponent implements OnInit {
    groupData: CreateGroupData = {
        name: '',
        description: '',
        betType: 'classic',
        startingCredits: 100,
        creditsGoal: 10000,
        showBets: true,
        matchType: 'manual',
        selectedLeague: undefined
    };
    errorMessage = '';
    loading = false;
    leagues: League[] = [];
    leagueGroups: SelectGroup[] = [];
    loadingLeagues = false;

    constructor(
        private groupService: GroupService,
        private matchService: MatchService,
        private router: Router,
        private translationService: TranslationService
    ) {
    }

    ngOnInit(): void {
        this.loadLeagues();
    }

    loadLeagues(): void {
        this.loadingLeagues = true;
        this.matchService.getAvailableLeagues().subscribe({
            next: (response) => {
                this.leagues = response.data;
                this.buildLeagueGroups();
                this.loadingLeagues = false;
            },
            error: (error) => {
                console.error('Failed to load leagues:', error);
                this.loadingLeagues = false;
            }
        });
    }

    buildLeagueGroups(): void {
        // Group leagues by category
        const israeli = this.leagues.filter(l => l.country === 'Israel');
        const european = this.leagues.filter(l => ['England', 'Spain', 'Italy', 'Germany', 'France'].includes(l.country));
        const tournaments = this.leagues.filter(l => ['Europe', 'World'].includes(l.country));

        this.leagueGroups = [
            {
                name: 'Israeli Leagues',
                nameHe: 'ליגות ישראליות',
                options: israeli.map(l => ({
                    value: l.id,
                    label: l.name,
                    labelHe: l.nameHe,
                    image: l.logo
                }))
            },
            {
                name: 'European Leagues',
                nameHe: 'ליגות אירופאיות',
                options: european.map(l => ({
                    value: l.id,
                    label: l.name,
                    labelHe: l.nameHe,
                    image: l.logo
                }))
            },
            {
                name: 'Tournaments',
                nameHe: 'טורנירים',
                options: tournaments.map(l => ({
                    value: l.id,
                    label: l.name,
                    labelHe: l.nameHe,
                    image: l.logo
                }))
            }
        ].filter(group => group.options.length > 0);
    }

    selectBetType(type: 'classic' | 'relative'): void {
        this.groupData.betType = type;
        // Reset starting credits and goal to defaults when switching
        if (type === 'relative') {
            if (!this.groupData.startingCredits) {
                this.groupData.startingCredits = 100;
            }
            if (!this.groupData.creditsGoal) {
                this.groupData.creditsGoal = 10000;
            }
        }
    }

    selectMatchType(type: 'manual' | 'automatic'): void {
        this.groupData.matchType = type;
        // Clear selectedLeague when switching to manual
        if (type === 'manual') {
            this.groupData.selectedLeague = undefined;
        }
    }

    isFormValid(): boolean {
        if (!this.groupData.name) return false;
        if (this.groupData.matchType === 'automatic' && !this.groupData.selectedLeague) return false;
        return true;
    }

    onSubmit(): void {
        this.loading = true;
        this.errorMessage = '';

        this.groupService.createGroup(this.groupData).subscribe({
            next: (response) => {
                const groupId = response.data._id;

                // If automatic group, sync matches before navigating
                if (this.groupData.matchType === 'automatic') {
                    this.matchService.syncLeagueToGroup(groupId).subscribe({
                        next: () => {
                            void this.router.navigate(['/groups', groupId]);
                        },
                        error: () => {
                            // Even if sync fails, navigate to the group
                            void this.router.navigate(['/groups', groupId]);
                        }
                    });
                } else {
                    void this.router.navigate(['/groups', groupId]);
                }
            },
            error: (error) => {
                this.errorMessage = error.error?.message || this.translationService.translate('groups.createFailed');
                this.loading = false;
            }
        });
    }

    goBack(): void {
        void this.router.navigate(['/groups']);
    }
}
