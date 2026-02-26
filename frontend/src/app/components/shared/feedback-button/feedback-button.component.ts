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
  isReleasing: 'feedback' | 'football' | null = null; // Track bounce-back animation
  hasDragged = false;
  feedbackY = 50; // Percentage from top (default 50% = center)
  footballY = 40; // Slightly above feedback button
  feedbackSide: 'left' | 'right' = 'right';
  footballSide: 'left' | 'right' = 'right';
  feedbackStretch = 0; // Horizontal stretch amount (pixels)
  footballStretch = 0;
  private dragStartY = 0;
  private dragStartX = 0;
  private dragStartButtonY = 0;
  private readonly MIN_DISTANCE = 8; // Minimum distance between widgets (percentage)
  private feedbackWasAbove = false; // Track relative position at drag start
  private readonly MAX_STRETCH = 35; // Max visual stretch (increased for more dramatic effect)
  private readonly SWITCH_DISTANCE = 80; // Pixels to drag to switch sides

  constructor(
    private http: HttpClient,
    private router: Router,
    private translationService: TranslationService,
    private toastService: ToastService
  ) {
    // Load positions from localStorage
    const savedFeedbackY = localStorage.getItem('feedbackButtonY');
    if (savedFeedbackY) {
      this.feedbackY = parseFloat(savedFeedbackY);
    }
    const savedFootballY = localStorage.getItem('footballWidgetY');
    if (savedFootballY) {
      this.footballY = parseFloat(savedFootballY);
    }
    const savedFeedbackSide = localStorage.getItem('feedbackButtonSide');
    if (savedFeedbackSide) {
      this.feedbackSide = savedFeedbackSide as 'left' | 'right';
    }
    const savedFootballSide = localStorage.getItem('footballWidgetSide');
    if (savedFootballSide) {
      this.footballSide = savedFootballSide as 'left' | 'right';
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;
    event.preventDefault();
    this.handleDragMove(event.clientX, event.clientY);
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.handleDragEnd();
  }

  @HostListener('document:touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    if (!this.isDragging) return;
    const touch = event.touches[0];
    this.handleDragMove(touch.clientX, touch.clientY);
  }

  @HostListener('document:touchend')
  onTouchEnd(): void {
    this.handleDragEnd();
  }

  private handleDragMove(clientX: number, clientY: number): void {
    const deltaY = clientY - this.dragStartY;
    const deltaX = clientX - this.dragStartX;

    if (Math.abs(deltaY) > 5 || Math.abs(deltaX) > 5) {
      this.hasDragged = true;
    }

    // Vertical movement
    const windowHeight = window.innerHeight;
    const deltaPercent = (deltaY / windowHeight) * 100;
    let newY = this.dragStartButtonY + deltaPercent;
    newY = Math.max(10, Math.min(90, newY));

    // Horizontal stretch (droplet effect) - stretch in direction of drag
    let rawStretch = Math.abs(deltaX);

    // Track which direction and distance we're dragging for side switch
    if (this.isDragging === 'feedback') {
      (this as any)._lastDragDirection = deltaX > 0 ? 'right' : 'left';
      (this as any)._lastDragDistance = rawStretch;
    } else {
      (this as any)._lastDragDirectionFootball = deltaX > 0 ? 'right' : 'left';
      (this as any)._lastDragDistanceFootball = rawStretch;
    }

    // Apply elastic resistance for visual stretch - use easing for more natural feel
    // Starts responsive, then gradually resists more (like stretching rubber)
    const elasticStretch = rawStretch * (1 - rawStretch / 400); // Diminishing returns
    const visualStretch = Math.min(this.MAX_STRETCH, elasticStretch * 0.5);

    if (this.isDragging === 'feedback') {
      this.feedbackY = newY;
      this.feedbackStretch = visualStretch;
      this.applyRepulsion('feedback');
    } else if (this.isDragging === 'football') {
      this.footballY = newY;
      this.footballStretch = visualStretch;
      this.applyRepulsion('football');
    }
  }

  private handleDragEnd(): void {
    if (this.isDragging) {
      const widget = this.isDragging;
      const dragDirection = widget === 'feedback'
        ? (this as any)._lastDragDirection
        : (this as any)._lastDragDirectionFootball;
      const dragDistance = widget === 'feedback'
        ? (this as any)._lastDragDistance || 0
        : (this as any)._lastDragDistanceFootball || 0;

      // Check if should switch sides based on drag distance
      if (dragDistance >= this.SWITCH_DISTANCE && dragDirection) {
        // Switch to the direction we were dragging
        const newSide = dragDirection as 'left' | 'right';
        if (widget === 'feedback' && this.feedbackSide !== newSide) {
          this.feedbackSide = newSide;
          localStorage.setItem('feedbackButtonSide', this.feedbackSide);
        } else if (widget === 'football' && this.footballSide !== newSide) {
          this.footballSide = newSide;
          localStorage.setItem('footballWidgetSide', this.footballSide);
        }
      }

      // Set releasing state for bounce-back animation
      this.isReleasing = widget;

      // Reset stretch with animation (handled by CSS transition)
      this.feedbackStretch = 0;
      this.footballStretch = 0;

      // Clear releasing state after animation completes
      setTimeout(() => {
        if (this.isReleasing === widget) {
          this.isReleasing = null;
        }
      }, 500); // Match CSS transition duration

      // Clear drag tracking
      (this as any)._lastDragDistance = 0;
      (this as any)._lastDragDistanceFootball = 0;

      if (this.hasDragged) {
        // Save positions
        localStorage.setItem('feedbackButtonY', this.feedbackY.toString());
        localStorage.setItem('footballWidgetY', this.footballY.toString());
      }
      this.isDragging = null;
    }
  }

  startDrag(event: MouseEvent | TouchEvent, widget: 'feedback' | 'football'): void {
    this.isDragging = widget;
    this.isReleasing = null; // Clear any releasing animation
    this.hasDragged = false;
    this.dragStartButtonY = widget === 'feedback' ? this.feedbackY : this.footballY;
    this.feedbackWasAbove = this.feedbackY < this.footballY;
    if (event instanceof MouseEvent) {
      this.dragStartY = event.clientY;
      this.dragStartX = event.clientX;
    } else {
      this.dragStartY = event.touches[0].clientY;
      this.dragStartX = event.touches[0].clientX;
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
    document.body.style.overflow = this.isDialogOpen ? 'hidden' : '';
  }

  closeDialog(): void {
    this.isDialogOpen = false;
    document.body.style.overflow = '';
    this.clearImage();
  }

  minimize(): void {
    this.isDialogOpen = false;
    document.body.style.overflow = '';
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
