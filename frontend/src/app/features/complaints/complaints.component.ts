import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-complaints',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2>Complaints</h2>
          <p class="sub">Track and resolve resident complaints</p>
        </div>
        <button class="btn-primary" (click)="openModal()">+ New Complaint</button>
      </div>

      <div class="filters">
        <input class="search-input" [(ngModel)]="search" (input)="onSearch()" placeholder="🔍  Search complaints..." />
        <select class="select" [(ngModel)]="statusFilter" (change)="load()">
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select class="select" [(ngModel)]="categoryFilter" (change)="load()">
          <option value="">All Categories</option>
          <option value="maintenance">Maintenance</option>
          <option value="noise">Noise</option>
          <option value="cleanliness">Cleanliness</option>
          <option value="security">Security</option>
          <option value="parking">Parking</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div class="complaints-list">
        @if (loading()) {
          @for (i of [1,2,3]; track i) { <div class="skeleton-card"></div> }
        } @else if (complaints().length === 0) {
          <div class="empty">No complaints found.</div>
        } @else {
          @for (c of complaints(); track c._id) {
            <div class="complaint-card" (click)="selectComplaint(c)">
              <div class="card-top">
                <div class="card-meta">
                  <span class="category-badge">{{ c.category | titlecase }}</span>
                  <span class="status-badge" [class]="c.status">{{ (c.status || '').replace('_',' ') | titlecase }}</span>
                </div>
                <span class="date">{{ c.createdAt | date:'dd MMM' }}</span>
              </div>
              <h4 class="title">{{ c.title }}</h4>
              <p class="desc">{{ c.description | slice:0:120 }}{{ c.description?.length > 120 ? '...' : '' }}</p>
              <div class="card-bottom">
                <span class="resident">👤 {{ c.userId?.firstName }} {{ c.userId?.lastName }}</span>
                <span class="comments">💬 {{ c.comments?.length ?? 0 }}</span>
              </div>
            </div>
          }
          <div class="pagination">
            <button [disabled]="page() <= 1" (click)="changePage(page()-1)">← Prev</button>
            <span>Page {{ page() }} / {{ totalPages() }}</span>
            <button [disabled]="page() >= totalPages()" (click)="changePage(page()+1)">Next →</button>
          </div>
        }
      </div>
    </div>

    <!-- New Complaint Modal -->
    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>New Complaint</h3>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>
          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="form-group">
              <label>Title *</label>
              <input formControlName="title" placeholder="Brief complaint title" />
            </div>
            <div class="form-group">
              <label>Category *</label>
              <select formControlName="category">
                <option value="maintenance">Maintenance</option>
                <option value="noise">Noise</option>
                <option value="cleanliness">Cleanliness</option>
                <option value="security">Security</option>
                <option value="parking">Parking</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="form-group">
              <label>Priority</label>
              <select formControlName="priority">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div class="form-group">
              <label>Description *</label>
              <textarea formControlName="description" rows="4" placeholder="Describe the issue in detail..."></textarea>
            </div>
            @if (formError()) { <div class="form-err">{{ formError() }}</div> }
            <div class="modal-footer">
              <button type="button" class="btn-cancel" (click)="closeModal()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Submitting...' : 'Submit' }}</button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- View Complaint Detail Modal -->
    @if (selectedComplaint()) {
      <div class="modal-overlay" (click)="selectedComplaint.set(null)">
        <div class="modal modal-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ selectedComplaint()!.title }}</h3>
            <button class="close-btn" (click)="selectedComplaint.set(null)">✕</button>
          </div>
          <div class="detail-body">
            <div class="meta-row">
              <span class="category-badge">{{ selectedComplaint()!.category | titlecase }}</span>
              <span class="status-badge" [class]="selectedComplaint()!.status">{{ (selectedComplaint()!.status || '').replace('_',' ') | titlecase }}</span>
              <span class="date">{{ selectedComplaint()!.createdAt | date:'dd MMM yyyy' }}</span>
            </div>
            <p class="detail-desc">{{ selectedComplaint()!.description }}</p>

            @if (canManage()) {
              <div class="status-update">
                <label>Update Status</label>
                <div class="status-btns">
                  @for (s of statusOptions; track s.value) {
                    <button class="status-opt" [class.selected]="selectedComplaint()!.status === s.value" (click)="updateStatus(s.value)">{{ s.label }}</button>
                  }
                </div>
              </div>
            }

            <div class="comments-section">
              <h4>Comments ({{ selectedComplaint()!.comments?.length ?? 0 }})</h4>
              <div class="comments-list">
                @for (cm of selectedComplaint()!.comments; track cm._id) {
                  <div class="comment">
                    <div class="comment-author">{{ cm.userId?.firstName ?? 'User' }}</div>
                    <div class="comment-text">{{ cm.comment }}</div>
                    <div class="comment-date">{{ cm.createdAt | date:'dd MMM, HH:mm' }}</div>
                  </div>
                }
              </div>
              <div class="add-comment">
                <input [(ngModel)]="newComment" placeholder="Add a comment..." (keydown.enter)="addComment()" />
                <button class="btn-primary" (click)="addComment()" [disabled]="!newComment.trim()">Send</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page { max-width: 900px; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; }
    .page-header h2 { font-size: 1.5rem; font-weight: 700; color: #2d3748; margin: 0 0 0.25rem; }
    .sub { color: #718096; font-size: 0.875rem; margin: 0; }
    .btn-primary { padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .filters { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .search-input, .select { padding: 0.7rem 1rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; }
    .search-input { flex: 1; min-width: 220px; }
    .select { min-width: 140px; background: white; cursor: pointer; }
    .complaints-list { display: flex; flex-direction: column; gap: 1rem; }
    .complaint-card { background: white; border-radius: 12px; padding: 1.25rem; border: 1px solid #e2e8f0; cursor: pointer; transition: box-shadow 0.15s, transform 0.15s; }
    .complaint-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); transform: translateY(-1px); }
    .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
    .card-meta { display: flex; gap: 0.5rem; }
    .category-badge { padding: 0.2rem 0.6rem; background: #ebf8ff; color: #2b6cb0; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
    .status-badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
    .status-badge.open { background: #fff5f5; color: #c53030; }
    .status-badge.in_progress { background: #fefcbf; color: #b7791f; }
    .status-badge.resolved { background: #f0fff4; color: #276749; }
    .status-badge.closed { background: #edf2f7; color: #718096; }
    .date { font-size: 0.8rem; color: #a0aec0; }
    .title { font-size: 1rem; font-weight: 700; color: #2d3748; margin: 0 0 0.5rem; }
    .desc { font-size: 0.875rem; color: #718096; margin: 0 0 0.75rem; line-height: 1.5; }
    .card-bottom { display: flex; justify-content: space-between; font-size: 0.8rem; color: #a0aec0; }
    .skeleton-card { height: 120px; background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 37%, #f0f0f0 63%); background-size: 400% 100%; animation: shimmer 1.4s ease infinite; border-radius: 12px; }
    @keyframes shimmer { 0%{background-position:100% 50%} 100%{background-position:0 50%} }
    .empty { text-align: center; padding: 3rem; color: #a0aec0; }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 1rem 0; }
    .pagination button { padding: 0.5rem 1rem; border: 1px solid #e2e8f0; border-radius: 6px; background: white; cursor: pointer; font-weight: 600; color: #4a5568; }
    .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
    .pagination span { color: #718096; font-size: 0.875rem; }
    /* Modals */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 1rem; }
    .modal { background: white; border-radius: 16px; padding: 2rem; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 60px rgba(0,0,0,0.2); }
    .modal-lg { max-width: 620px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .modal-header h3 { font-size: 1.25rem; font-weight: 700; color: #2d3748; margin: 0; }
    .close-btn { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: #a0aec0; }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
    .form-group label { font-size: 0.875rem; font-weight: 600; color: #4a5568; }
    .form-group input, .form-group select, .form-group textarea { padding: 0.7rem 1rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; width: 100%; box-sizing: border-box; }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #667eea; }
    .form-err { padding: 0.75rem; background: #fff5f5; color: #c53030; border-radius: 8px; font-size: 0.875rem; margin-bottom: 1rem; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; }
    .btn-cancel { padding: 0.7rem 1.5rem; border: 2px solid #e2e8f0; background: white; border-radius: 8px; font-weight: 600; cursor: pointer; color: #4a5568; }
    /* Detail */
    .meta-row { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; }
    .detail-desc { font-size: 0.9rem; color: #4a5568; line-height: 1.7; margin-bottom: 1.5rem; }
    .status-update { margin-bottom: 1.5rem; }
    .status-update label { font-size: 0.875rem; font-weight: 600; color: #4a5568; display: block; margin-bottom: 0.6rem; }
    .status-btns { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .status-opt { padding: 0.4rem 1rem; border: 2px solid #e2e8f0; border-radius: 20px; background: white; cursor: pointer; font-size: 0.8rem; font-weight: 600; color: #718096; transition: all 0.15s; }
    .status-opt.selected, .status-opt:hover { border-color: #667eea; color: #667eea; background: #f0f2ff; }
    .comments-section h4 { font-size: 0.95rem; font-weight: 700; color: #2d3748; margin-bottom: 1rem; }
    .comments-list { display: flex; flex-direction: column; gap: 0.75rem; max-height: 200px; overflow-y: auto; margin-bottom: 1rem; }
    .comment { background: #f7fafc; border-radius: 10px; padding: 0.875rem; }
    .comment-author { font-size: 0.8rem; font-weight: 700; color: #4a5568; }
    .comment-text { font-size: 0.875rem; color: #4a5568; margin: 0.25rem 0; }
    .comment-date { font-size: 0.75rem; color: #a0aec0; }
    .add-comment { display: flex; gap: 0.75rem; }
    .add-comment input { flex: 1; padding: 0.7rem 1rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; }
    .add-comment input:focus { outline: none; border-color: #667eea; }
    .add-comment .btn-primary { padding: 0.7rem 1.25rem; }
  `],
})
export class ComplaintsComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  auth = inject(AuthService);

  complaints = signal<any[]>([]);
  loading = signal(false);
  search = '';
  statusFilter = '';
  categoryFilter = '';
  page = signal(1);
  totalPages = signal(1);
  private searchDebounce: any;

  showModal = signal(false);
  selectedComplaint = signal<any>(null);
  saving = signal(false);
  formError = signal('');
  newComment = '';

  statusOptions = [
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
  ];

  canManage = computed(() => {
    const r = this.auth.userRole();
    return ['SOCIETY_ADMIN', 'SUB_ADMIN', 'SUPER_ADMIN', 'PLATFORM_OWNER'].includes(r ?? '');
  });

  form: FormGroup = this.fb.group({
    title: ['', Validators.required],
    category: ['other', Validators.required],
    priority: ['medium'],
    description: ['', Validators.required],
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getComplaints({ page: this.page(), limit: 10, search: this.search, status: this.statusFilter || undefined, category: this.categoryFilter || undefined }).subscribe({
      next: (res) => { this.loading.set(false); this.complaints.set(res.data ?? []); this.totalPages.set(res.meta?.totalPages ?? 1); },
      error: () => this.loading.set(false),
    });
  }

  onSearch() {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => { this.page.set(1); this.load(); }, 400);
  }

  changePage(p: number) { this.page.set(p); this.load(); }

  openModal() { this.formError.set(''); this.form.reset({ category: 'other', priority: 'medium' }); this.showModal.set(true); }
  closeModal() { this.showModal.set(false); }

  selectComplaint(c: any) { this.selectedComplaint.set(c); }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.api.createComplaint(this.form.value).subscribe({
      next: () => { this.saving.set(false); this.closeModal(); this.load(); },
      error: (err) => { this.saving.set(false); this.formError.set(err.error?.message ?? 'Error.'); },
    });
  }

  updateStatus(status: string) {
    const c = this.selectedComplaint();
    if (!c) return;
    this.api.updateComplaintStatus(c._id, { status }).subscribe({
      next: (res) => { this.selectedComplaint.set(res.data); this.load(); },
    });
  }

  addComment() {
    if (!this.newComment.trim()) return;
    const c = this.selectedComplaint();
    if (!c) return;
    this.api.addComplaintComment(c._id, this.newComment).subscribe({
      next: (res) => { this.selectedComplaint.set(res.data); this.newComment = ''; this.load(); },
    });
  }
}
