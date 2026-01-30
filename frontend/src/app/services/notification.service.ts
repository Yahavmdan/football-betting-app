import { Injectable, OnDestroy, NgZone } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, Subscription, interval, switchMap, tap, EMPTY } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FeedbackNotification {
  _id: string;
  message: string;
  adminResponse: string | null;
  resolvedAt: string;
  createdAt: string;
}

const SILENT_HEADERS = new HttpHeaders().set('X-Skip-Loading', 'true');

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  private apiUrl = `${environment.apiUrl}/feedback`;
  private notificationsSubject = new BehaviorSubject<FeedbackNotification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();
  private pollSubscription: Subscription | null = null;
  private isPollingActive = false;
  private visibilityHandler = () => this.onVisibilityChange();

  constructor(private http: HttpClient, private ngZone: NgZone) {
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  startPolling(): void {
    this.isPollingActive = true;
    this.restartInterval();
  }

  stopPolling(): void {
    this.isPollingActive = false;
    this.killInterval();
    this.notificationsSubject.next([]);
  }

  private restartInterval(): void {
    this.killInterval();
    if (!this.isPollingActive || document.hidden) return;

    this.fetchNotifications();
    this.ngZone.runOutsideAngular(() => {
      this.pollSubscription = interval(60000).pipe(
        switchMap(() => {
          if (document.hidden) return EMPTY;
          return this.http.get<{ success: boolean; data: FeedbackNotification[] }>(
            `${this.apiUrl}/notifications`, { headers: SILENT_HEADERS }
          );
        })
      ).subscribe({
        next: (response) => this.ngZone.run(() => this.notificationsSubject.next(response.data)),
        error: () => {}
      });
    });
  }

  private killInterval(): void {
    this.pollSubscription?.unsubscribe();
    this.pollSubscription = null;
  }

  private onVisibilityChange(): void {
    if (!this.isPollingActive) return;

    if (document.hidden) {
      this.killInterval();
    } else {
      this.restartInterval();
    }
  }

  fetchNotifications(): void {
    this.http.get<{ success: boolean; data: FeedbackNotification[] }>(
      `${this.apiUrl}/notifications`, { headers: SILENT_HEADERS }
    ).subscribe({
        next: (response) => this.notificationsSubject.next(response.data),
        error: () => {}
      });
  }

  dismissNotification(feedbackId: string): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(
      `${this.apiUrl}/${feedbackId}/dismiss`, {}, { headers: SILENT_HEADERS }
    ).pipe(
      tap(() => {
        const current = this.notificationsSubject.value;
        this.notificationsSubject.next(current.filter(n => n._id !== feedbackId));
      })
    );
  }

  dismissAll(): void {
    const current = this.notificationsSubject.value;
    current.forEach(n => {
      this.http.patch(`${this.apiUrl}/${n._id}/dismiss`, {}, { headers: SILENT_HEADERS }).subscribe();
    });
    this.notificationsSubject.next([]);
  }

  ngOnDestroy(): void {
    this.stopPolling();
    document.removeEventListener('visibilitychange', this.visibilityHandler);
  }
}
