import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-visitors',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2>Visitor Management</h2>
          <p class="sub">Pre-register visitors and manage check-in/out</p>
        </div>
        <button class="btn-primary" (click)="openModal()">+ Register Visitor</button>
      </div>

      <div class="filters">
        <input class="search-input" [(ngModel)]="search" (input)="onSearch()" placeholder="🔍  Search visitors..." />
        <select class="select" [(ngModel)]="statusFilter" (change)="load()">
          <option value="">All Status</option>
          <option value="pre_registered">Pre-Registered</option>
          <option value="approved">Approved</option>
          <option value="checked_in">Checked In</option>
          <option value="checked_out">Checked Out</option>
        </select>
      </div>

      <div class="table-card">
        @if (loading()) {
          @for (i of [1,2,3,4]; track i) { <div class="skeleton-row"></div> }
        } @else if (visitors().length === 0) {
          <div class="empty">No visitors found.</div>
        } @else {
          <table>
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Purpose</th>
                <th>Host Resident</th>
                <th>Scheduled</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (v of visitors(); track v._id) {
                <tr>
                  <td>
                    <div class="name-cell">
                      <div class="visitor-icon">🚶</div>
                      <div>
                        <div class="v-name">{{ v.visitorName }}</div>
                        <div class="v-phone">{{ v.visitorPhone }}</div>
                      </div>
                    </div>
                  </td>
                  <td>{{ v.purpose | titlecase }}</td>
                  <td>{{ v.hostUserId?.firstName }} {{ v.hostUserId?.lastName }}</td>
                  <td>{{ v.scheduledDate | date:'dd MMM, hh:mm a' }}</td>
                  <td><span class="status-badge" [class]="v.status?.replace('_','')">{{ (v.status || '').replace('_',' ') | titlecase }}</span></td>
                  <td>
                    <div class="action-btns">
                      @if (v.status === 'pre_registered' && canManage()) {
                        <button class="btn-sm btn-approve" (click)="approve(v._id)">✅ Approve</button>
                      }
                      @if (v.status === 'approved' && canManage()) {
                        <button class="btn-sm btn-checkin" (click)="checkIn(v._id)">🔑 Check In</button>
                      }
                      @if (v.status === 'checked_in' && canManage()) {
                        <button class="btn-sm btn-checkout" (click)="checkOut(v._id)">🚪 Check Out</button>
                      }
                    </div>
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

    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Register Visitor</h3>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>
          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="form-row">
              <div class="form-group">
                <label>Visitor Name *</label>
                <input formControlName="visitorName" placeholder="John Smith" />
              </div>
              <div class="form-group">
                <label>Visitor Phone *</label>
                <input formControlName="visitorPhone" placeholder="+1 234 567 890" />
              </div>
            </div>
            <div class="form-group">
              <label>Host Resident ID *</label>
              <input formControlName="hostUserId" placeholder="Resident MongoDB ID" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Purpose *</label>
                <select formControlName="purpose">
                  <option value="guest">Guest</option>
                  <option value="delivery">Delivery</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="official">Official</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label>Scheduled Date/Time *</label>
                <input type="datetime-local" formControlName="scheduledDate" />
              </div>
            </div>
            @if (formError()) { <div class="form-err">{{ formError() }}</div> }
            <div class="modal-footer">
              <button type="button" class="btn-cancel" (click)="closeModal()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Saving...' : 'Register' }}</button>
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
    .btn-primary { padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .filters { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .search-input, .select { padding: 0.7rem 1rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; }
    .search-input { flex: 1; min-width: 220px; }
    .select { min-width: 160px; background: white; cursor: pointer; }
    .table-card { background: white; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th { padding: 1rem 1.25rem; text-align: left; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #718096; background: #f7fafc; border-bottom: 1px solid #e2e8f0; }
    td { padding: 1rem 1.25rem; border-bottom: 1px solid #f0f4f8; font-size: 0.9rem; color: #4a5568; }
    tr:last-child td { border-bottom: none; }
    .name-cell { display: flex; align-items: center; gap: 0.75rem; }
    .visitor-icon { font-size: 1.5rem; }
    .v-name { font-weight: 600; color: #2d3748; }
    .v-phone { font-size: 0.8rem; color: #a0aec0; }
    .status-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
    .status-badge.preregistered { background: #ebf8ff; color: #2b6cb0; }
    .status-badge.approved { background: #fefcbf; color: #b7791f; }
    .status-badge.checkedin { background: #f0fff4; color: #276749; }
    .status-badge.checkedout { background: #edf2f7; color: #718096; }
    .action-btns { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .btn-sm { padding: 0.35rem 0.75rem; border: none; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 600; }
    .btn-approve { background: #f0fff4; color: #276749; }
    .btn-checkin { background: #fefcbf; color: #b7791f; }
    .btn-checkout { background: #edf2f7; color: #4a5568; }
    .empty { text-align: center; padding: 3rem; color: #a0aec0; }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 1rem; border-top: 1px solid #e2e8f0; }
    .pagination button { padding: 0.5rem 1rem; border: 1px solid #e2e8f0; border-radius: 6px; background: white; cursor: pointer; font-weight: 600; color: #4a5568; }
    .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
    .pagination span { color: #718096; font-size: 0.875rem; }
    .skeleton-row { height: 64px; background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 37%, #f0f0f0 63%); background-size: 400% 100%; animation: shimmer 1.4s ease infinite; border-bottom: 1px solid #f0f4f8; }
    @keyframes shimmer { 0%{background-position:100% 50%} 100%{background-position:0 50%} }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 1rem; }
    .modal { background: white; border-radius: 16px; padding: 2rem; width: 100%; max-width: 500px; box-shadow: 0 25px 60px rgba(0,0,0,0.2); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .modal-header h3 { font-size: 1.25rem; font-weight: 700; color: #2d3748; margin: 0; }
    .close-btn { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: #a0aec0; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
    .form-group label { font-size: 0.875rem; font-weight: 600; color: #4a5568; }
    .form-group input, .form-group select { padding: 0.7rem 1rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; }
    .form-group input:focus, .form-group select:focus { outline: none; border-color: #667eea; }
    .form-err { padding: 0.75rem; background: #fff5f5; color: #c53030; border-radius: 8px; font-size: 0.875rem; margin-bottom: 1rem; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; }
    .btn-cancel { padding: 0.7rem 1.5rem; border: 2px solid #e2e8f0; background: white; border-radius: 8px; font-weight: 600; cursor: pointer; color: #4a5568; }
  `],
})
export class VisitorsComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  auth = inject(AuthService);

  visitors = signal<any[]>([]);
  loading = signal(false);
  search = '';
  statusFilter = '';
  page = signal(1);
  totalPages = signal(1);
  private searchDebounce: any;

  showModal = signal(false);
  saving = signal(false);
  formError = signal('');

  canManage = computed(() => {
    const r = this.auth.userRole();
    return ['SOCIETY_ADMIN', 'SUB_ADMIN', 'SUPER_ADMIN', 'PLATFORM_OWNER'].includes(r ?? '');
  });

  form: FormGroup = this.fb.group({
    visitorName: ['', Validators.required],
    visitorPhone: ['', Validators.required],
    hostUserId: ['', Validators.required],
    purpose: ['guest', Validators.required],
    scheduledDate: ['', Validators.required],
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getVisitors({ page: this.page(), limit: 10, search: this.search, status: this.statusFilter || undefined }).subscribe({
      next: (res) => { this.loading.set(false); this.visitors.set(res.data ?? []); this.totalPages.set(res.meta?.totalPages ?? 1); },
      error: () => this.loading.set(false),
    });
  }

  onSearch() {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => { this.page.set(1); this.load(); }, 400);
  }

  changePage(p: number) { this.page.set(p); this.load(); }

  openModal() { this.formError.set(''); this.form.reset({ purpose: 'guest' }); this.showModal.set(true); }
  closeModal() { this.showModal.set(false); }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.api.createVisitor(this.form.value).subscribe({
      next: () => { this.saving.set(false); this.closeModal(); this.load(); },
      error: (err) => { this.saving.set(false); this.formError.set(err.error?.message ?? 'Error.'); },
    });
  }

  approve(id: string) { this.api.approveVisitor(id).subscribe({ next: () => this.load() }); }
  checkIn(id: string) { this.api.checkInVisitor(id).subscribe({ next: () => this.load() }); }
  checkOut(id: string) { this.api.checkOutVisitor(id).subscribe({ next: () => this.load() }); }
}
