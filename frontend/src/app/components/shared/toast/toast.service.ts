import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
  removing?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toasts$ = new BehaviorSubject<Toast[]>([]);
  private nextId = 0;

  get toasts() {
    return this.toasts$.asObservable();
  }

  show(message: string, type: 'success' | 'error' = 'success'): void {
    const id = this.nextId++;
    const toast: Toast = { id, message, type };
    this.toasts$.next([...this.toasts$.value, toast]);

    setTimeout(() => this.remove(id), 3000);
  }

  private remove(id: number): void {
    // Mark as removing for exit animation
    const current = this.toasts$.value.map(t =>
      t.id === id ? { ...t, removing: true } : t
    );
    this.toasts$.next(current);

    // Remove from DOM after animation
    setTimeout(() => {
      this.toasts$.next(this.toasts$.value.filter(t => t.id !== id));
    }, 300);
  }
}
