import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslationService } from '../../../services/translation.service';
import { environment } from '../../../../environments/environment';

interface Feedback {
  _id: string;
  message: string;
  image: string | null;
  user: {
    _id: string;
    username: string;
    email: string;
  } | null;
  status: 'new' | 'read' | 'resolved';
  adminResponse?: string | null;
  createdAt: string;
  showResponseInput?: boolean;
  responseText?: string;
}

@Component({
  selector: 'app-admin-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-feedback.component.html',
  styleUrls: ['./admin-feedback.component.css']
})
export class AdminFeedbackComponent implements OnInit {
  feedbackList: Feedback[] = [];
  isLoading = true;
  error = '';

  constructor(
    private http: HttpClient,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.loadFeedback();
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }

  loadFeedback(): void {
    this.isLoading = true;
    this.error = '';

    this.http.get<{ success: boolean; data: Feedback[] }>(`${environment.apiUrl}/feedback`)
      .subscribe({
        next: (response) => {
          this.feedbackList = response.data;
          this.isLoading = false;
        },
        error: () => {
          this.error = this.t('admin.loadError');
          this.isLoading = false;
        }
      });
  }

  updateStatus(feedbackId: string, status: 'new' | 'read' | 'resolved'): void {
    this.http.patch<{ success: boolean }>(`${environment.apiUrl}/feedback/${feedbackId}`, { status })
      .subscribe({
        next: () => {
          const feedback = this.feedbackList.find(f => f._id === feedbackId);
          if (feedback) {
            feedback.status = status;
          }
        },
        error: () => {
          // Silently fail
        }
      });
  }

  resolveWithResponse(feedback: Feedback): void {
    this.http.patch<{ success: boolean }>(
      `${environment.apiUrl}/feedback/${feedback._id}`,
      { status: 'resolved', adminResponse: feedback.responseText || null }
    ).subscribe({
      next: () => {
        feedback.status = 'resolved';
        feedback.adminResponse = feedback.responseText || null;
        feedback.showResponseInput = false;
        feedback.responseText = '';
      },
      error: () => {}
    });
  }

  deleteFeedback(feedbackId: string): void {
    if (!confirm(this.t('admin.confirmDelete'))) {
      return;
    }

    this.http.delete<{ success: boolean }>(`${environment.apiUrl}/feedback/${feedbackId}`)
      .subscribe({
        next: () => {
          this.feedbackList = this.feedbackList.filter(f => f._id !== feedbackId);
        },
        error: () => {
          // Silently fail
        }
      });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  openImage(imageUrl: string): void {
    window.open(imageUrl, '_blank');
  }
}
