import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { IconComponent } from '../shared/icon/icon';
import { MENU } from '../shared/menu';

@Component({
  selector: 'app-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, IconComponent],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  menu = MENU;
  collapsed = signal(false);
  darkMode = signal(false);
  openGroups = signal<Set<string>>(new Set());
  pageTitle = signal(this.resolveTitle());

  constructor() {
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) {
        this.pageTitle.set(this.resolveTitle());
      }
    });
  }

  private resolveTitle(): string {
    let child: ActivatedRoute | null = this.route;
    while (child?.firstChild) child = child.firstChild;
    return child?.snapshot?.data?.['title'] ?? 'Dashboard';
  }

  toggleSidebar() {
    this.collapsed.update((v) => !v);
  }

  toggleGroup(label: string) {
    this.openGroups.update((set) => {
      const next = new Set(set);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  isGroupOpen(label: string) {
    return this.openGroups().has(label);
  }

  toggleDarkMode() {
    this.darkMode.update((v) => !v);
    document.documentElement.classList.toggle('dark', this.darkMode());
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }
}
