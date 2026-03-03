import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';

interface StatCard {
  label: string;
  value: string | number;
  sub?: string;
  icon: string;
  color: string;
  route: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      <div class="page-header">
        <h2>Dashboard Overview</h2>
        <p class="welcome">Welcome back, <strong>{{ auth.user()?.firstName }}</strong> 👋</p>
      </div>

      @if (loading()) {
        <div class="loading-grid">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="skeleton-card"></div>
          }
        </div>
      } @else if (stats()) {
        <div class="stat-grid">
          @for (card of statCards(); track card.label) {
            <a class="stat-card" [routerLink]="card.route" [style.--accent]="card.color">
              <div class="card-icon">{{ card.icon }}</div>
              <div class="card-body">
                <div class="card-value">{{ card.value }}</div>
                <div class="card-label">{{ card.label }}</div>
                @if (card.sub) {
                  <div class="card-sub">{{ card.sub }}</div>
                }
              </div>
            </a>
          }
        </div>

        <!-- Quick actions -->
        <div class="section">
          <h3>Quick Actions</h3>
          <div class="action-grid">
            @for (action of quickActions; track action.label) {
              <a [routerLink]="action.route" class="action-card">
                <span class="action-icon">{{ action.icon }}</span>
                <span>{{ action.label }}</span>
              </a>
            }
          </div>
        </div>
      }

      @if (error()) {
        <div class="alert-error">Failed to load dashboard: {{ error() }}</div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 1200px; }
    .page-header { margin-bottom: 2rem; }
    .page-header h2 { font-size: 1.75rem; font-weight: 700; color: #2d3748; margin: 0 0 0.25rem; }
    .welcome { color: #718096; margin: 0; }

    .stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.25rem; margin-bottom: 2rem; }
    .stat-card {
      background: white;
      border-radius: 14px;
      padding: 1.5rem;
      display: flex;
      gap: 1rem;
      align-items: flex-start;
      border: 1px solid #e2e8f0;
      text-decoration: none;
      transition: transform 0.15s, box-shadow 0.15s;
      border-left: 4px solid var(--accent);
    }
    .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.08); }
    .card-icon { font-size: 2rem; line-height: 1; }
    .card-value { font-size: 1.75rem; font-weight: 800; color: #2d3748; line-height: 1; }
    .card-label { font-size: 0.875rem; color: #718096; margin-top: 0.25rem; font-weight: 500; }
    .card-sub { font-size: 0.75rem; color: var(--accent); margin-top: 0.25rem; font-weight: 600; }

    .loading-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.25rem; }
    .skeleton-card {
      height: 100px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 37%, #f0f0f0 63%);
      border-radius: 14px;
      background-size: 400% 100%;
      animation: shimmer 1.4s ease infinite;
    }
    @keyframes shimmer { 0%{background-position:100% 50%} 100%{background-position:0 50%} }

    .section { margin-top: 1rem; }
    .section h3 { font-size: 1.125rem; font-weight: 700; color: #4a5568; margin-bottom: 1rem; }
    .action-grid { display: flex; flex-wrap: wrap; gap: 0.75rem; }
    .action-card {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      text-decoration: none;
      color: #4a5568;
      font-weight: 600;
      font-size: 0.9rem;
      transition: background 0.15s;
    }
    .action-card:hover { background: #edf2f7; }
    .action-icon { font-size: 1.1rem; }
    .alert-error { padding: 1rem; background: #fff5f5; color: #c53030; border-radius: 10px; }
  `],
})
export class HomeComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);

  loading = signal(true);
  error = signal('');
  stats = signal<any>(null);

  statCards = signal<StatCard[]>([]);

  quickActions = [
    { label: 'Add Resident', icon: '👤', route: '/dashboard/residents' },
    { label: 'Create Bill', icon: '📄', route: '/dashboard/maintenance' },
    { label: 'Log Complaint', icon: '📋', route: '/dashboard/complaints' },
    { label: 'Register Visitor', icon: '🚪', route: '/dashboard/visitors' },
    { label: 'Manage Parking', icon: '🅿️', route: '/dashboard/parking' },
    { label: 'Inventory', icon: '📦', route: '/dashboard/inventory' },
  ];

  ngOnInit() {
    this.api.getDashboardStats().subscribe({
      next: (res) => {
        this.loading.set(false);
        const d = res.data;
        this.stats.set(d);
        this.statCards.set([
          {
            label: 'Residents',
            value: d.residents?.total ?? 0,
            sub: `${d.residents?.active ?? 0} active`,
            icon: '👥',
            color: '#667eea',
            route: '/dashboard/residents',
          },
          {
            label: 'Pending Bills',
            value: d.maintenance?.pending ?? 0,
            sub: `${d.maintenance?.overdue ?? 0} overdue`,
            icon: '💰',
            color: '#f6ad55',
            route: '/dashboard/maintenance',
          },
          {
            label: 'Open Complaints',
            value: d.complaints?.open ?? 0,
            sub: `${d.complaints?.total ?? 0} total`,
            icon: '📋',
            color: '#fc8181',
            route: '/dashboard/complaints',
          },
          {
            label: 'Visitors Today',
            value: d.visitors?.today ?? 0,
            icon: '🚪',
            color: '#68d391',
            route: '/dashboard/visitors',
          },
          {
            label: 'Parking Available',
            value: d.parking?.available ?? 0,
            sub: `${d.parking?.occupied ?? 0} occupied`,
            icon: '🅿️',
            color: '#4299e1',
            route: '/dashboard/parking',
          },
          {
            label: 'Low Stock Items',
            value: d.inventory?.lowStock ?? 0,
            icon: '📦',
            color: '#ed64a6',
            route: '/dashboard/inventory',
          },
        ]);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message ?? 'Unknown error');
      },
    });
  }
}
