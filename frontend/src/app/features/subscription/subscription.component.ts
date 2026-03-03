import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

interface Plan {
  key: string;
  name: string;
  price: number;
  flats: number | string;
  features: string[];
  popular?: boolean;
}

@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2>Subscription & Billing</h2>
          <p class="sub">Manage your society's plan</p>
        </div>
      </div>

      @if (successMsg()) {
        <div class="alert alert-success">🎉 {{ successMsg() }}</div>
      }
      @if (cancelMsg()) {
        <div class="alert alert-warn">Payment was cancelled. You can try again anytime.</div>
      }

      <!-- Current subscription -->
      @if (subscription()) {
        <div class="current-plan">
          <div class="plan-info">
            <span class="plan-badge">{{ subscription().plan | uppercase }}</span>
            <div>
              <h3>Current Plan: {{ subscription().plan | titlecase }}</h3>
              <p>Status: <span class="status" [class.active]="subscription().status === 'active'">{{ subscription().status | titlecase }}</span></p>
              <p *ngIf="subscription().currentPeriodEnd">Renews: {{ subscription().currentPeriodEnd | date:'dd MMM yyyy' }}</p>
            </div>
          </div>
          <button class="btn-danger" (click)="cancel()" [disabled]="cancelling()">
            {{ cancelling() ? 'Cancelling...' : 'Cancel Subscription' }}
          </button>
        </div>
      } @else {
        <div class="no-plan-banner">
          <span>⚠️</span>
          <span>No active subscription. Choose a plan below to unlock all features.</span>
        </div>
      }

      <!-- Plans -->
      <h3 class="plans-title">Available Plans</h3>
      <div class="plans-grid">
        @for (plan of plans; track plan.key) {
          <div class="plan-card" [class.popular]="plan.popular">
            @if (plan.popular) { <div class="popular-tag">Most Popular</div> }
            <h4>{{ plan.name }}</h4>
            <div class="price">
              \${{ plan.price }}<span class="per-mo">/month</span>
            </div>
            <div class="flat-limit">Up to {{ plan.flats }} flats</div>
            <ul class="features">
              @for (f of plan.features; track f) {
                <li>✓ {{ f }}</li>
              }
            </ul>
            <button class="plan-btn" [class.popular]="plan.popular" (click)="checkout(plan.key)" [disabled]="checkingOut()">
              {{ checkingOut() === plan.key ? 'Redirecting...' : 'Get ' + plan.name }}
            </button>
          </div>
        }
      </div>

      <!-- Payment history -->
      @if (payments().length) {
        <div class="payment-history">
          <h3>Payment History</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Invoice</th>
              </tr>
            </thead>
            <tbody>
              @for (p of payments(); track p._id) {
                <tr>
                  <td>{{ p.createdAt | date:'dd MMM yyyy' }}</td>
                  <td>\${{ (p.amount / 100) | number:'1.2-2' }}</td>
                  <td><span class="status-badge" [class.active]="p.status === 'succeeded'">{{ p.status }}</span></td>
                  <td>
                    <a *ngIf="p.invoiceUrl" [href]="p.invoiceUrl" target="_blank" class="invoice-link">View →</a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styleUrl: './subscription.component.css',
})
export class SubscriptionComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  private route = inject(ActivatedRoute);

  subscription = signal<any>(null);
  payments = signal<any[]>([]);
  checkingOut = signal<string | null>(null);
  cancelling = signal(false);
  successMsg = signal('');
  cancelMsg = signal(false);

  plans: Plan[] = [
    {
      key: 'BASIC',
      name: 'Basic',
      price: 9.99,
      flats: 50,
      features: ['Up to 50 flats', 'All modules', 'Email support', '1 admin user'],
    },
    {
      key: 'PRO',
      name: 'Pro',
      price: 29.99,
      flats: 200,
      features: ['Up to 200 flats', 'All modules', 'Priority support', '5 admin users', 'Analytics dashboard'],
      popular: true,
    },
    {
      key: 'ENTERPRISE',
      name: 'Enterprise',
      price: 99.99,
      flats: 'Unlimited',
      features: ['Unlimited flats', 'All modules', '24/7 support', 'Unlimited admins', 'Advanced analytics', 'Custom integrations'],
    },
  ];

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['success'] === 'true') this.successMsg.set('Subscription activated successfully!');
      if (params['canceled'] === 'true') this.cancelMsg.set(true);
    });
    this.loadData();
  }

  loadData() {
    this.api.getMySubscription().subscribe({ next: (res) => this.subscription.set(res.data) });
    this.api.getPlatformRevenue().subscribe({ next: (res) => this.payments.set((res.data as any)?.payments ?? []) });
  }

  checkout(plan: string) {
    this.checkingOut.set(plan);
    this.api.createCheckout(plan).subscribe({
      next: (res) => { window.location.href = (res.data as any).url; },
      error: () => this.checkingOut.set(null),
    });
  }

  cancel() {
    this.cancelling.set(true);
    this.api.cancelSubscription().subscribe({
      next: () => { this.cancelling.set(false); this.loadData(); },
      error: () => this.cancelling.set(false),
    });
  }
}
