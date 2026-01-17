import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {GroupService} from '../../../services/group.service';
import {CreateGroupData} from '../../../models/group.model';
import {TranslatePipe} from '../../../services/translate.pipe';
import {TranslationService} from '../../../services/translation.service';
import {AppToggleComponent} from '../../shared/app-toggle/app-toggle.component';

@Component({
    selector: 'app-create-group',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslatePipe, AppToggleComponent],
    templateUrl: './create-group.component.html',
    styleUrls: ['./create-group.component.css']
})
export class CreateGroupComponent {
    groupData: CreateGroupData = {
        name: '',
        description: '',
        betType: 'classic',
        startingCredits: 100,
        creditsGoal: 1000,
        showBets: true
    };
    errorMessage = '';
    loading = false;

    constructor(
        private groupService: GroupService,
        private router: Router,
        private translationService: TranslationService
    ) {
    }

    selectBetType(type: 'classic' | 'relative'): void {
        this.groupData.betType = type;
        // Reset starting credits and goal to defaults when switching
        if (type === 'relative') {
            if (!this.groupData.startingCredits) {
                this.groupData.startingCredits = 100;
            }
            if (!this.groupData.creditsGoal) {
                this.groupData.creditsGoal = 1000;
            }
        }
    }

    onSubmit(): void {
        this.loading = true;
        this.errorMessage = '';

        this.groupService.createGroup(this.groupData).subscribe({
            next: (response) => {
                void this.router.navigate(['/groups', response.data._id]);
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
