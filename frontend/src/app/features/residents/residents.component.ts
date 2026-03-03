import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-residents',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2>Residents</h2>
          <p class="sub">Manage society members and their flat assignments</p>
        </div>
        <button class="btn-primary" (click)="openModal()" *ngIf="canManage()">+ Add Resident</button>
      </div>

      <!-- Filters -->
      <div class="filters">
        <input class="search-input" [(ngModel)]="search" (input)="onSearch()" placeholder="🔍  Search by name or email..." />
        <select class="select" [(ngModel)]="statusFilter" (change)="load()">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <!-- Table -->
      <div class="table-card">
        @if (loading()) {
          <div class="loading-rows">
            @for (i of [1,2,3,4,5]; track i) { <div class="skeleton-row"></div> }
          </div>
        } @else if (residents().length === 0) {
          <div class="empty">No residents found.</div>
        } @else {
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Flat</th>
                <th>Phone</th>
                <th>Status</th>
                <th *ngIf="canManage()">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (r of residents(); track r._id) {
                <tr>
                  <td>
                    <div class="name-cell">
                      <div class="avatar-sm">{{ initials(r) }}</div>
                      {{ r.firstName }} {{ r.lastName }}
                    </div>
                  </td>
                  <td>{{ r.email }}</td>
                  <td><span class="flat-badge">{{ r.flatNumber ?? '—' }}</span></td>
                  <td>{{ r.phone ?? '—' }}</td>
                  <td><span class="status-badge" [class.active]="r.isActive">{{ r.isActive ? 'Active' : 'Inactive' }}</span></td>
                  <td *ngIf="canManage()">
                    <div class="action-btns">
                      <button class="btn-sm btn-edit" (click)="openModal(r)">✏️</button>
                      <button class="btn-sm btn-toggle" (click)="toggleStatus(r._id)">
                        {{ r.isActive ? '🔒' : '🔓' }}
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <!-- Pagination -->
          <div class="pagination">
            <button [disabled]="page() <= 1" (click)="changePage(page()-1)">← Prev</button>
            <span>Page {{ page() }} / {{ totalPages() }}</span>
            <button [disabled]="page() >= totalPages()" (click)="changePage(page()+1)">Next →</button>
          </div>
        }
      </div>
    </div>

    <!-- Modal -->
    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingId() ? 'Edit Resident' : 'Add Resident' }}</h3>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>
          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="form-row">
              <div class="form-group">
                <label>First Name *</label>
                <input formControlName="firstName" placeholder="John" />
              </div>
              <div class="form-group">
                <label>Last Name *</label>
                <input formControlName="lastName" placeholder="Doe" />
              </div>
            </div>
            <div class="form-group">
              <label>Email *</label>
              <input type="email" formControlName="email" placeholder="john@example.com" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Phone</label>
                <input formControlName="phone" placeholder="+1 234 567 890" />
              </div>
              <div class="form-group">
                <label>Flat Number</label>
                <input formControlName="flatNumber" placeholder="A-101" />
              </div>
            </div>
            @if (!editingId()) {
              <div class="form-group">
                <label>Password *</label>
                <input type="password" formControlName="password" placeholder="Min 8 chars" />
              </div>
            }
            @if (formError()) {
              <div class="form-err">{{ formError() }}</div>
            }
            <div class="modal-footer">
              <button type="button" class="btn-cancel" (click)="closeModal()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="saving()">
                {{ saving() ? 'Saving...' : 'Save' }}
              </button>
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
    .btn-primary { padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; white-space: nowrap; }
    .filters { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .search-input, .select { padding: 0.7rem 1rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; }
    .search-input { flex: 1; min-width: 220px; }
    .select { min-width: 160px; background: white; cursor: pointer; }
    .table-card { background: white; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th { padding: 1rem 1.25rem; text-align: left; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #718096; background: #f7fafc; border-bottom: 1px solid #e2e8f0; }
    td { padding: 1rem 1.25rem; border-bottom: 1px solid #f0f4f8; font-size: 0.9rem; color: #4a5568; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #f7fafc; }
    .name-cell { display: flex; align-items: center; gap: 0.75rem; }
    .avatar-sm { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; flex-shrink: 0; }
    .flat-badge { display: inline-block; padding: 0.2rem 0.6rem; background: #ebf8ff; color: #2b6cb0; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
    .status-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; background: #fff5f5; color: #c53030; }
    .status-badge.active { background: #f0fff4; color: #276749; }
    .action-btns { display: flex; gap: 0.5rem; }
    .btn-sm { padding: 0.4rem 0.6rem; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; background: #edf2f7; transition: background 0.15s; }
    .btn-sm:hover { background: #e2e8f0; }
    .empty { text-align: center; padding: 3rem; color: #a0aec0; }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 1rem; border-top: 1px solid #e2e8f0; }
    .pagination button { padding: 0.5rem 1rem; border: 1px solid #e2e8f0; border-radius: 6px; background: white; cursor: pointer; font-weight: 600; color: #4a5568; }
    .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
    .pagination span { color: #718096; font-size: 0.875rem; }
    .skeleton-row { height: 56px; background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 37%, #f0f0f0 63%); background-size: 400% 100%; animation: shimmer 1.4s ease infinite; border-bottom: 1px solid #f0f4f8; }
    @keyframes shimmer { 0%{background-position:100% 50%} 100%{background-position:0 50%} }
    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 1rem; }
    .modal { background: white; border-radius: 16px; padding: 2rem; width: 100%; max-width: 520px; box-shadow: 0 25px 60px rgba(0,0,0,0.2); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .modal-header h3 { font-size: 1.25rem; font-weight: 700; color: #2d3748; margin: 0; }
    .close-btn { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: #a0aec0; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
    .form-group label { font-size: 0.875rem; font-weight: 600; color: #4a5568; }
    .form-group input { padding: 0.7rem 1rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; }
    .form-group input:focus { outline: none; border-color: #667eea; }
    .form-err { padding: 0.75rem; background: #fff5f5; color: #c53030; border-radius: 8px; font-size: 0.875rem; margin-bottom: 1rem; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem; }
    .btn-cancel { padding: 0.7rem 1.5rem; border: 2px solid #e2e8f0; background: white; border-radius: 8px; font-weight: 600; cursor: pointer; color: #4a5568; }
  `],
})
export class ResidentsComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  auth = inject(AuthService);

  residents = signal<any[]>([]);
  loading = signal(false);
  search = '';
  statusFilter = '';
  page = signal(1);
  totalPages = signal(1);
  private searchDebounce: any;

  showModal = signal(false);
  editingId = signal<string | null>(null);
  saving = signal(false);
  formError = signal('');

  canManage = computed(() => {
    const r = this.auth.userRole();
    return ['SOCIETY_ADMIN', 'SUB_ADMIN', 'SUPER_ADMIN', 'PLATFORM_OWNER'].includes(r ?? '');
  });

  form: FormGroup = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    flatNumber: [''],
    password: [''],
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getUsers({ page: this.page(), limit: 10, search: this.search, role: 'USER', isActive: this.statusFilter || undefined }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.residents.set(res.data ?? []);
        this.totalPages.set(res.meta?.totalPages ?? 1);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearch() {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => { this.page.set(1); this.load(); }, 400);
  }

  changePage(p: number) { this.page.set(p); this.load(); }

  initials(r: any) { return `${r.firstName?.[0] ?? ''}${r.lastName?.[0] ?? ''}`.toUpperCase(); }

  openModal(r?: any) {
    this.formError.set('');
    if (r) {
      this.editingId.set(r._id);
      this.form.patchValue(r);
      this.form.get('password')?.clearValidators();
    } else {
      this.editingId.set(null);
      this.form.reset();
      this.form.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
    }
    this.form.get('password')?.updateValueAndValidity();
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.formError.set('');
    const body = { ...this.form.value, role: 'USER' };

    const call$ = this.editingId()
      ? this.api.updateUser(this.editingId()!, body)
      : this.api.createUser(body);

    call$.subscribe({
      next: () => { this.saving.set(false); this.closeModal(); this.load(); },
      error: (err) => { this.saving.set(false); this.formError.set(err.error?.message ?? 'Error saving.'); },
    });
  }

  toggleStatus(id: string) {
    this.api.toggleUserStatus(id).subscribe({ next: () => this.load() });
  }
}
