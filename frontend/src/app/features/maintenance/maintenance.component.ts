import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2>Maintenance Billing</h2>
          <p class="sub">Track and manage monthly maintenance charges</p>
        </div>
        <div class="header-btns" *ngIf="canManage()">
          <button class="btn-secondary" (click)="openBulkModal()">⚡ Bulk Create</button>
          <button class="btn-primary" (click)="openModal()">+ New Bill</button>
        </div>
      </div>

      <!-- Summary cards -->
      @if (summary()) {
        <div class="summary-grid">
          @for (s of summaryCards(); track s.label) {
            <div class="summary-card" [style.--c]="s.color">
              <div class="s-value">{{ s.value }}</div>
              <div class="s-label">{{ s.label }}</div>
            </div>
          }
        </div>
      }

      <!-- Filters -->
      <div class="filters">
        <input class="search-input" [(ngModel)]="search" (input)="onSearch()" placeholder="🔍  Search resident..." />
        <select class="select" [(ngModel)]="statusFilter" (change)="load()">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
        <select class="select" [(ngModel)]="monthFilter" (change)="load()">
          <option value="">All Months</option>
          @for (m of months; track m.value) {
            <option [value]="m.value">{{ m.label }}</option>
          }
        </select>
      </div>

      <!-- Table -->
      <div class="table-card">
        @if (loading()) {
          <div class="loading-rows">
            @for (i of [1,2,3,4,5]; track i) { <div class="skeleton-row"></div> }
          </div>
        } @else if (bills().length === 0) {
          <div class="empty">No bills found.</div>
        } @else {
          <table>
            <thead>
              <tr>
                <th>Resident</th>
                <th>Period</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th *ngIf="canManage()">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (b of bills(); track b._id) {
                <tr>
                  <td>
                    <div class="name-cell">
                      <div class="avatar-sm">{{ initials(b.userId) }}</div>
                      {{ b.userId?.firstName }} {{ b.userId?.lastName }}
                    </div>
                  </td>
                  <td>{{ monthName(b.month) }} {{ b.year }}</td>
                  <td class="amount">₹{{ b.amount | number }}</td>
                  <td>{{ b.dueDate | date:'dd MMM yyyy' }}</td>
                  <td><span class="status-badge" [class]="b.status">{{ b.status | titlecase }}</span></td>
                  <td *ngIf="canManage()">
                    @if (b.status !== 'paid') {
                      <button class="btn-sm" (click)="markPaid(b._id)">✅ Mark Paid</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <div class="pagination">
            <button [disabled]="page() <= 1" (click)="changePage(page()-1)">← Prev</button>
            <span>Page {{ page() }} / {{ totalPages() }}</span>
            <button [disabled]="page() >= totalPages()" (click)="changePage(page()+1)">Next →</button>
          </div>
        }
      </div>
    </div>

    <!-- Single Bill Modal -->
    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>New Maintenance Bill</h3>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>
          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="form-group">
              <label>Resident ID *</label>
              <input formControlName="userId" placeholder="Resident MongoDB ID" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Month (1-12) *</label>
                <input type="number" formControlName="month" min="1" max="12" />
              </div>
              <div class="form-group">
                <label>Year *</label>
                <input type="number" formControlName="year" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Amount (₹) *</label>
                <input type="number" formControlName="amount" placeholder="2000" />
              </div>
              <div class="form-group">
                <label>Due Date *</label>
                <input type="date" formControlName="dueDate" />
              </div>
            </div>
            @if (formError()) { <div class="form-err">{{ formError() }}</div> }
            <div class="modal-footer">
              <button type="button" class="btn-cancel" (click)="closeModal()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Saving...' : 'Create Bill' }}</button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Bulk Modal -->
    @if (showBulkModal()) {
      <div class="modal-overlay" (click)="closeBulkModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>⚡ Bulk Create Bills</h3>
            <button class="close-btn" (click)="closeBulkModal()">✕</button>
          </div>
          <form [formGroup]="bulkForm" (ngSubmit)="saveBulk()">
            <div class="form-row">
              <div class="form-group">
                <label>Month (1-12) *</label>
                <input type="number" formControlName="month" min="1" max="12" />
              </div>
              <div class="form-group">
                <label>Year *</label>
                <input type="number" formControlName="year" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Amount per flat (₹) *</label>
                <input type="number" formControlName="amount" placeholder="2000" />
              </div>
              <div class="form-group">
                <label>Due Date *</label>
                <input type="date" formControlName="dueDate" />
              </div>
            </div>
            <div class="info-box">Bills will be created for all active residents in this society.</div>
            @if (bulkFormError()) { <div class="form-err">{{ bulkFormError() }}</div> }
            <div class="modal-footer">
              <button type="button" class="btn-cancel" (click)="closeBulkModal()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Creating...' : 'Create Bulk Bills' }}</button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: [`
    .page { max-width: 1100px; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; }
    .page-header h2 { font-size: 1.5rem; font-weight: 700; color: #2d3748; margin: 0 0 0.25rem; }
    .sub { color: #718096; font-size: 0.875rem; margin: 0; }
    .header-btns { display: flex; gap: 0.75rem; }
    .btn-primary { padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-secondary { padding: 0.75rem 1.5rem; border: 2px solid #667eea; color: #667eea; background: white; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .summary-card { background: white; border-radius: 12px; padding: 1.25rem; border-left: 4px solid var(--c); border: 1px solid #e2e8f0; border-left: 4px solid var(--c); }
    .s-value { font-size: 1.75rem; font-weight: 800; color: #2d3748; }
    .s-label { font-size: 0.8rem; color: #718096; margin-top: 0.25rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
    .filters { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .search-input, .select { padding: 0.7rem 1rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; }
    .search-input { flex: 1; min-width: 220px; }
    .select { min-width: 140px; background: white; cursor: pointer; }
    .table-card { background: white; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th { padding: 1rem 1.25rem; text-align: left; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #718096; background: #f7fafc; border-bottom: 1px solid #e2e8f0; }
    td { padding: 1rem 1.25rem; border-bottom: 1px solid #f0f4f8; font-size: 0.9rem; color: #4a5568; }
    tr:last-child td { border-bottom: none; }
    .name-cell { display: flex; align-items: center; gap: 0.75rem; }
    .avatar-sm { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; flex-shrink: 0; }
    .amount { font-weight: 700; color: #276749; }
    .status-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
    .status-badge.pending { background: #fefcbf; color: #b7791f; }
    .status-badge.paid { background: #f0fff4; color: #276749; }
    .status-badge.overdue { background: #fff5f5; color: #c53030; }
    .btn-sm { padding: 0.4rem 0.75rem; border: none; border-radius: 6px; cursor: pointer; font-size: 0.8rem; background: #edf2f7; font-weight: 600; }
    .empty { text-align: center; padding: 3rem; color: #a0aec0; }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 1rem; border-top: 1px solid #e2e8f0; }
    .pagination button { padding: 0.5rem 1rem; border: 1px solid #e2e8f0; border-radius: 6px; background: white; cursor: pointer; font-weight: 600; color: #4a5568; }
    .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
    .pagination span { color: #718096; font-size: 0.875rem; }
    .skeleton-row { height: 56px; background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 37%, #f0f0f0 63%); background-size: 400% 100%; animation: shimmer 1.4s ease infinite; border-bottom: 1px solid #f0f4f8; }
    @keyframes shimmer { 0%{background-position:100% 50%} 100%{background-position:0 50%} }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 1rem; }
    .modal { background: white; border-radius: 16px; padding: 2rem; width: 100%; max-width: 480px; box-shadow: 0 25px 60px rgba(0,0,0,0.2); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .modal-header h3 { font-size: 1.25rem; font-weight: 700; color: #2d3748; margin: 0; }
    .close-btn { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: #a0aec0; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
    .form-group label { font-size: 0.875rem; font-weight: 600; color: #4a5568; }
    .form-group input { padding: 0.7rem 1rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; }
    .form-group input:focus { outline: none; border-color: #667eea; }
    .info-box { background: #ebf8ff; border: 1px solid #bee3f8; border-radius: 8px; padding: 0.75rem 1rem; font-size: 0.875rem; color: #2b6cb0; margin-bottom: 1rem; }
    .form-err { padding: 0.75rem; background: #fff5f5; color: #c53030; border-radius: 8px; font-size: 0.875rem; margin-bottom: 1rem; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; }
    .btn-cancel { padding: 0.7rem 1.5rem; border: 2px solid #e2e8f0; background: white; border-radius: 8px; font-weight: 600; cursor: pointer; color: #4a5568; }
  `],
})
export class MaintenanceComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  auth = inject(AuthService);

  bills = signal<any[]>([]);
  loading = signal(false);
  summary = signal<any>(null);
  search = '';
  statusFilter = '';
  monthFilter = '';
  page = signal(1);
  totalPages = signal(1);
  private searchDebounce: any;

  showModal = signal(false);
  showBulkModal = signal(false);
  saving = signal(false);
  formError = signal('');
  bulkFormError = signal('');

  months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: MONTHS[i] }));

  canManage = computed(() => {
    const r = this.auth.userRole();
    return ['SOCIETY_ADMIN', 'SUB_ADMIN', 'SUPER_ADMIN', 'PLATFORM_OWNER'].includes(r ?? '');
  });

  summaryCards = computed(() => {
    const s = this.summary();
    if (!s) return [];
    return [
      { label: 'Total Bills', value: s.totalBills ?? 0, color: '#667eea' },
      { label: 'Paid', value: s.paid ?? 0, color: '#68d391' },
      { label: 'Pending', value: s.pending ?? 0, color: '#f6ad55' },
      { label: 'Overdue', value: s.overdue ?? 0, color: '#fc8181' },
      { label: 'Collected ₹', value: `₹${(s.totalCollected ?? 0).toLocaleString()}`, color: '#4299e1' },
    ];
  });

  form: FormGroup = this.fb.group({
    userId: ['', Validators.required],
    month: [new Date().getMonth() + 1, [Validators.required, Validators.min(1), Validators.max(12)]],
    year: [new Date().getFullYear(), Validators.required],
    amount: ['', Validators.required],
    dueDate: ['', Validators.required],
  });

  bulkForm: FormGroup = this.fb.group({
    month: [new Date().getMonth() + 1, [Validators.required, Validators.min(1), Validators.max(12)]],
    year: [new Date().getFullYear(), Validators.required],
    amount: ['', Validators.required],
    dueDate: ['', Validators.required],
  });

  ngOnInit() { this.load(); this.loadSummary(); }

  load() {
    this.loading.set(true);
    this.api.getMaintenance({ page: this.page(), limit: 10, search: this.search, status: this.statusFilter || undefined, month: this.monthFilter || undefined }).subscribe({
      next: (res) => { this.loading.set(false); this.bills.set(res.data ?? []); this.totalPages.set(res.meta?.totalPages ?? 1); },
      error: () => this.loading.set(false),
    });
  }

  loadSummary() {
    this.api.getMaintenanceSummary(new Date().getFullYear()).subscribe({
      next: (res) => this.summary.set(res.data),
    });
  }

  onSearch() {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => { this.page.set(1); this.load(); }, 400);
  }

  changePage(p: number) { this.page.set(p); this.load(); }

  monthName(m: number) { return MONTHS[m - 1] ?? ''; }
  initials(u: any) { return `${u?.firstName?.[0] ?? ''}${u?.lastName?.[0] ?? ''}`.toUpperCase(); }

  openModal() { this.formError.set(''); this.form.reset({ month: new Date().getMonth() + 1, year: new Date().getFullYear() }); this.showModal.set(true); }
  closeModal() { this.showModal.set(false); }
  openBulkModal() { this.bulkFormError.set(''); this.bulkForm.reset({ month: new Date().getMonth() + 1, year: new Date().getFullYear() }); this.showBulkModal.set(true); }
  closeBulkModal() { this.showBulkModal.set(false); }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.api.createMaintenance(this.form.value).subscribe({
      next: () => { this.saving.set(false); this.closeModal(); this.load(); this.loadSummary(); },
      error: (err) => { this.saving.set(false); this.formError.set(err.error?.message ?? 'Error.'); },
    });
  }

  saveBulk() {
    if (this.bulkForm.invalid) { this.bulkForm.markAllAsTouched(); return; }
    this.saving.set(true);
    this.api.bulkCreateMaintenance(this.bulkForm.value).subscribe({
      next: () => { this.saving.set(false); this.closeBulkModal(); this.load(); this.loadSummary(); },
      error: (err) => { this.saving.set(false); this.bulkFormError.set(err.error?.message ?? 'Error.'); },
    });
  }

  markPaid(id: string) {
    const method = 'cash';
    this.api.recordPayment(id, { paymentMethod: method }).subscribe({ next: () => { this.load(); this.loadSummary(); } });
  }
}
