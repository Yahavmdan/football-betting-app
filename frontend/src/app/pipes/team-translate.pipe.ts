import { Pipe, PipeTransform } from '@angular/core';
import { getTranslatedTeamName } from '../data/teams.data';
import { TranslationService } from '../services/translation.service';

@Pipe({
  name: 'teamTranslate',
  standalone: true,
  pure: false
})
export class TeamTranslatePipe implements PipeTransform {
  constructor(private translationService: TranslationService) {}

  transform(teamName: string): string {
    if (!teamName) {
      return teamName;
    }
    const currentLang = this.translationService.getCurrentLanguage();
    return getTranslatedTeamName(teamName, currentLang);
  }
}
