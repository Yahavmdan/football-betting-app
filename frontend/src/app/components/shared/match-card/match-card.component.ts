import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../services/translate.pipe';
import { TeamTranslatePipe } from '../../../pipes/team-translate.pipe';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-match-card',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, TeamTranslatePipe],
  templateUrl: './match-card.component.html',
  styleUrls: ['./match-card.component.css']
})
export class MatchCardComponent {
  @Input({ required: true }) match: any;
  @Input({ required: true }) context: any;
  @Input() expandedMatchId: string | null = null;
  @Input() showBettingSection = true;
  @Input() showBetIndicators = true;
  @Input() matchIdField: '_id' | 'externalApiId' = '_id';

  private readonly detailKeyMap: Record<string, string> = {
    'Goal Disallowed': 'matches.eventDetails.goalDisallowed',
    'Goal cancelled': 'matches.eventDetails.goalCancelled',
    'Goal confirmed': 'matches.eventDetails.goalConfirmed',
    'Penalty confirmed': 'matches.eventDetails.penaltyConfirmed',
    'Penalty cancelled': 'matches.eventDetails.penaltyCancelled',
    'Penalty retaken': 'matches.eventDetails.penaltyRetaken',
    'Missed Penalty': 'matches.eventDetails.missedPenalty',
    'Substitution': 'matches.eventDetails.substitution',
    'Yellow Card': 'matches.eventDetails.yellowCard',
    'Red Card': 'matches.eventDetails.redCard',
    'Second Yellow card': 'matches.eventDetails.secondYellowCard',
    'Second Yellow Card': 'matches.eventDetails.secondYellowCard'
  };

  private readonly reasonKeyMap: Record<string, string> = {
    offside: 'matches.eventDetails.reasons.offside',
    handball: 'matches.eventDetails.reasons.handball',
    foul: 'matches.eventDetails.reasons.foul',
    simulation: 'matches.eventDetails.reasons.simulation',
    obstruction: 'matches.eventDetails.reasons.obstruction',
    dangerous: 'matches.eventDetails.reasons.dangerousPlay',
    dangerousplay: 'matches.eventDetails.reasons.dangerousPlay',
    'dangerous play': 'matches.eventDetails.reasons.dangerousPlay',
    no_goal: 'matches.eventDetails.reasons.noGoal',
    nogoal: 'matches.eventDetails.reasons.noGoal',
    'no goal': 'matches.eventDetails.reasons.noGoal'
  };

  constructor(private translationService: TranslationService) {}

  get matchId(): string {
    const preferred = this.match?.[this.matchIdField];
    if (preferred) return preferred;
    return this.match?._id || this.match?.externalApiId || '';
  }

  get isLikelyFinished(): boolean {
    if (!this.match || this.match.status !== 'SCHEDULED') return false;
    const matchTime = new Date(this.match.matchDate).getTime();
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
    return (Date.now() - matchTime) > THREE_HOURS_MS;
  }

  hasKickoffMarker(): boolean {
    const events = this.context?.processedEvents;
    if (!Array.isArray(events)) return false;
    return events.some((item: any) => item?.isMarker && item?.markerType === 'KO');
  }

  translateEventDetail(detail?: string): string {
    if (!detail) return '';

    const cleaned = detail.trim();
    const directKey = this.detailKeyMap[cleaned];
    if (directKey) {
      const translated = this.translationService.translate(directKey);
      return translated !== directKey ? translated : cleaned;
    }

    const disallowedMatch = /^Goal Disallowed\s*-\s*(.+)$/i.exec(cleaned);
    if (disallowedMatch) {
      const reasonRaw = disallowedMatch[1].trim();
      const reasonKey = this.resolveReasonKey(reasonRaw);
      const disallowed = this.translationService.translate('matches.eventDetails.goalDisallowed');
      const reasonTranslated = reasonKey ? this.translationService.translate(reasonKey) : reasonRaw;
      return `${disallowed} - ${reasonTranslated}`;
    }

    const substitutionMatch = /^Substitution\s*(\d+)?$/i.exec(cleaned);
    if (substitutionMatch) {
      const substitution = this.translationService.translate('matches.eventDetails.substitution');
      return substitutionMatch[1] ? `${substitution} ${substitutionMatch[1]}` : substitution;
    }

    return cleaned;
  }

  private resolveReasonKey(reason: string): string | null {
    const normalized = reason.toLowerCase().replace(/[^a-z_ ]/g, '').trim();
    const compact = normalized.replace(/\s+/g, ' ');
    const noSpace = compact.replace(/\s/g, '');
    return this.reasonKeyMap[compact] || this.reasonKeyMap[noSpace] || null;
  }
}
