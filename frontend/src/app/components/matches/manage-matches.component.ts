import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatchService } from '../../services/match.service';
import { GroupService } from '../../services/group.service';
import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';
import { Match } from '../../models/match.model';
import { Group } from '../../models/group.model';
import { TranslatePipe } from '../../services/translate.pipe';
import { TeamTranslatePipe } from '../../pipes/team-translate.pipe';
import { TeamSelectComponent } from '../shared/team-select.component';
import { getTeamByName } from '../../data/teams.data';

@Component({
  selector: 'app-manage-matches',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, TeamTranslatePipe, TeamSelectComponent],
  template: `
    <div class="container">
      <div class="header">
        <h1>{{ 'matches.manageMatches' | translate }} - {{ group?.name }}</h1>
        <button (click)="goBack()" class="btn-secondary">{{ 'bets.back' | translate }}</button>
      </div>

      <div class="section" *ngIf="canManageGroup()">
        <h2>{{ 'matches.addManually' | translate }}</h2>
        <form (ngSubmit)="createManualMatch()" class="manual-match-form">
          <div class="form-row teams-row">
            <div class="form-group">
              <label for="homeTeam">{{ 'matches.homeTeam' | translate }}</label>
              <app-team-select
                [(ngModel)]="manualMatch.homeTeam"
                name="homeTeam"
                [placeholder]="'matches.selectTeam' | translate">
              </app-team-select>
            </div>
            <div class="form-group">
              <label for="awayTeam">{{ 'matches.awayTeam' | translate }}</label>
              <app-team-select
                [(ngModel)]="manualMatch.awayTeam"
                name="awayTeam"
                [placeholder]="'matches.selectTeam' | translate">
              </app-team-select>
            </div>
          </div>
          <div class="form-row datetime-row">
            <div class="form-group">
              <label for="matchDate">{{ 'matches.matchDate' | translate }}</label>
              <input
                type="date"
                id="matchDate"
                [(ngModel)]="manualMatch.matchDate"
                name="matchDate"
                class="form-control"
                required>
            </div>
            <div class="form-group">
              <label for="matchHour">{{ 'matches.matchTime' | translate }}</label>
              <input
                type="time"
                id="matchHour"
                [(ngModel)]="manualMatch.matchHour"
                name="matchHour"
                class="form-control"
                required>
            </div>
          </div>
          <div *ngIf="isPastMatch()" class="past-match-notice">
            {{ 'matches.pastMatchNotice' | translate }}
          </div>
          <div *ngIf="isPastMatch()" class="form-row score-row">
            <div class="form-group">
              <label for="homeScore">{{ 'matches.homeScore' | translate }}</label>
              <input
                type="number"
                id="homeScore"
                [(ngModel)]="manualMatch.homeScore"
                name="homeScore"
                class="form-control score-input"
                min="0"
                required>
            </div>
            <div class="form-group">
              <label for="awayScore">{{ 'matches.awayScore' | translate }}</label>
              <input
                type="number"
                id="awayScore"
                [(ngModel)]="manualMatch.awayScore"
                name="awayScore"
                class="form-control score-input"
                min="0"
                required>
            </div>
          </div>
          <div *ngIf="group?.betType === 'relative'" class="relative-points-section">
            <h3>{{ 'matches.relativePoints' | translate }}</h3>
            <p class="points-description">{{ 'groups.betTypeRelativeDesc' | translate }}</p>
            <div class="form-row">
              <div class="form-group">
                <label for="homeWinPoints">{{ 'matches.homeWinPoints' | translate }}</label>
                <input
                  type="number"
                  id="homeWinPoints"
                  [(ngModel)]="manualMatch.relativePoints.homeWin"
                  name="homeWinPoints"
                  class="form-control score-input"
                  min="0.1"
                  step="0.1"
                  [placeholder]="'matches.pointsForHomeWin' | translate"
                  required>
              </div>
              <div class="form-group">
                <label for="drawPoints">{{ 'matches.drawPoints' | translate }}</label>
                <input
                  type="number"
                  id="drawPoints"
                  [(ngModel)]="manualMatch.relativePoints.draw"
                  name="drawPoints"
                  class="form-control score-input"
                  min="0.1"
                  step="0.1"
                  [placeholder]="'matches.pointsForDraw' | translate"
                  required>
              </div>
              <div class="form-group">
                <label for="awayWinPoints">{{ 'matches.awayWinPoints' | translate }}</label>
                <input
                  type="number"
                  id="awayWinPoints"
                  [(ngModel)]="manualMatch.relativePoints.awayWin"
                  name="awayWinPoints"
                  class="form-control score-input"
                  min="0.1"
                  step="0.1"
                  [placeholder]="'matches.pointsForAwayWin' | translate"
                  required>
              </div>
            </div>
          </div>
          <button
            type="submit"
            class="btn-primary"
            [disabled]="loadingManual || !isFormValid()">
            {{ loadingManual ? ('matches.creatingMatch' | translate) : ('matches.createMatch' | translate) }}
          </button>
          <div *ngIf="manualMatchMessage" class="info-message" style="margin-top: 1rem;">{{ manualMatchMessage }}</div>
          <div *ngIf="manualMatchError" class="error-message" style="margin-top: 1rem;">{{ manualMatchError }}</div>
        </form>
      </div>

      <div class="section">
        <h2>{{ 'matches.matchesInGroup' | translate }}</h2>
        <div *ngIf="loadingGroupMatches" class="loading">{{ 'auth.loading' | translate }}</div>
        <div *ngIf="!loadingGroupMatches && groupMatches.length === 0" class="empty-state">
          {{ 'matches.noMatchesInGroup' | translate }}
        </div>
        <div class="matches-grid">
          <div *ngFor="let match of groupMatches" class="match-card active">
            <div class="match-header">
              <span class="competition">{{ match.competition }}</span>
              <span class="status" [class.finished]="match.status === 'FINISHED'">
                {{ 'matches.' + match.status.toLowerCase() | translate }}
              </span>
            </div>
            <div class="match-teams">
              <div class="team team-home">
                <span>{{ match.homeTeam | teamTranslate }}</span>
                <img *ngIf="getTeamLogo(match.homeTeam)" [src]="getTeamLogo(match.homeTeam)" [alt]="match.homeTeam | teamTranslate" class="team-logo" (error)="onImageError($event)">
              </div>
              <span class="vs">{{ 'matches.vs' | translate }}</span>
              <div class="team team-away">
                <img *ngIf="getTeamLogo(match.awayTeam)" [src]="getTeamLogo(match.awayTeam)" [alt]="match.awayTeam | teamTranslate" class="team-logo" (error)="onImageError($event)">
                <span>{{ match.awayTeam | teamTranslate }}</span>
              </div>
            </div>
            <div class="match-footer">
              <span class="date">{{ match.matchDate | date:'dd/MM/yy, HH:mm' }}</span>
              <span *ngIf="match.status === 'FINISHED'" class="result">
                {{ match.result.homeScore }} - {{ match.result.awayScore }}
              </span>
              <span *ngIf="match.status === 'SCHEDULED' && match.result && match.result.homeScore !== null" class="result ongoing">
                {{ 'matches.ongoingScore' | translate }}: {{ match.result.homeScore }} - {{ match.result.awayScore }}
              </span>
              <div class="match-actions" *ngIf="canManageGroup()">
                <button
                  *ngIf="canUpdateScore(match)"
                  (click)="openScoreUpdate(match)"
                  class="btn-update-score">
                  {{ 'matches.updateScore' | translate }}
                </button>
                <button
                  *ngIf="match.status === 'SCHEDULED' && match.result && match.result.homeScore !== null"
                  (click)="markAsFinished(match._id)"
                  class="btn-mark-finished">
                  {{ 'matches.markAsFinished' | translate }}
                </button>
                <button
                  (click)="openEditMatch(match)"
                  class="btn-edit">
                  {{ 'common.edit' | translate }}
                </button>
                <button
                  (click)="confirmDeleteMatch(match)"
                  class="btn-delete">
                  {{ 'common.delete' | translate }}
                </button>
              </div>
            </div>
            <!-- Score update form -->
            <div *ngIf="editingMatchId === match._id && !editingMatchDetails" class="score-update-form">
              <div class="form-row">
                <div class="form-group">
                  <label>{{ match.homeTeam | teamTranslate }}</label>
                  <input
                    type="number"
                    [(ngModel)]="updateScoreData.homeScore"
                    [name]="'homeScore_' + match._id"
                    class="form-control score-input"
                    min="0">
                </div>
                <div class="form-group">
                  <label>{{ match.awayTeam | teamTranslate }}</label>
                  <input
                    type="number"
                    [(ngModel)]="updateScoreData.awayScore"
                    [name]="'awayScore_' + match._id"
                    class="form-control score-input"
                    min="0">
                </div>
              </div>
              <div class="button-row">
                <button
                  (click)="submitScoreUpdate(match._id)"
                  [disabled]="loadingScoreUpdate || updateScoreData.homeScore === null || updateScoreData.awayScore === null"
                  class="btn-primary btn-small">
                  {{ loadingScoreUpdate ? ('auth.loading' | translate) : ('matches.saveScore' | translate) }}
                </button>
                <button (click)="cancelScoreUpdate()" class="btn-secondary btn-small">
                  {{ 'groups.cancel' | translate }}
                </button>
              </div>
              <div *ngIf="scoreUpdateError" class="error-message" style="margin-top: 0.5rem;">{{ scoreUpdateError }}</div>
            </div>
            <!-- Edit match form -->
            <div *ngIf="editingMatchId === match._id && editingMatchDetails" class="edit-match-form">
              <div class="form-row">
                <div class="form-group">
                  <label>{{ 'matches.homeTeam' | translate }}</label>
                  <app-team-select
                    [(ngModel)]="editMatchData.homeTeam"
                    [placeholder]="'matches.selectTeam' | translate">
                  </app-team-select>
                </div>
                <div class="form-group">
                  <label>{{ 'matches.awayTeam' | translate }}</label>
                  <app-team-select
                    [(ngModel)]="editMatchData.awayTeam"
                    [placeholder]="'matches.selectTeam' | translate">
                  </app-team-select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>{{ 'matches.matchDate' | translate }}</label>
                  <input
                    type="date"
                    [(ngModel)]="editMatchData.matchDate"
                    class="form-control">
                </div>
                <div class="form-group">
                  <label>{{ 'matches.matchTime' | translate }}</label>
                  <input
                    type="time"
                    [(ngModel)]="editMatchData.matchHour"
                    class="form-control">
                </div>
              </div>
              <div *ngIf="group?.betType === 'relative'" class="relative-points-section">
                <h3>{{ 'matches.relativePoints' | translate }}</h3>
                <div class="form-row">
                  <div class="form-group">
                    <label>{{ 'matches.homeWinPoints' | translate }}</label>
                    <input
                      type="number"
                      [(ngModel)]="editMatchData.relativePoints.homeWin"
                      class="form-control score-input"
                      min="0.1"
                      step="0.1"
                      required>
                  </div>
                  <div class="form-group">
                    <label>{{ 'matches.drawPoints' | translate }}</label>
                    <input
                      type="number"
                      [(ngModel)]="editMatchData.relativePoints.draw"
                      class="form-control score-input"
                      min="0.1"
                      step="0.1"
                      required>
                  </div>
                  <div class="form-group">
                    <label>{{ 'matches.awayWinPoints' | translate }}</label>
                    <input
                      type="number"
                      [(ngModel)]="editMatchData.relativePoints.awayWin"
                      class="form-control score-input"
                      min="0.1"
                      step="0.1"
                      required>
                  </div>
                </div>
              </div>
              <div class="button-row">
                <button
                  (click)="submitEditMatch(match._id)"
                  [disabled]="loadingEditMatch"
                  class="btn-primary btn-small">
                  {{ loadingEditMatch ? ('auth.loading' | translate) : ('common.save' | translate) }}
                </button>
                <button (click)="cancelEditMatch()" class="btn-secondary btn-small">
                  {{ 'groups.cancel' | translate }}
                </button>
              </div>
              <div *ngIf="editMatchError" class="error-message" style="margin-top: 0.5rem;">{{ editMatchError }}</div>
            </div>
            <!-- Delete confirmation -->
            <div *ngIf="deletingMatchId === match._id" class="delete-confirm">
              <p>{{ 'matches.confirmDelete' | translate }}</p>
              <div class="button-row">
                <button
                  (click)="deleteMatch(match._id)"
                  [disabled]="loadingDeleteMatch"
                  class="btn-delete btn-small">
                  {{ loadingDeleteMatch ? ('auth.loading' | translate) : ('common.delete' | translate) }}
                </button>
                <button (click)="cancelDeleteMatch()" class="btn-secondary btn-small">
                  {{ 'groups.cancel' | translate }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
      animation: fadeIn 0.5s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    h1 {
      color: #1a1a2e;
      margin: 0;
      font-size: 1.75rem;
      font-weight: 700;
      font-family: 'Poppins', sans-serif;
    }
    h2 {
      color: #1a1a2e;
      margin-bottom: 1.25rem;
      font-size: 1.25rem;
      font-weight: 600;
      font-family: 'Poppins', sans-serif;
    }
    .section {
      background: white;
      padding: 2rem;
      border-radius: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      margin-bottom: 2rem;
      border: 1px solid rgba(0, 0, 0, 0.04);
    }
    .form-group {
      flex: 1;
      max-width: 400px;
    }
    label {
      display: block;
      margin-bottom: 0.5rem;
      color: #475569;
      font-weight: 600;
      font-size: 0.9rem;
    }
    .form-control {
      width: 100%;
      padding: 0.85rem 1rem;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      font-size: 1rem;
      transition: all 0.3s ease;
      background: #f8fafc;
    }
    .form-control:focus {
      outline: none;
      border-color: #4ade80;
      background: white;
      box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.15);
    }
    .btn-primary, .btn-secondary {
      padding: 0.85rem 1.5rem;
      border: none;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .btn-primary {
      background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
      color: white;
      box-shadow: 0 4px 15px rgba(74, 222, 128, 0.3);
    }
    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(74, 222, 128, 0.4);
    }
    .btn-primary:disabled {
      background: linear-gradient(135deg, #cbd5e0 0%, #94a3b8 100%);
      box-shadow: none;
      cursor: not-allowed;
      transform: none;
    }
    .btn-secondary {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
    }
    .btn-secondary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
    }
    .info-message {
      padding: 1.25rem;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(29, 78, 216, 0.05) 100%);
      border-radius: 12px;
      color: #1d4ed8;
      border-left: 4px solid #3b82f6;
      font-weight: 500;
    }
    .loading, .empty-state {
      text-align: center;
      padding: 2.5rem;
      color: #64748b;
    }
    .matches-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.25rem;
    }
    .match-card {
      border: 2px solid #f1f5f9;
      border-radius: 16px;
      padding: 1.25rem;
      transition: all 0.3s ease;
      background: white;
    }
    .match-card:hover {
      border-color: #e2e8f0;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
    }
    .match-card.active {
      border-color: #86efac;
      background: linear-gradient(135deg, rgba(74, 222, 128, 0.05) 0%, rgba(34, 197, 94, 0.02) 100%);
    }
    .match-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .competition {
      font-size: 0.85rem;
      color: #64748b;
      font-weight: 500;
    }
    .status {
      font-size: 0.8rem;
      padding: 0.35rem 0.75rem;
      border-radius: 20px;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }
    .status.finished {
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    }
    .match-teams {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 1rem 0;
      font-weight: 600;
    }
    .team {
      flex: 1;
      color: #1a1a2e;
      font-size: 0.95rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .team-home {
      justify-content: flex-end;
    }
    .team-away {
      justify-content: flex-start;
    }
    .team-logo {
      width: 24px;
      height: 24px;
      object-fit: contain;
      border-radius: 4px;
    }
    .vs {
      color: #94a3b8;
      padding: 0 0.75rem;
      font-weight: 400;
    }
    .match-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.75rem;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .date {
      font-size: 0.9rem;
      color: #64748b;
    }
    .result {
      font-weight: 700;
      color: #22c55e;
      font-size: 1.15rem;
      background: #f0fdf4;
      padding: 0.35rem 0.9rem;
      border-radius: 10px;
    }
    .result.ongoing {
      color: #f59e0b;
      background: #fef3c7;
      font-size: 0.9rem;
    }
    .warning-message {
      color: #d97706;
      padding: 1rem;
      background: #fef3c7;
      border-radius: 12px;
      border-left: 4px solid #f59e0b;
      font-weight: 500;
    }
    .manual-match-form {
      max-width: 700px;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      padding: 1.75rem;
      border-radius: 16px;
      border: 2px solid #e2e8f0;
    }
    .form-row {
      display: flex;
      gap: 1.25rem;
      margin-bottom: 1.5rem;
      align-items: flex-end;
    }
    .form-row .form-group {
      flex: 1;
    }
    .form-row.teams-row {
      background: white;
      padding: 1.25rem;
      border-radius: 12px;
      border: 2px solid #e2e8f0;
      position: relative;
      align-items: center;
    }
    .form-row.teams-row .form-group {
      flex: 1;
    }
    .form-row.teams-row::after {
      content: 'VS';
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
      color: white;
      font-weight: 700;
      font-size: 0.75rem;
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
      z-index: 10;
      box-shadow: 0 2px 8px rgba(74, 222, 128, 0.3);
    }
    .form-row.datetime-row {
      background: white;
      padding: 1.25rem;
      border-radius: 12px;
      border: 2px solid #e2e8f0;
    }
    .form-row.score-row {
      background: rgba(245, 158, 11, 0.1);
      padding: 1.25rem;
      border-radius: 12px;
      border: 2px solid rgba(245, 158, 11, 0.3);
    }
    .form-row.score-row .form-group {
      max-width: 150px;
    }
    .error-message {
      padding: 1rem;
      background: #fee2e2;
      border-radius: 12px;
      color: #dc2626;
      border-left: 4px solid #ef4444;
      font-weight: 500;
    }
    .past-match-notice {
      padding: 1rem;
      background: #fef3c7;
      border-radius: 12px;
      color: #d97706;
      border-left: 4px solid #f59e0b;
      margin-bottom: 1.25rem;
      font-weight: 500;
    }
    .relative-points-section {
      margin-bottom: 1.5rem;
      padding: 1.5rem;
      background: #f0f9ff;
      border-radius: 12px;
      border: 2px solid #bfdbfe;
    }
    .relative-points-section h3 {
      margin-top: 0;
      margin-bottom: 0.5rem;
      color: #1e40af;
      font-size: 1.1rem;
      font-weight: 700;
    }
    .points-description {
      color: #475569;
      font-size: 0.9rem;
      margin-bottom: 1rem;
      font-style: italic;
    }
    .score-input {
      max-width: 100px;
    }
    .btn-update-score {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 600;
      transition: all 0.3s ease;
    }
    .btn-update-score:hover {
      transform: translateY(-2px);
    }
    .btn-mark-finished {
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 600;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
    }
    .btn-mark-finished:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
    }
    .score-update-form {
      margin-top: 1.25rem;
      padding-top: 1.25rem;
      border-top: 2px solid #f1f5f9;
    }
    .button-row {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.75rem;
    }
    .btn-small {
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
      border-radius: 10px;
    }
    .match-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .btn-edit {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 600;
      transition: all 0.3s ease;
    }
    .btn-edit:hover {
      transform: translateY(-2px);
    }
    .btn-delete {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 600;
      transition: all 0.3s ease;
    }
    .btn-delete:hover {
      transform: translateY(-2px);
    }
    .edit-match-form {
      margin-top: 1.25rem;
      padding-top: 1.25rem;
      border-top: 2px solid #f1f5f9;
    }
    .delete-confirm {
      margin-top: 1.25rem;
      padding: 1.25rem;
      background: #fee2e2;
      border-radius: 12px;
      border-left: 4px solid #ef4444;
    }
    .delete-confirm p {
      margin: 0 0 0.75rem 0;
      color: #dc2626;
      font-weight: 500;
    }
    @media (max-width: 768px) {
      .container {
        padding: 1rem;
      }
      .header {
        flex-direction: column;
        align-items: flex-start;
      }
      .manual-match-form {
        max-width: 100%;
        padding: 1.25rem;
      }
      .form-row {
        flex-direction: column;
        width: 100%;
      }
      .form-group {
        max-width: 100%;
        width: 100%;
      }
      .form-row.teams-row {
        padding: 1rem;
        gap: 2.5rem;
      }
      .form-row.teams-row .form-group {
        width: 100%;
      }
      .form-row.teams-row::after {
        top: 50%;
      }
      .matches-grid {
        grid-template-columns: 1fr;
      }
      .edit-match-form .form-row .form-group {
        width: 100%;
        max-width: 100%;
      }
      .form-row.score-row {
        flex-direction: row;
        justify-content: center;
        gap: 1.5rem;
      }
      .form-row.score-row .form-group {
        flex: 1;
        max-width: 150px;
      }
      .score-input {
        max-width: 100%;
        width: 100%;
        text-align: center;
      }
    }
    @media (max-width: 400px) {
      .container {
        padding: 0.75rem;
      }
      .header {
        margin-bottom: 1.25rem;
        gap: 0.75rem;
      }
      h1 {
        font-size: 1.25rem;
      }
      h2 {
        font-size: 1.1rem;
        margin-bottom: 1rem;
      }
      .section {
        padding: 0.85rem;
        border-radius: 14px;
        margin-bottom: 1.25rem;
      }
      .btn-secondary {
        padding: 0.65rem 1rem;
        font-size: 0.85rem;
      }
      .manual-match-form {
        padding: 0.85rem;
      }
      .form-group {
        max-width: 100%;
        width: 100%;
      }
      .form-row.teams-row {
        padding: 0.85rem;
        gap: 2rem;
      }
      label {
        font-size: 0.85rem;
        margin-bottom: 0.4rem;
      }
      .form-control {
        padding: 0.75rem 0.85rem;
        font-size: 0.9rem;
        border-radius: 10px;
      }
      .form-row {
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      .relative-points-section {
        padding: 1rem;
        margin-bottom: 1rem;
      }
      .relative-points-section h3 {
        font-size: 1rem;
      }
      .points-description {
        font-size: 0.8rem;
      }
      .score-input {
        max-width: 100%;
        width: 100%;
      }
      .form-row.score-row .form-group {
        flex: 1;
        max-width: 120px;
      }
      .btn-primary {
        padding: 0.75rem 1rem;
        font-size: 0.9rem;
        width: 100%;
      }
      .info-message, .error-message, .past-match-notice {
        padding: 0.85rem;
        font-size: 0.85rem;
      }
      .matches-grid {
        gap: 0.85rem;
      }
      .match-card {
        padding: 0.85rem;
        border-radius: 12px;
      }
      .match-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.35rem;
      }
      .competition {
        font-size: 0.8rem;
      }
      .status {
        font-size: 0.7rem;
        padding: 0.25rem 0.5rem;
      }
      .match-teams {
        flex-direction: column;
        gap: 0.5rem;
        margin: 0.75rem 0;
      }
      .team {
        justify-content: center !important;
        font-size: 0.85rem;
      }
      .team-logo {
        width: 22px;
        height: 22px;
      }
      .vs {
        padding: 0.2rem 0;
      }
      .match-footer {
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
      }
      .date {
        font-size: 0.8rem;
        text-align: center;
      }
      .result {
        font-size: 1rem;
        padding: 0.3rem 0.75rem;
        text-align: center;
      }
      .result.ongoing {
        font-size: 0.8rem;
      }
      .match-actions {
        justify-content: center;
        gap: 0.35rem;
      }
      .btn-update-score, .btn-mark-finished, .btn-edit, .btn-delete {
        font-size: 0.75rem;
        padding: 0.4rem 0.65rem;
        flex: 1;
        text-align: center;
      }
      .score-update-form, .edit-match-form {
        margin-top: 1rem;
        padding-top: 1rem;
      }
      .button-row {
        flex-direction: column;
        gap: 0.5rem;
      }
      .button-row button {
        width: 100%;
      }
      .btn-small {
        padding: 0.5rem 0.75rem;
        font-size: 0.8rem;
      }
      .delete-confirm {
        padding: 1rem;
        margin-top: 1rem;
      }
      .delete-confirm p {
        font-size: 0.85rem;
      }
      .loading, .empty-state {
        padding: 1.5rem;
        font-size: 0.9rem;
      }
    }

    /* Dark Mode Styles */
    :host-context(.dark-theme) h1,
    :host-context(.dark-theme) h2,
    :host-context(.dark-theme) h3 {
      color: #f9fafb;
    }
    :host-context(.dark-theme) .section {
      background: #1f2937;
      border-color: #374151;
    }
    :host-context(.dark-theme) label {
      color: #d1d5db;
    }
    :host-context(.dark-theme) .form-control {
      background: #111827;
      border-color: #374151;
      color: #e5e7eb;
    }
    :host-context(.dark-theme) .form-control:focus {
      background: #1f2937;
      border-color: #4ade80;
    }
    :host-context(.dark-theme) .loading,
    :host-context(.dark-theme) .empty-state {
      color: #9ca3af;
    }
    :host-context(.dark-theme) .match-card {
      background: #1f2937;
      border-color: #374151;
    }
    :host-context(.dark-theme) .match-card:hover {
      border-color: #4b5563;
    }
    :host-context(.dark-theme) .match-card.active {
      border-color: rgba(74, 222, 128, 0.4);
      background: linear-gradient(135deg, rgba(74, 222, 128, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%);
    }
    :host-context(.dark-theme) .competition {
      color: #9ca3af;
    }
    :host-context(.dark-theme) .team {
      color: #f9fafb;
    }
    :host-context(.dark-theme) .vs {
      color: #6b7280;
    }
    :host-context(.dark-theme) .date {
      color: #9ca3af;
    }
    :host-context(.dark-theme) .result {
      background: rgba(34, 197, 94, 0.15);
      color: #4ade80;
    }
    :host-context(.dark-theme) .result.ongoing {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
    }
    :host-context(.dark-theme) .info-message {
      background: rgba(59, 130, 246, 0.15);
      color: #93c5fd;
    }
    :host-context(.dark-theme) .error-message {
      background: rgba(239, 68, 68, 0.15);
      color: #fca5a5;
    }
    :host-context(.dark-theme) .warning-message,
    :host-context(.dark-theme) .past-match-notice {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
    }
    :host-context(.dark-theme) .relative-points-section {
      background: rgba(59, 130, 246, 0.1);
      border-color: rgba(59, 130, 246, 0.3);
    }
    :host-context(.dark-theme) .relative-points-section h3 {
      color: #93c5fd;
    }
    :host-context(.dark-theme) .points-description {
      color: #9ca3af;
    }
    :host-context(.dark-theme) .score-update-form,
    :host-context(.dark-theme) .edit-match-form {
      border-top-color: #374151;
    }
    :host-context(.dark-theme) .delete-confirm {
      background: rgba(239, 68, 68, 0.1);
    }
    :host-context(.dark-theme) .delete-confirm p {
      color: #fca5a5;
    }
    :host-context(.dark-theme) .btn-secondary {
      background: linear-gradient(135deg, #4b5563 0%, #374151 100%);
    }
    :host-context(.dark-theme) .manual-match-form {
      background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
      border-color: #374151;
    }
    :host-context(.dark-theme) .form-row.teams-row {
      background: #1f2937;
      border-color: #374151;
    }
    :host-context(.dark-theme) .form-row.datetime-row {
      background: #1f2937;
      border-color: #374151;
    }
    :host-context(.dark-theme) .form-row.score-row {
      background: rgba(245, 158, 11, 0.1);
      border-color: rgba(245, 158, 11, 0.3);
    }
    :host-context(.dark-theme) input[type="date"],
    :host-context(.dark-theme) input[type="time"],
    :host-context(.dark-theme) input[type="number"] {
      color-scheme: dark;
    }
  `]
})
export class ManageMatchesComponent implements OnInit {
  groupId: string = '';
  group: Group | null = null;
  groupMatches: Match[] = [];
  loadingGroupMatches = false;

  // Manual match creation
  loadingManual = false;
  manualMatchMessage = '';
  manualMatchError = '';
  manualMatch: {
    homeTeam: string;
    awayTeam: string;
    matchDate: string;
    matchHour: string;
    homeScore: number | null;
    awayScore: number | null;
    relativePoints: {
      homeWin: number | null;
      draw: number | null;
      awayWin: number | null;
    };
  } = {
    homeTeam: '',
    awayTeam: '',
    matchDate: '',
    matchHour: '',
    homeScore: null,
    awayScore: null,
    relativePoints: {
      homeWin: 1,
      draw: 1,
      awayWin: 1
    }
  };

  // Score update
  editingMatchId: string | null = null;
  editingMatchDetails = false;
  updateScoreData: { homeScore: number | null; awayScore: number | null } = {
    homeScore: null,
    awayScore: null
  };
  loadingScoreUpdate = false;
  scoreUpdateError = '';

  // Edit match
  editMatchData: {
    homeTeam: string;
    awayTeam: string;
    matchDate: string;
    matchHour: string;
    relativePoints: { homeWin: number; draw: number; awayWin: number };
  } = {
    homeTeam: '',
    awayTeam: '',
    matchDate: '',
    matchHour: '',
    relativePoints: { homeWin: 1, draw: 1, awayWin: 1 }
  };
  loadingEditMatch = false;
  editMatchError = '';

  // Delete match
  deletingMatchId: string | null = null;
  loadingDeleteMatch = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private matchService: MatchService,
    private groupService: GroupService,
    private authService: AuthService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.groupId = this.route.snapshot.queryParams['groupId'];
    if (!this.groupId) {
      this.router.navigate(['/groups']);
      return;
    }

    this.loadGroup();
    this.loadMatches();
  }

  loadGroup(): void {
    this.groupService.getGroupById(this.groupId).subscribe({
      next: (response) => {
        this.group = response.data;
      },
      error: (error) => {
        console.error('Failed to load group:', error);
      }
    });
  }

  loadMatches(): void {
    this.loadingGroupMatches = true;

    this.matchService.getMatches(this.groupId).subscribe({
      next: (response) => {
        this.groupMatches = response.data;
        this.loadingGroupMatches = false;
      },
      error: (error) => {
        console.error('Failed to load group matches:', error);
        this.loadingGroupMatches = false;
      }
    });
  }

  isPastMatch(): boolean {
    if (!this.manualMatch.matchDate || !this.manualMatch.matchHour) {
      return false;
    }
    const matchDateTime = new Date(`${this.manualMatch.matchDate}T${this.manualMatch.matchHour}`);
    return matchDateTime <= new Date();
  }

  isFormValid(): boolean {
    const baseValid = !!(
      this.manualMatch.homeTeam &&
      this.manualMatch.awayTeam &&
      this.manualMatch.matchDate &&
      this.manualMatch.matchHour
    );

    if (!baseValid) return false;

    if (this.isPastMatch()) {
      if (this.manualMatch.homeScore === null || this.manualMatch.awayScore === null) {
        return false;
      }
    }

    // Validate relative points if group is 'relative' type
    if (this.group?.betType === 'relative') {
      const pointsValid = !!(
        this.manualMatch.relativePoints.homeWin &&
        this.manualMatch.relativePoints.draw &&
        this.manualMatch.relativePoints.awayWin &&
        this.manualMatch.relativePoints.homeWin > 0 &&
        this.manualMatch.relativePoints.draw > 0 &&
        this.manualMatch.relativePoints.awayWin > 0
      );
      if (!pointsValid) return false;
    }

    return true;
  }

  createManualMatch(): void {
    this.loadingManual = true;
    this.manualMatchMessage = '';
    this.manualMatchError = '';

    // Create a proper Date object from local date/time inputs
    // This ensures the correct UTC time is sent to the server
    const localDateTime = new Date(`${this.manualMatch.matchDate}T${this.manualMatch.matchHour}`);

    const data: any = {
      homeTeam: this.manualMatch.homeTeam,
      awayTeam: this.manualMatch.awayTeam,
      matchDateTime: localDateTime.toISOString(), // Send as ISO string (UTC)
      groupId: this.groupId
    };

    if (this.isPastMatch()) {
      data.homeScore = this.manualMatch.homeScore;
      data.awayScore = this.manualMatch.awayScore;
    }

    // Include relativePoints if group is 'relative' type
    if (this.group?.betType === 'relative') {
      data.relativePoints = {
        homeWin: this.manualMatch.relativePoints.homeWin,
        draw: this.manualMatch.relativePoints.draw,
        awayWin: this.manualMatch.relativePoints.awayWin
      };
    }

    this.matchService.createManualMatch(data).subscribe({
      next: (response) => {
        this.manualMatchMessage = response.message;
        this.loadingManual = false;
        // Reset form
        this.manualMatch = {
          homeTeam: '',
          awayTeam: '',
          matchDate: '',
          matchHour: '',
          homeScore: null,
          awayScore: null,
          relativePoints: {
            homeWin: 1,
            draw: 1,
            awayWin: 1
          }
        };
        // Reload matches to show the new one
        this.loadMatches();
      },
      error: (error) => {
        this.manualMatchError = error.error?.message || 'Failed to create match';
        this.loadingManual = false;
      }
    });
  }

  isGroupCreator(): boolean {
    if (!this.group) return false;
    const currentUser = this.authService.getCurrentUser();
    return this.group.creator?._id === currentUser?.id || this.group.creator === currentUser?.id;
  }

  canManageGroup(): boolean {
    return this.isGroupCreator() || this.authService.isAdmin();
  }

  goBack(): void {
    this.router.navigate(['/groups', this.groupId]);
  }

  canUpdateScore(match: Match): boolean {
    // Can update if match is not finished and match has started
    if (match.status === 'FINISHED') return false;
    const matchDate = new Date(match.matchDate);
    return new Date() >= matchDate;
  }

  openScoreUpdate(match: Match): void {
    this.editingMatchId = match._id;
    this.updateScoreData = {
      homeScore: match.result?.homeScore ?? null,
      awayScore: match.result?.awayScore ?? null
    };
    this.scoreUpdateError = '';
  }

  submitScoreUpdate(matchId: string): void {
    if (this.updateScoreData.homeScore === null || this.updateScoreData.awayScore === null) {
      return;
    }

    this.loadingScoreUpdate = true;
    this.scoreUpdateError = '';

    this.matchService.updateMatchScore({
      matchId,
      groupId: this.groupId,
      homeScore: this.updateScoreData.homeScore,
      awayScore: this.updateScoreData.awayScore
    }).subscribe({
      next: () => {
        this.loadingScoreUpdate = false;
        this.editingMatchId = null;
        this.loadMatches();
      },
      error: (error) => {
        this.scoreUpdateError = error.error?.message || 'Failed to update score';
        this.loadingScoreUpdate = false;
      }
    });
  }

  cancelScoreUpdate(): void {
    this.editingMatchId = null;
    this.updateScoreData = { homeScore: null, awayScore: null };
    this.scoreUpdateError = '';
  }

  markAsFinished(matchId: string): void {
    if (!confirm(this.translationService.translate('matches.confirmMarkFinished'))) {
      return;
    }

    this.matchService.markMatchAsFinished({
      matchId,
      groupId: this.groupId
    }).subscribe({
      next: () => {
        this.loadMatches();
      },
      error: (error) => {
        alert(error.error?.message || 'Failed to mark match as finished');
      }
    });
  }

  // Edit match methods
  openEditMatch(match: Match): void {
    this.editingMatchId = match._id;
    this.editingMatchDetails = true;
    this.deletingMatchId = null;

    // Parse date and time from matchDate
    const matchDate = new Date(match.matchDate);
    const dateStr = matchDate.toISOString().split('T')[0];
    const hours = matchDate.getHours().toString().padStart(2, '0');
    const minutes = matchDate.getMinutes().toString().padStart(2, '0');

    // Get relative points for this group
    const matchRelativePoints = match.relativePoints?.find(rp => rp.group === this.groupId);

    this.editMatchData = {
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      matchDate: dateStr,
      matchHour: `${hours}:${minutes}`,
      relativePoints: {
        homeWin: matchRelativePoints?.homeWin || 1,
        draw: matchRelativePoints?.draw || 1,
        awayWin: matchRelativePoints?.awayWin || 1
      }
    };
    this.editMatchError = '';
  }

  submitEditMatch(matchId: string): void {
    this.loadingEditMatch = true;
    this.editMatchError = '';

    // Create a proper Date object from local date/time inputs
    const localDateTime = new Date(`${this.editMatchData.matchDate}T${this.editMatchData.matchHour}`);

    const updateData: any = {
      matchId,
      groupId: this.groupId,
      homeTeam: this.editMatchData.homeTeam,
      awayTeam: this.editMatchData.awayTeam,
      matchDateTime: localDateTime.toISOString() // Send as ISO string (UTC)
    };

    // Include relative points if this is a relative group
    if (this.group?.betType === 'relative') {
      updateData.relativePoints = this.editMatchData.relativePoints;
    }

    this.matchService.editMatch(updateData).subscribe({
      next: () => {
        this.loadingEditMatch = false;
        this.editingMatchId = null;
        this.editingMatchDetails = false;
        this.loadMatches();
      },
      error: (error) => {
        this.editMatchError = error.error?.message || 'Failed to edit match';
        this.loadingEditMatch = false;
      }
    });
  }

  cancelEditMatch(): void {
    this.editingMatchId = null;
    this.editingMatchDetails = false;
    this.editMatchData = {
      homeTeam: '',
      awayTeam: '',
      matchDate: '',
      matchHour: '',
      relativePoints: { homeWin: 1, draw: 1, awayWin: 1 }
    };
    this.editMatchError = '';
  }

  // Delete match methods
  confirmDeleteMatch(match: Match): void {
    this.deletingMatchId = match._id;
    this.editingMatchId = null;
    this.editingMatchDetails = false;
  }

  deleteMatch(matchId: string): void {
    this.loadingDeleteMatch = true;

    this.matchService.deleteMatch(matchId, this.groupId).subscribe({
      next: () => {
        this.loadingDeleteMatch = false;
        this.deletingMatchId = null;
        this.loadMatches();
      },
      error: (error) => {
        console.error('Failed to delete match:', error);
        this.loadingDeleteMatch = false;
      }
    });
  }

  cancelDeleteMatch(): void {
    this.deletingMatchId = null;
  }

  // Team logo helpers
  getTeamLogo(teamName: string): string | null {
    const team = getTeamByName(teamName);
    return team ? team.logo : null;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}
