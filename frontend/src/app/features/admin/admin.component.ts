import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2>Admin Panel</h2>
          <p class="sub">Manage societies and platform overview</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        @for (tab of tabs; track tab.key) {
          <button class="tab" [class.active]="activeTab() === tab.key" (click)="activeTab.set(tab.key)">
            {{ tab.icon }} {{ tab.label }}
          </button>
        }
      </div>

      <!-- Platform Analytics -->
      @if (activeTab() === 'analytics') {
        @if (analytics()) {
          <div class="analytics-grid">
            @for (card of analyticsCards(); track card.label) {
              <div class="a-card" [style.--c]="card.color">
                <div class="a-value">{{ card.value }}</div>
                <div class="a-label">{{ card.label }}</div>
              </div>
            }
          </div>
        } @else {
          <div class="loading-text">Loading analytics...</div>
        }
      }

      <!-- Tenants list -->
      @if (activeTab() === 'tenants') {
        <div class="section-header">
          <h3>All Societies</h3>
          <button class="btn-primary" (click)="openModal()">+ Add Society</button>
        </div>

        <div class="table-card">
          @if (tenantsLoading()) {
            <div class="loading-text">Loading...</div>
          } @else {
            <table>
              <thead>
                <tr>
                  <th>Society Name</th>
                  <th>Plan</th>
                  <th>Flats</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (t of tenants(); track t._id) {
                  <tr>
                    <td>
                      <div class="tenant-name">
                        <strong>{{ t.name }}</strong>
                        <span class="slug">{{ t.slug }}</span>
                      </div>
                    </td>
                    <td><span class="plan-badge">{{ t.subscription?.plan ?? 'None' }}</span></td>
                    <td>{{ t.totalFlats }}</td>
                    <td><span class="status-badge" [class.active]="!t.isBlocked">{{ t.isBlocked ? 'Blocked' : 'Active' }}</span></td>
                    <td>{{ t.createdAt | date:'dd MMM yyyy' }}</td>
                    <td>
                      <div class="action-btns">
                        @if (t.isBlocked) {
                          <button class="btn-sm btn-unblock" (click)="unblock(t._id)">🔓 Unblock</button>
                        } @else {
                          <button class="btn-sm btn-block" (click)="openBlockModal(t)">🔒 Block</button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      }

      <!-- All Subscriptions -->
      @if (activeTab() === 'subscriptions') {
        <div class="table-card">
          @if (subsLoading()) {
            <div class="loading-text">Loading...</div>
          } @else {
            <table>
              <thead>
                <tr>
                  <th>Society</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Expires</th>
                </tr>
              </thead>
              <tbody>
                @for (s of subscriptions(); track s._id) {
                  <tr>
                    <td>{{ s.tenantId?.name ?? s.tenantId }}</td>
                    <td><span class="plan-badge">{{ s.plan }}</span></td>
                    <td><span class="status-badge" [class.active]="s.status === 'active'">{{ s.status | titlecase }}</span></td>
                    <td>\${{ s.amount ?? '—' }}</td>
                    <td>{{ s.currentPeriodEnd ? (s.currentPeriodEnd | date:'dd MMM yyyy') : '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      }
    </div>

    <!-- Add Society Modal -->
    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Add New Society</h3>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>
          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="form-group">
              <label>Society Name *</label>
              <input formControlName="name" placeholder="Green Valley Society" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Total Flats *</label>
                <input type="number" formControlName="totalFlats" placeholder="100" />
              </div>
              <div class="form-group">
                <label>Plan</label>
                <select formControlName="plan">
                  <option value="BASIC">Basic</option>
                  <option value="PRO">Pro</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Address</label>
              <input formControlName="address" placeholder="123 Main St, City" />
            </div>
            @if (formError()) { <div class="form-err">{{ formError() }}</div> }
            <div class="modal-footer">
              <button type="button" class="btn-cancel" (click)="closeModal()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Creating...' : 'Create' }}</button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Block Reason Modal -->
    @if (showBlockModal()) {
      <div class="modal-overlay" (click)="closeBlockModal()">
        <div class="modal modal-sm" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Block Society</h3>
            <button class="close-btn" (click)="closeBlockModal()">✕</button>
          </div>
          <div class="form-group">
            <label>Reason for blocking</label>
            <textarea [(ngModel)]="blockReason" rows="3" placeholder="e.g. Unpaid dues, Policy violation..." class="block-textarea"></textarea>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" (click)="closeBlockModal()">Cancel</button>
            <button class="btn-danger" (click)="blockTenant()">Block Society</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page { max-width: 1100px; }
    .page-header { margin-bottom: 1.5rem; }
    .page-header h2 { font-size: 1.5rem; font-weight: 700; color: #2d3748; margin: 0 0 0.25rem; }
    .sub { color: #718096; font-size: 0.875rem; margin: 0; }
    .tabs { display: flex; gap: 0.25rem; margin-bottom: 1.5rem; background: #f7fafc; border-radius: 10px; padding: 0.25rem; width: fit-content; }
    .tab { padding: 0.625rem 1.25rem; border: none; background: transparent; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.875rem; color: #718096; transition: all 0.15s; }
    .tab.active { background: white; color: #667eea; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .analytics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .a-card { background: white; border-radius: 12px; padding: 1.5rem; border-left: 4px solid var(--c); border: 1px solid #e2e8f0; border-left: 4px solid var(--c); }
    .a-value { font-size: 1.75rem; font-weight: 800; color: #2d3748; }
    .a-label { font-size: 0.8rem; color: #718096; margin-top: 0.25rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .section-header h3 { font-size: 1.125rem; font-weight: 700; color: #4a5568; margin: 0; }
    .btn-primary { padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .table-card { background: white; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th { padding: 1rem 1.25rem; text-align: left; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #718096; background: #f7fafc; border-bottom: 1px solid #e2e8f0; }
    td { padding: 1rem 1.25rem; border-bottom: 1px solid #f0f4f8; font-size: 0.9rem; color: #4a5568; }
    tr:last-child td { border-bottom: none; }
    .tenant-name { display: flex; flex-direction: column; }
    .tenant-name strong { color: #2d3748; }
    .slug { font-size: 0.75rem; color: #a0aec0; }
    .plan-badge { display: inline-block; padding: 0.2rem 0.6rem; background: #ebf8ff; color: #2b6cb0; border-radius: 20px; font-size: 0.8rem; font-weight: 700; }
    .status-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; background: #fff5f5; color: #c53030; }
    .status-badge.active { background: #f0fff4; color: #276749; }
    .action-btns { display: flex; gap: 0.5rem; }
    .btn-sm { padding: 0.4rem 0.75rem; border: none; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 600; }
    .btn-block { background: #fff5f5; color: #c53030; }
    .btn-unblock { background: #f0fff4; color: #276749; }
    .loading-text { padding: 2rem; text-align: center; color: #a0aec0; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 1rem; }
    .modal { background: white; border-radius: 16px; padding: 2rem; width: 100%; max-width: 480px; box-shadow: 0 25px 60px rgba(0,0,0,0.2); }
    .modal-sm { max-width: 400px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .modal-header h3 { font-size: 1.25rem; font-weight: 700; color: #2d3748; margin: 0; }
    .close-btn { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: #a0aec0; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
    .form-group label { font-size: 0.875rem; font-weight: 600; color: #4a5568; }
    .form-group input, .form-group select { padding: 0.7rem 1rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; }
    .form-group input:focus, .form-group select:focus { outline: none; border-color: #667eea; }
    .block-textarea { padding: 0.7rem 1rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; width: 100%; box-sizing: border-box; resize: vertical; }
    .form-err { padding: 0.75rem; background: #fff5f5; color: #c53030; border-radius: 8px; font-size: 0.875rem; margin-bottom: 1rem; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; }
    .btn-cancel { padding: 0.7rem 1.5rem; border: 2px solid #e2e8f0; background: white; border-radius: 8px; font-weight: 600; cursor: pointer; color: #4a5568; }
    .btn-danger { padding: 0.7rem 1.5rem; background: #c53030; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
  `],
})
export class AdminComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  auth = inject(AuthService);

  activeTab = signal<string>('analytics');
  analytics = signal<any>(null);
  tenants = signal<any[]>([]);
  subscriptions = signal<any[]>([]);
  tenantsLoading = signal(false);
  subsLoading = signal(false);

  showModal = signal(false);
  showBlockModal = signal(false);
  selectedTenantId = signal<string | null>(null);
  blockReason = '';
  saving = signal(false);
  formError = signal('');

  tabs = [
    { key: 'analytics', label: 'Analytics', icon: '📊' },
    { key: 'tenants', label: 'Societies', icon: '🏢' },
    { key: 'subscriptions', label: 'Subscriptions', icon: '💳' },
  ];

  analyticsCards() {
    const a = this.analytics();
    if (!a) return [];
    return [
      { label: 'Total Societies', value: a.totalTenants ?? 0, color: '#667eea' },
      { label: 'Active Tenants', value: a.activeTenants ?? 0, color: '#68d391' },
      { label: 'Total Users', value: a.totalUsers ?? 0, color: '#4299e1' },
      { label: 'Monthly Revenue', value: `$${(a.mrr ?? 0).toFixed(2)}`, color: '#f6ad55' },
      { label: 'Total Revenue', value: `$${(a.totalRevenue ?? 0).toFixed(2)}`, color: '#ed64a6' },
    ];
  }

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    totalFlats: [100, Validators.required],
    plan: ['BASIC'],
    address: [''],
  });

  ngOnInit() {
    this.loadAnalytics();
    this.loadTenants();
    this.loadSubscriptions();
  }

  loadAnalytics() {
    this.api.getPlatformAnalytics().subscribe({ next: (res) => this.analytics.set(res.data) });
  }

  loadTenants() {
    this.tenantsLoading.set(true);
    this.api.getAllTenants({ limit: 50 }).subscribe({
      next: (res) => { this.tenantsLoading.set(false); this.tenants.set(res.data ?? []); },
      error: () => this.tenantsLoading.set(false),
    });
  }

  loadSubscriptions() {
    this.subsLoading.set(true);
    this.api.getAllSubscriptions({ limit: 50 }).subscribe({
      next: (res) => { this.subsLoading.set(false); this.subscriptions.set(res.data ?? []); },
      error: () => this.subsLoading.set(false),
    });
  }

  openModal() { this.formError.set(''); this.form.reset({ totalFlats: 100, plan: 'BASIC' }); this.showModal.set(true); }
  closeModal() { this.showModal.set(false); }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.api.createTenant(this.form.value).subscribe({
      next: () => { this.saving.set(false); this.closeModal(); this.loadTenants(); },
      error: (err) => { this.saving.set(false); this.formError.set(err.error?.message ?? 'Error.'); },
    });
  }

  openBlockModal(t: any) { this.selectedTenantId.set(t._id); this.blockReason = ''; this.showBlockModal.set(true); }
  closeBlockModal() { this.showBlockModal.set(false); }

  blockTenant() {
    const id = this.selectedTenantId();
    if (!id) return;
    this.api.blockTenant(id, this.blockReason).subscribe({ next: () => { this.closeBlockModal(); this.loadTenants(); } });
  }

  unblock(id: string) {
    this.api.unblockTenant(id).subscribe({ next: () => this.loadTenants() });
  }
}
