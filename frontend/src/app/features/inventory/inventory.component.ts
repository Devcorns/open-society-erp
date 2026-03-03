import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2>Inventory</h2>
          <p class="sub">Track society assets and supplies</p>
        </div>
        <button class="btn-primary" (click)="openModal()" *ngIf="canManage()">+ Add Item</button>
      </div>

      <div class="filters">
        <input class="search-input" [(ngModel)]="search" (input)="onSearch()" placeholder="🔍  Search items..." />
        <select class="select" [(ngModel)]="categoryFilter" (change)="load()">
          <option value="">All Categories</option>
          <option value="cleaning">Cleaning</option>
          <option value="electrical">Electrical</option>
          <option value="plumbing">Plumbing</option>
          <option value="gardening">Gardening</option>
          <option value="security">Security</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div class="items-grid">
        @if (loading()) {
          @for (i of [1,2,3,4,5,6]; track i) { <div class="skeleton-card"></div> }
        } @else if (items().length === 0) {
          <div class="empty">No inventory items found.</div>
        } @else {
          @for (item of items(); track item._id) {
            <div class="item-card" [class.low-stock]="item.isLowStock">
              <div class="item-header">
                <span class="item-icon">{{ categoryIcon(item.category) }}</span>
                <span class="category-badge">{{ item.category | titlecase }}</span>
                @if (item.isLowStock) { <span class="low-badge">⚠️ Low</span> }
              </div>
              <h4 class="item-name">{{ item.name }}</h4>
              <p class="item-desc">{{ item.description || 'No description' }}</p>
              <div class="item-quantity">
                <div class="qty-display">
                  <span class="qty-num">{{ item.quantity }}</span>
                  <span class="qty-unit">{{ item.unit }}</span>
                </div>
                <div class="qty-bar-wrap"><div class="qty-bar" [style.width.%]="qtyPercent(item)"></div></div>
              </div>
              <div class="item-footer">
                <span class="price">₹{{ item.unitPrice | number }}</span>
                <div class="item-btns" *ngIf="canManage()">
                  <button class="btn-xs btn-add" (click)="openTxModal(item, 'in')">+ In</button>
                  <button class="btn-xs btn-remove" (click)="openTxModal(item, 'out')">- Out</button>
                </div>
              </div>
            </div>
          }
        }
      </div>

      <div class="pagination" *ngIf="items().length > 0">
        <button [disabled]="page() <= 1" (click)="changePage(page()-1)">← Prev</button>
        <span>Page {{ page() }} / {{ totalPages() }}</span>
        <button [disabled]="page() >= totalPages()" (click)="changePage(page()+1)">Next →</button>
      </div>
    </div>

    <!-- Add Item Modal -->
    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingId() ? 'Edit Item' : 'Add Inventory Item' }}</h3>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>
          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="form-group">
              <label>Item Name *</label>
              <input formControlName="name" placeholder="Cleaning Liquid" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Category</label>
                <select formControlName="category">
                  <option value="cleaning">Cleaning</option>
                  <option value="electrical">Electrical</option>
                  <option value="plumbing">Plumbing</option>
                  <option value="gardening">Gardening</option>
                  <option value="security">Security</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label>Unit</label>
                <input formControlName="unit" placeholder="bottles, kg, pcs..." />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Quantity *</label>
                <input type="number" formControlName="quantity" min="0" />
              </div>
              <div class="form-group">
                <label>Unit Price (₹)</label>
                <input type="number" formControlName="unitPrice" min="0" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Min Stock Level</label>
                <input type="number" formControlName="minStockLevel" min="0" />
              </div>
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea formControlName="description" rows="2" placeholder="Optional description..."></textarea>
            </div>
            @if (formError()) { <div class="form-err">{{ formError() }}</div> }
            <div class="modal-footer">
              <button type="button" class="btn-cancel" (click)="closeModal()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Saving...' : 'Save' }}</button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Transaction Modal -->
    @if (showTxModal()) {
      <div class="modal-overlay" (click)="closeTxModal()">
        <div class="modal modal-sm" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ txType() === 'in' ? '➕ Stock In' : '➖ Stock Out' }}: {{ selectedItem()?.name }}</h3>
            <button class="close-btn" (click)="closeTxModal()">✕</button>
          </div>
          <form [formGroup]="txForm" (ngSubmit)="saveTx()">
            <div class="form-group">
              <label>Quantity *</label>
              <input type="number" formControlName="quantity" min="1" placeholder="Enter quantity" />
            </div>
            <div class="form-group">
              <label>Notes</label>
              <input formControlName="notes" placeholder="Optional notes..." />
            </div>
            @if (txError()) { <div class="form-err">{{ txError() }}</div> }
            <div class="modal-footer">
              <button type="button" class="btn-cancel" (click)="closeTxModal()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Saving...' : 'Confirm' }}</button>
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
    .items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem; margin-bottom: 1.5rem; }
    .item-card { background: white; border-radius: 14px; padding: 1.5rem; border: 1px solid #e2e8f0; transition: box-shadow 0.15s; }
    .item-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .item-card.low-stock { border-color: #fed7d7; background: #fff5f5; }
    .item-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
    .item-icon { font-size: 1.25rem; }
    .category-badge { padding: 0.2rem 0.6rem; background: #ebf8ff; color: #2b6cb0; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
    .low-badge { padding: 0.2rem 0.6rem; background: #fff5f5; color: #c53030; border-radius: 20px; font-size: 0.75rem; font-weight: 600; margin-left: auto; }
    .item-name { font-size: 1rem; font-weight: 700; color: #2d3748; margin: 0 0 0.4rem; }
    .item-desc { font-size: 0.8rem; color: #a0aec0; margin: 0 0 1rem; }
    .item-quantity { margin-bottom: 1rem; }
    .qty-display { display: flex; align-items: baseline; gap: 0.3rem; margin-bottom: 0.5rem; }
    .qty-num { font-size: 1.75rem; font-weight: 800; color: #2d3748; }
    .qty-unit { font-size: 0.875rem; color: #718096; }
    .qty-bar-wrap { height: 6px; background: #edf2f7; border-radius: 3px; overflow: hidden; }
    .qty-bar { height: 100%; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 3px; transition: width 0.3s; }
    .item-footer { display: flex; align-items: center; justify-content: space-between; }
    .price { font-weight: 700; color: #276749; }
    .item-btns { display: flex; gap: 0.4rem; }
    .btn-xs { padding: 0.3rem 0.75rem; border: none; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 600; }
    .btn-add { background: #f0fff4; color: #276749; }
    .btn-remove { background: #fff5f5; color: #c53030; }
    .skeleton-card { height: 220px; background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 37%, #f0f0f0 63%); background-size: 400% 100%; animation: shimmer 1.4s ease infinite; border-radius: 14px; }
    @keyframes shimmer { 0%{background-position:100% 50%} 100%{background-position:0 50%} }
    .empty { text-align: center; padding: 3rem; color: #a0aec0; }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 1rem; }
    .pagination button { padding: 0.5rem 1rem; border: 1px solid #e2e8f0; border-radius: 6px; background: white; cursor: pointer; font-weight: 600; color: #4a5568; }
    .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
    .pagination span { color: #718096; font-size: 0.875rem; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 1rem; }
    .modal { background: white; border-radius: 16px; padding: 2rem; width: 100%; max-width: 500px; box-shadow: 0 25px 60px rgba(0,0,0,0.2); }
    .modal-sm { max-width: 380px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .modal-header h3 { font-size: 1.1rem; font-weight: 700; color: #2d3748; margin: 0; }
    .close-btn { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: #a0aec0; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
    .form-group label { font-size: 0.875rem; font-weight: 600; color: #4a5568; }
    .form-group input, .form-group select, .form-group textarea { padding: 0.7rem 1rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; box-sizing: border-box; width: 100%; }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #667eea; }
    .form-err { padding: 0.75rem; background: #fff5f5; color: #c53030; border-radius: 8px; font-size: 0.875rem; margin-bottom: 1rem; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; }
    .btn-cancel { padding: 0.7rem 1.5rem; border: 2px solid #e2e8f0; background: white; border-radius: 8px; font-weight: 600; cursor: pointer; color: #4a5568; }
  `],
})
export class InventoryComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  auth = inject(AuthService);

  items = signal<any[]>([]);
  loading = signal(false);
  search = '';
  categoryFilter = '';
  page = signal(1);
  totalPages = signal(1);
  private searchDebounce: any;

  showModal = signal(false);
  showTxModal = signal(false);
  editingId = signal<string | null>(null);
  selectedItem = signal<any>(null);
  txType = signal<'in' | 'out'>('in');
  saving = signal(false);
  formError = signal('');
  txError = signal('');

  canManage = computed(() => {
    const r = this.auth.userRole();
    return ['SOCIETY_ADMIN', 'SUB_ADMIN', 'SUPER_ADMIN', 'PLATFORM_OWNER'].includes(r ?? '');
  });

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    category: ['other'],
    unit: ['pcs'],
    quantity: [0, Validators.required],
    unitPrice: [0],
    minStockLevel: [5],
    description: [''],
  });

  txForm: FormGroup = this.fb.group({
    quantity: [1, [Validators.required, Validators.min(1)]],
    notes: [''],
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getInventory({ page: this.page(), limit: 12, search: this.search, category: this.categoryFilter || undefined }).subscribe({
      next: (res) => { this.loading.set(false); this.items.set(res.data ?? []); this.totalPages.set(res.meta?.totalPages ?? 1); },
      error: () => this.loading.set(false),
    });
  }

  onSearch() {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => { this.page.set(1); this.load(); }, 400);
  }

  changePage(p: number) { this.page.set(p); this.load(); }

  categoryIcon(cat: string) {
    const map: Record<string, string> = { cleaning: '🧹', electrical: '⚡', plumbing: '🔧', gardening: '🌿', security: '🔒', other: '📦' };
    return map[cat] ?? '📦';
  }

  qtyPercent(item: any) {
    const max = Math.max(item.quantity, item.minStockLevel * 3);
    return Math.min(100, Math.round((item.quantity / max) * 100));
  }

  openModal(item?: any) {
    this.formError.set('');
    if (item) { this.editingId.set(item._id); this.form.patchValue(item); }
    else { this.editingId.set(null); this.form.reset({ category: 'other', unit: 'pcs', quantity: 0, unitPrice: 0, minStockLevel: 5 }); }
    this.showModal.set(true);
  }
  closeModal() { this.showModal.set(false); }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const call$ = this.editingId()
      ? this.api.updateInventoryItem(this.editingId()!, this.form.value)
      : this.api.createInventoryItem(this.form.value);
    call$.subscribe({
      next: () => { this.saving.set(false); this.closeModal(); this.load(); },
      error: (err: any) => { this.saving.set(false); this.formError.set(err.error?.message ?? 'Error.'); },
    });
  }

  openTxModal(item: any, type: 'in' | 'out') {
    this.selectedItem.set(item);
    this.txType.set(type);
    this.txError.set('');
    this.txForm.reset({ quantity: 1 });
    this.showTxModal.set(true);
  }
  closeTxModal() { this.showTxModal.set(false); }

  saveTx() {
    if (this.txForm.invalid) { this.txForm.markAllAsTouched(); return; }
    const item = this.selectedItem();
    if (!item) return;
    this.saving.set(true);
    this.api.addInventoryTransaction(item._id, { type: this.txType(), ...this.txForm.value }).subscribe({
      next: () => { this.saving.set(false); this.closeTxModal(); this.load(); },
      error: (err: any) => { this.saving.set(false); this.txError.set(err.error?.message ?? 'Error.'); },
    });
  }
}
