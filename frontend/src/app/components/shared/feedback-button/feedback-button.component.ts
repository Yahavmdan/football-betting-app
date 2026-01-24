import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TranslationService } from '../../../services/translation.service';
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
  isMinimized = false;
  message = '';
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  // Image upload
  selectedImage: File | null = null;
  imagePreview: string | null = null;

  constructor(
    private http: HttpClient,
    private translationService: TranslationService
  ) {
    // Load minimized state from localStorage
    this.isMinimized = localStorage.getItem('feedbackMinimized') === 'true';
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }

  toggleDialog(): void {
    if (this.isMinimized) {
      this.isMinimized = false;
      localStorage.setItem('feedbackMinimized', 'false');
    }
    this.isDialogOpen = !this.isDialogOpen;
    this.clearMessages();
  }

  closeDialog(): void {
    this.isDialogOpen = false;
    this.clearMessages();
    this.clearImage();
  }

  minimize(): void {
    this.isMinimized = true;
    this.isDialogOpen = false;
    localStorage.setItem('feedbackMinimized', 'true');
    this.clearMessages();
  }

  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
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
        this.errorMessage = this.t('feedback.invalidFileType');
        return;
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = this.t('profile.fileTooLarge');
        return;
      }

      this.selectedImage = file;
      this.clearMessages();

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
    this.clearMessages();

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
          this.successMessage = this.t('feedback.successMessage');
          this.message = '';
          this.clearImage();
          this.isSubmitting = false;
          setTimeout(() => {
            this.closeDialog();
          }, 2000);
        },
        error: (err) => {
          if (err.status === 429) {
            this.errorMessage = this.t('feedback.rateLimitError');
          } else {
            this.errorMessage = this.t('feedback.errorMessage');
          }
          this.isSubmitting = false;
        }
      });
  }
}
