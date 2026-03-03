import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-parking',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2>Parking Management</h2>
          <p class="sub">Manage parking slot assignments</p>
        </div>
        <button class="btn-primary" (click)="openModal()" *ngIf="canManage()">+ Add Slot</button>
      </div>

      <!-- Stats -->
      @if (stats()) {
        <div class="stats-row">
          <div class="stat-pill total">🅿️ Total: <strong>{{ stats().total }}</strong></div>
          <div class="stat-pill available">✅ Available: <strong>{{ stats().available }}</strong></div>
          <div class="stat-pill occupied">🚗 Occupied: <strong>{{ stats().occupied }}</strong></div>
          <div class="stat-pill reserved">🔒 Reserved: <strong>{{ stats().reserved }}</strong></div>
        </div>
      }

      <!-- Filters -->
      <div class="filters">
        <input class="search-input" [(ngModel)]="search" (input)="onSearch()" placeholder="🔍  Search slot number..." />
        <select class="select" [(ngModel)]="statusFilter" (change)="load()">
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="occupied">Occupied</option>
          <option value="reserved">Reserved</option>
        </select>
        <select class="select" [(ngModel)]="typeFilter" (change)="load()">
          <option value="">All Types</option>
          <option value="car">Car</option>
          <option value="bike">Bike</option>
          <option value="both">Both</option>
        </select>
      </div>

      <!-- Parking grid -->
      <div class="slots-grid">
        @if (loading()) {
          @for (i of [1,2,3,4,5,6,7,8]; track i) { <div class="skeleton-slot"></div> }
        } @else if (slots().length === 0) {
          <div class="empty">No parking slots found.</div>
        } @else {
          @for (slot of slots(); track slot._id) {
            <div class="slot-card" [class]="slot.status">
              <div class="slot-header">
                <span class="slot-num">{{ slot.slotNumber }}</span>
                <span class="slot-status">{{ slot.status | titlecase }}</span>
              </div>
              <div class="slot-type">{{ slotTypeIcon(slot.vehicleType) }} {{ slot.vehicleType | titlecase }}</div>
              @if (slot.assignedTo) {
                <div class="assigned-to">
                  <span class="assigned-icon">👤</span>
                  <span>{{ slot.assignedTo?.firstName }} {{ slot.assignedTo?.lastName }}</span>
                </div>
                @if (slot.vehicleNumber) {
                  <div class="vehicle-num">🚗 {{ slot.vehicleNumber }}</div>
                }
              }
              <div class="slot-actions" *ngIf="canManage()">
                @if (slot.status === 'available') {
                  <button class="btn-assign" (click)="openAssignModal(slot)">Assign →</button>
                } @else if (slot.status === 'occupied' || slot.status === 'reserved') {
                  <button class="btn-release" (click)="release(slot._id)">Release</button>
                }
              </div>
            </div>
          }
        }
      </div>

      <div class="pagination" *ngIf="slots().length > 0">
        <button [disabled]="page() <= 1" (click)="changePage(page()-1)">← Prev</button>
        <span>Page {{ page() }} / {{ totalPages() }}</span>
        <button [disabled]="page() >= totalPages()" (click)="changePage(page()+1)">Next →</button>
      </div>
    </div>

    <!-- Add Slot Modal -->
    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Add Parking Slot</h3>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>
          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="form-row">
              <div class="form-group">
                <label>Slot Number *</label>
                <input formControlName="slotNumber" placeholder="P-101" />
              </div>
              <div class="form-group">
                <label>Vehicle Type</label>
                <select formControlName="vehicleType">
                  <option value="car">Car</option>
                  <option value="bike">Bike</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>
            @if (formError()) { <div class="form-err">{{ formError() }}</div> }
            <div class="modal-footer">
              <button type="button" class="btn-cancel" (click)="closeModal()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Saving...' : 'Add Slot' }}</button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Assign Modal -->
    @if (showAssignModal()) {
      <div class="modal-overlay" (click)="closeAssignModal()">
        <div class="modal modal-sm" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Assign Slot {{ selectedSlot()?.slotNumber }}</h3>
            <button class="close-btn" (click)="closeAssignModal()">✕</button>
          </div>
          <form [formGroup]="assignForm" (ngSubmit)="saveAssign()">
            <div class="form-group">
              <label>Resident ID *</label>
              <input formControlName="userId" placeholder="Resident MongoDB ID" />
            </div>
            <div class="form-group">
              <label>Vehicle Number</label>
              <input formControlName="vehicleNumber" placeholder="MH12AB1234" />
            </div>
            @if (assignError()) { <div class="form-err">{{ assignError() }}</div> }
            <div class="modal-footer">
              <button type="button" class="btn-cancel" (click)="closeAssignModal()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Assigning...' : 'Assign' }}</button>
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
    .stats-row { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1.5rem; }
    .stat-pill { padding: 0.5rem 1.25rem; border-radius: 20px; font-size: 0.875rem; font-weight: 600; }
    .stat-pill.total { background: #edf2f7; color: #4a5568; }
    .stat-pill.available { background: #f0fff4; color: #276749; }
    .stat-pill.occupied { background: #fff5f5; color: #c53030; }
    .stat-pill.reserved { background: #fefcbf; color: #b7791f; }
    .filters { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .search-input, .select { padding: 0.7rem 1rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; }
    .search-input { flex: 1; min-width: 200px; }
    .select { min-width: 140px; background: white; cursor: pointer; }
    .slots-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .slot-card { background: white; border-radius: 12px; padding: 1.25rem; border: 2px solid #e2e8f0; position: relative; transition: box-shadow 0.15s; }
    .slot-card.available { border-color: #9ae6b4; background: #f0fff4; }
    .slot-card.occupied { border-color: #fc8181; background: #fff5f5; }
    .slot-card.reserved { border-color: #f6ad55; background: #fffaf0; }
    .slot-card:hover { box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
    .slot-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
    .slot-num { font-size: 1.25rem; font-weight: 800; color: #2d3748; }
    .slot-status { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #718096; }
    .slot-type { font-size: 0.8rem; color: #718096; margin-bottom: 0.5rem; }
    .assigned-to { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: #4a5568; font-weight: 600; margin-bottom: 0.3rem; }
    .vehicle-num { font-size: 0.8rem; color: #4a5568; margin-bottom: 0.5rem; }
    .slot-actions { margin-top: 0.75rem; }
    .btn-assign, .btn-release { width: 100%; padding: 0.45rem; border: none; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 700; }
    .btn-assign { background: #667eea; color: white; }
    .btn-release { background: #fc8181; color: white; }
    .skeleton-slot { height: 150px; background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 37%, #f0f0f0 63%); background-size: 400% 100%; animation: shimmer 1.4s ease infinite; border-radius: 12px; }
    @keyframes shimmer { 0%{background-position:100% 50%} 100%{background-position:0 50%} }
    .empty { text-align: center; padding: 3rem; color: #a0aec0; }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 1rem; }
    .pagination button { padding: 0.5rem 1rem; border: 1px solid #e2e8f0; border-radius: 6px; background: white; cursor: pointer; font-weight: 600; color: #4a5568; }
    .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
    .pagination span { color: #718096; font-size: 0.875rem; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 1rem; }
    .modal { background: white; border-radius: 16px; padding: 2rem; width: 100%; max-width: 460px; box-shadow: 0 25px 60px rgba(0,0,0,0.2); }
    .modal-sm { max-width: 380px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .modal-header h3 { font-size: 1.1rem; font-weight: 700; color: #2d3748; margin: 0; }
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
export class ParkingComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  auth = inject(AuthService);

  slots = signal<any[]>([]);
  stats = signal<any>(null);
  loading = signal(false);
  search = '';
  statusFilter = '';
  typeFilter = '';
  page = signal(1);
  totalPages = signal(1);
  private searchDebounce: any;

  showModal = signal(false);
  showAssignModal = signal(false);
  selectedSlot = signal<any>(null);
  saving = signal(false);
  formError = signal('');
  assignError = signal('');

  canManage = computed(() => {
    const r = this.auth.userRole();
    return ['SOCIETY_ADMIN', 'SUB_ADMIN', 'SUPER_ADMIN', 'PLATFORM_OWNER'].includes(r ?? '');
  });

  form: FormGroup = this.fb.group({
    slotNumber: ['', Validators.required],
    vehicleType: ['car'],
  });

  assignForm: FormGroup = this.fb.group({
    userId: ['', Validators.required],
    vehicleNumber: [''],
  });

  ngOnInit() { this.load(); this.loadStats(); }

  load() {
    this.loading.set(true);
    this.api.getParkingSlots({ page: this.page(), limit: 20, search: this.search, status: this.statusFilter || undefined, vehicleType: this.typeFilter || undefined }).subscribe({
      next: (res) => { this.loading.set(false); this.slots.set(res.data ?? []); this.totalPages.set(res.meta?.totalPages ?? 1); },
      error: () => this.loading.set(false),
    });
  }

  loadStats() {
    this.api.getParkingStats().subscribe({ next: (res) => this.stats.set(res.data) });
  }

  onSearch() {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => { this.page.set(1); this.load(); }, 400);
  }

  changePage(p: number) { this.page.set(p); this.load(); }

  slotTypeIcon(type: string) {
    return type === 'bike' ? '🏍️' : type === 'car' ? '🚗' : '🚗🏍️';
  }

  openModal() { this.formError.set(''); this.form.reset({ vehicleType: 'car' }); this.showModal.set(true); }
  closeModal() { this.showModal.set(false); }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.api.createParkingSlot(this.form.value).subscribe({
      next: () => { this.saving.set(false); this.closeModal(); this.load(); this.loadStats(); },
      error: (err: any) => { this.saving.set(false); this.formError.set(err.error?.message ?? 'Error.'); },
    });
  }

  openAssignModal(slot: any) {
    this.selectedSlot.set(slot);
    this.assignError.set('');
    this.assignForm.reset();
    this.showAssignModal.set(true);
  }
  closeAssignModal() { this.showAssignModal.set(false); }

  saveAssign() {
    if (this.assignForm.invalid) { this.assignForm.markAllAsTouched(); return; }
    const slot = this.selectedSlot();
    if (!slot) return;
    this.saving.set(true);
    this.api.assignParkingSlot(slot._id, this.assignForm.value).subscribe({
      next: () => { this.saving.set(false); this.closeAssignModal(); this.load(); this.loadStats(); },
      error: (err: any) => { this.saving.set(false); this.assignError.set(err.error?.message ?? 'Error.'); },
    });
  }

  release(id: string) {
    this.api.releaseParkingSlot(id).subscribe({ next: () => { this.load(); this.loadStats(); } });
  }
}
