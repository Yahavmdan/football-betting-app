import { Component, Input, OnInit, OnDestroy, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { TranslatePipe } from '../../../services/translate.pipe';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-dashboard-tabs',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  templateUrl: './dashboard-tabs.component.html',
  styleUrls: ['./dashboard-tabs.component.css']
})
export class DashboardTabsComponent implements OnInit, OnDestroy {
  @Input() activeTab: 'matches' | 'groups' | 'profile' = 'matches';
  currentUser: User | null = null;
  isStuck = false;

  private observer: IntersectionObserver | null = null;
  private sentinel: HTMLElement | null = null;

  constructor(
    private authService: AuthService,
    private el: ElementRef
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => this.currentUser = user);
    this.setupStickyObserver();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.sentinel?.remove();
  }

  private setupStickyObserver(): void {
    this.sentinel = document.createElement('div');
    this.sentinel.style.height = '1px';
    this.sentinel.style.width = '100%';
    this.sentinel.style.pointerEvents = 'none';
    this.sentinel.style.visibility = 'hidden';
    this.el.nativeElement.parentNode.insertBefore(this.sentinel, this.el.nativeElement);

    this.observer = new IntersectionObserver(
      ([entry]) => { this.isStuck = !entry.isIntersecting; },
      { threshold: 0, rootMargin: '-70px 0px 0px 0px' }
    );
    this.observer.observe(this.sentinel);
  }
}
