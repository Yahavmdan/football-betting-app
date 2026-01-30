import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subscription, interval, switchMap, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FeedbackNotification {
  _id: string;
  message: string;
  adminResponse: string | null;
  resolvedAt: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  private apiUrl = `${environment.apiUrl}/feedback`;
  private notificationsSubject = new BehaviorSubject<FeedbackNotification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();
  private pollSubscription: Subscription | null = null;

  constructor(private http: HttpClient) {}

  startPolling(): void {
    this.stopPolling();
    this.fetchNotifications();
    this.pollSubscription = interval(60000).pipe(
      switchMap(() => this.http.get<{ success: boolean; data: FeedbackNotification[] }>(`${this.apiUrl}/notifications`))
    ).subscribe({
      next: (response) => this.notificationsSubject.next(response.data),
      error: () => {}
    });
  }

  stopPolling(): void {
    this.pollSubscription?.unsubscribe();
    this.pollSubscription = null;
    this.notificationsSubject.next([]);
  }

  fetchNotifications(): void {
    this.http.get<{ success: boolean; data: FeedbackNotification[] }>(`${this.apiUrl}/notifications`)
      .subscribe({
        next: (response) => this.notificationsSubject.next(response.data),
        error: () => {}
      });
  }

  dismissNotification(feedbackId: string): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`${this.apiUrl}/${feedbackId}/dismiss`, {}).pipe(
      tap(() => {
        const current = this.notificationsSubject.value;
        this.notificationsSubject.next(current.filter(n => n._id !== feedbackId));
      })
    );
  }

  dismissAll(): void {
    const current = this.notificationsSubject.value;
    current.forEach(n => {
      this.http.patch(`${this.apiUrl}/${n._id}/dismiss`, {}).subscribe();
    });
    this.notificationsSubject.next([]);
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }
}
