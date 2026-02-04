import { Component, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { TranslationService } from '../../../services/translation.service';
import { ToastService } from '../toast/toast.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-feedback-button',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './feedback-button.component.html',
  styleUrls: ['./feedback-button.component.css']
})
export class FeedbackButtonComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  isDialogOpen = false;
  message = '';
  isSubmitting = false;

  // Image upload
  selectedImage: File | null = null;
  imagePreview: string | null = null;

  // Drag functionality
  isDragging: 'feedback' | 'football' | null = null;
  hasDragged = false;
  feedbackY = 50; // Percentage from top (default 50% = center)
  footballY = 40; // Slightly above feedback button
  private dragStartY = 0;
  private dragStartButtonY = 0;
  private readonly MIN_DISTANCE = 8; // Minimum distance between widgets (percentage)
  private feedbackWasAbove = false; // Track relative position at drag start

  constructor(
    private http: HttpClient,
    private router: Router,
    private translationService: TranslationService,
    private toastService: ToastService
  ) {
    // Load vertical positions from localStorage
    const savedFeedbackY = localStorage.getItem('feedbackButtonY');
    if (savedFeedbackY) {
      this.feedbackY = parseFloat(savedFeedbackY);
    }
    const savedFootballY = localStorage.getItem('footballWidgetY');
    if (savedFootballY) {
      this.footballY = parseFloat(savedFootballY);
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;
    event.preventDefault();
    const deltaY = event.clientY - this.dragStartY;
    if (Math.abs(deltaY) > 5) {
      this.hasDragged = true;
    }
    const windowHeight = window.innerHeight;
    const deltaPercent = (deltaY / windowHeight) * 100;
    let newY = this.dragStartButtonY + deltaPercent;
    newY = Math.max(10, Math.min(90, newY));

    if (this.isDragging === 'feedback') {
      this.feedbackY = newY;
      this.applyRepulsion('feedback');
    } else if (this.isDragging === 'football') {
      this.footballY = newY;
      this.applyRepulsion('football');
    }
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    if (this.isDragging) {
      if (this.hasDragged) {
        // Save both positions since repulsion may have moved the other widget
        localStorage.setItem('feedbackButtonY', this.feedbackY.toString());
        localStorage.setItem('footballWidgetY', this.footballY.toString());
      }
      this.isDragging = null;
    }
  }

  @HostListener('document:touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    if (!this.isDragging) return;
    const touch = event.touches[0];
    const deltaY = touch.clientY - this.dragStartY;
    if (Math.abs(deltaY) > 5) {
      this.hasDragged = true;
    }
    const windowHeight = window.innerHeight;
    const deltaPercent = (deltaY / windowHeight) * 100;
    let newY = this.dragStartButtonY + deltaPercent;
    newY = Math.max(10, Math.min(90, newY));

    if (this.isDragging === 'feedback') {
      this.feedbackY = newY;
      this.applyRepulsion('feedback');
    } else if (this.isDragging === 'football') {
      this.footballY = newY;
      this.applyRepulsion('football');
    }
  }

  @HostListener('document:touchend')
  onTouchEnd(): void {
    if (this.isDragging) {
      if (this.hasDragged) {
        // Save both positions since repulsion may have moved the other widget
        localStorage.setItem('feedbackButtonY', this.feedbackY.toString());
        localStorage.setItem('footballWidgetY', this.footballY.toString());
      }
      this.isDragging = null;
    }
  }

  startDrag(event: MouseEvent | TouchEvent, widget: 'feedback' | 'football'): void {
    this.isDragging = widget;
    this.hasDragged = false;
    this.dragStartButtonY = widget === 'feedback' ? this.feedbackY : this.footballY;
    this.feedbackWasAbove = this.feedbackY < this.footballY;
    if (event instanceof MouseEvent) {
      this.dragStartY = event.clientY;
    } else {
      this.dragStartY = event.touches[0].clientY;
    }
  }

  onButtonClick(widget: 'feedback' | 'football'): void {
    if (!this.hasDragged) {
      if (widget === 'feedback') {
        this.toggleDialog();
      } else if (widget === 'football') {
        this.router.navigate(['/game']);
      }
    }
    this.hasDragged = false;
  }

  private applyRepulsion(movingWidget: 'feedback' | 'football'): void {
    const feedbackIsAbove = this.feedbackY < this.footballY;

    // Check if widgets have crossed over (passed through each other)
    if (feedbackIsAbove !== this.feedbackWasAbove) {
      // They crossed! Update the tracking and allow the new position
      this.feedbackWasAbove = feedbackIsAbove;
      return;
    }

    const distance = Math.abs(this.feedbackY - this.footballY);

    if (distance < this.MIN_DISTANCE) {
      const overlap = this.MIN_DISTANCE - distance;

      if (movingWidget === 'feedback') {
        // Push football away from feedback
        if (this.footballY > this.feedbackY) {
          // Football is below, push it down
          this.footballY = Math.min(90, this.footballY + overlap);
        } else {
          // Football is above, push it up
          this.footballY = Math.max(10, this.footballY - overlap);
        }
      } else {
        // Push feedback away from football
        if (this.feedbackY > this.footballY) {
          // Feedback is below, push it down
          this.feedbackY = Math.min(90, this.feedbackY + overlap);
        } else {
          // Feedback is above, push it up
          this.feedbackY = Math.max(10, this.feedbackY - overlap);
        }
      }
    }
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }

  toggleDialog(): void {
    this.isDialogOpen = !this.isDialogOpen;
  }

  closeDialog(): void {
    this.isDialogOpen = false;
    this.clearImage();
  }

  minimize(): void {
    this.isDialogOpen = false;
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Check if it's an image
      if (!file.type.startsWith('image/')) {
        this.toastService.show(this.t('feedback.invalidFileType'), 'error');
        return;
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.toastService.show(this.t('profile.fileTooLarge'), 'error');
        return;
      }

      this.selectedImage = file;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  clearImage(): void {
    this.selectedImage = null;
    this.imagePreview = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  submitFeedback(): void {
    if (!this.message.trim()) {
      return;
    }

    this.isSubmitting = true;

    const formData = new FormData();
    formData.append('message', this.message.trim());
    if (this.selectedImage) {
      formData.append('image', this.selectedImage);
    }

    this.http.post<{ success: boolean; message?: string; remainingTime?: number }>(
      `${environment.apiUrl}/feedback`,
      formData
    ).subscribe({
        next: () => {
          this.toastService.show(this.t('feedback.successMessage'), 'success');
          this.message = '';
          this.clearImage();
          this.isSubmitting = false;
          this.closeDialog();
        },
        error: (err) => {
          if (err.status === 429) {
            this.toastService.show(this.t('feedback.rateLimitError'), 'error');
          } else {
            this.toastService.show(this.t('feedback.errorMessage'), 'error');
          }
          this.isSubmitting = false;
        }
      });
  }
}
