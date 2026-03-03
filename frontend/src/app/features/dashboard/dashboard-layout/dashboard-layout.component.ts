import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
}

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout" [class.sidebar-open]="sidebarOpen()">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <span class="logo-icon">🏢</span>
          <span class="logo-text">SocietyTracker</span>
        </div>

        <div class="tenant-badge" *ngIf="auth.user()?.tenantId">
          <span class="badge-dot"></span>
          <span class="badge-text">{{ auth.user()?.role }}</span>
        </div>

        <nav class="nav">
          @for (item of visibleNav(); track item.route) {
            <a
              class="nav-item"
              [routerLink]="item.route"
              routerLinkActive="active"
              (click)="closeSidebar()"
            >
              <span class="nav-icon">{{ item.icon }}</span>
              <span class="nav-label">{{ item.label }}</span>
            </a>
          }
        </nav>

        <div class="sidebar-footer">
          <div class="user-info">
            <div class="avatar">{{ userInitials() }}</div>
            <div class="user-meta">
              <span class="user-name">{{ auth.user()?.firstName }} {{ auth.user()?.lastName }}</span>
              <span class="user-email">{{ auth.user()?.email }}</span>
            </div>
          </div>
          <button class="logout-btn" (click)="logout()">⏻ Logout</button>
        </div>
      </aside>

      <!-- Overlay for mobile -->
      <div class="overlay" (click)="closeSidebar()"></div>

      <!-- Main content -->
      <main class="main">
        <header class="topbar">
          <button class="menu-btn" (click)="sidebarOpen.set(!sidebarOpen())">☰</button>
          <div class="topbar-right">
            <span class="user-chip">
              <span class="avatar-sm">{{ userInitials() }}</span>
              {{ auth.user()?.firstName }}
            </span>
          </div>
        </header>
        <div class="content">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; }
    .layout { display: flex; height: 100vh; overflow: hidden; }

    /* ── Sidebar ── */
    .sidebar {
      width: 260px;
      min-width: 260px;
      background: #1a202c;
      color: white;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      transition: transform 0.3s;
      z-index: 100;
    }
    .sidebar-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1.5rem 1.25rem 1rem;
      font-size: 1.25rem;
      font-weight: 700;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .logo-icon { font-size: 1.75rem; }
    .logo-text { color: #90cdf4; }

    .tenant-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      background: rgba(255,255,255,0.05);
    }
    .badge-dot { width: 8px; height: 8px; background: #68d391; border-radius: 50%; }
    .badge-text { font-size: 0.75rem; color: #a0aec0; text-transform: uppercase; letter-spacing: 0.08em; }

    .nav { flex: 1; padding: 0.75rem 0.75rem; display: flex; flex-direction: column; gap: 0.25rem; }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 0.75rem 1rem;
      border-radius: 10px;
      color: #a0aec0;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      transition: background 0.15s, color 0.15s;
    }
    .nav-item:hover { background: rgba(255,255,255,0.08); color: white; }
    .nav-item.active { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
    .nav-icon { font-size: 1.1rem; width: 1.5rem; text-align: center; }

    .sidebar-footer {
      padding: 1rem;
      border-top: 1px solid rgba(255,255,255,0.08);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .user-info { display: flex; align-items: center; gap: 0.75rem; }
    .avatar {
      width: 38px; height: 38px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 0.875rem; color: white;
      flex-shrink: 0;
    }
    .user-meta { overflow: hidden; }
    .user-name { display: block; font-size: 0.875rem; font-weight: 600; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .user-email { display: block; font-size: 0.75rem; color: #718096; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .logout-btn {
      width: 100%;
      padding: 0.6rem;
      background: rgba(245,101,101,0.15);
      color: #fc8181;
      border: 1px solid rgba(245,101,101,0.3);
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 600;
      transition: background 0.2s;
    }
    .logout-btn:hover { background: rgba(245,101,101,0.3); }

    /* ── Main ── */
    .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #f7fafc; }
    .topbar {
      height: 64px;
      background: white;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      flex-shrink: 0;
    }
    .menu-btn {
      display: none;
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #4a5568;
    }
    .topbar-right { display: flex; align-items: center; }
    .user-chip {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.4rem 0.875rem;
      background: #edf2f7;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 600;
      color: #4a5568;
    }
    .avatar-sm {
      width: 26px; height: 26px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.7rem; font-weight: 700; color: white;
    }
    .content { flex: 1; overflow-y: auto; padding: 2rem; }
    .overlay { display: none; }

    /* ── Mobile ── */
    @media (max-width: 768px) {
      .sidebar {
        position: fixed;
        top: 0; left: 0; bottom: 0;
        transform: translateX(-100%);
      }
      .layout.sidebar-open .sidebar { transform: translateX(0); }
      .layout.sidebar-open .overlay {
        display: block;
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.5);
        z-index: 99;
      }
      .menu-btn { display: block; }
      .content { padding: 1rem; }
    }
  `],
})
export class DashboardLayoutComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  sidebarOpen = signal(false);

  private allNav: NavItem[] = [
    { label: 'Dashboard',    icon: '📊', route: '/dashboard/home' },
    { label: 'Residents',    icon: '👥', route: '/dashboard/residents' },
    { label: 'Maintenance',  icon: '💰', route: '/dashboard/maintenance' },
    { label: 'Complaints',   icon: '📋', route: '/dashboard/complaints' },
    { label: 'Visitors',     icon: '🚪', route: '/dashboard/visitors' },
    { label: 'Inventory',    icon: '📦', route: '/dashboard/inventory' },
    { label: 'Parking',      icon: '🅿️',  route: '/dashboard/parking' },
    { label: 'Subscription', icon: '💳', route: '/dashboard/subscription', roles: ['SOCIETY_ADMIN', 'SUPER_ADMIN', 'PLATFORM_OWNER'] },
    { label: 'Admin Panel',  icon: '⚙️',  route: '/dashboard/admin',        roles: ['SUPER_ADMIN', 'PLATFORM_OWNER'] },
  ];

  visibleNav = computed(() => {
    const role = this.auth.userRole();
    return this.allNav.filter(n => !n.roles || (role && n.roles.includes(role)));
  });

  userInitials = computed(() => {
    const u = this.auth.user();
    if (!u) return '?';
    return `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase();
  });

  closeSidebar() { this.sidebarOpen.set(false); }

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}
