import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly BASE = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private buildParams(query?: PaginationQuery): HttpParams {
    let params = new HttpParams();
    if (!query) return params;
    Object.entries(query).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        params = params.set(key, val.toString());
      }
    });
    return params;
  }

  // ─── AUTH ────────────────────────────────────────────────────────────
  login(body: { email: string; password: string }) {
    return this.http.post<ApiResponse>(`${this.BASE}/auth/login`, body);
  }

  register(body: any) {
    return this.http.post<ApiResponse>(`${this.BASE}/auth/register`, body);
  }

  getProfile() {
    return this.http.get<ApiResponse>(`${this.BASE}/auth/profile`);
  }

  changePassword(body: any) {
    return this.http.patch<ApiResponse>(`${this.BASE}/auth/change-password`, body);
  }

  // ─── TENANTS ─────────────────────────────────────────────────────────
  getMyTenant() {
    return this.http.get<ApiResponse>(`${this.BASE}/tenants/my`);
  }

  getAllTenants(query?: PaginationQuery) {
    return this.http.get<ApiResponse>(`${this.BASE}/tenants`, { params: this.buildParams(query) });
  }

  createTenant(body: any) {
    return this.http.post<ApiResponse>(`${this.BASE}/tenants`, body);
  }

  updateTenant(id: string, body: any) {
    return this.http.put<ApiResponse>(`${this.BASE}/tenants/${id}`, body);
  }

  blockTenant(id: string, reason: string) {
    return this.http.patch<ApiResponse>(`${this.BASE}/tenants/${id}/block`, { reason });
  }

  unblockTenant(id: string) {
    return this.http.patch<ApiResponse>(`${this.BASE}/tenants/${id}/unblock`, {});
  }

  // ─── USERS ───────────────────────────────────────────────────────────
  getUsers(query?: PaginationQuery) {
    return this.http.get<ApiResponse>(`${this.BASE}/users`, { params: this.buildParams(query) });
  }

  getUserById(id: string) {
    return this.http.get<ApiResponse>(`${this.BASE}/users/${id}`);
  }

  createUser(body: any) {
    return this.http.post<ApiResponse>(`${this.BASE}/users`, body);
  }

  updateUser(id: string, body: any) {
    return this.http.put<ApiResponse>(`${this.BASE}/users/${id}`, body);
  }

  toggleUserStatus(id: string) {
    return this.http.patch<ApiResponse>(`${this.BASE}/users/${id}/toggle-status`, {});
  }

  deleteUser(id: string) {
    return this.http.delete<ApiResponse>(`${this.BASE}/users/${id}`);
  }

  // ─── MAINTENANCE ─────────────────────────────────────────────────────
  getMaintenance(query?: PaginationQuery) {
    return this.http.get<ApiResponse>(`${this.BASE}/maintenance`, { params: this.buildParams(query) });
  }

  createMaintenance(body: any) {
    return this.http.post<ApiResponse>(`${this.BASE}/maintenance`, body);
  }

  bulkCreateMaintenance(body: any) {
    return this.http.post<ApiResponse>(`${this.BASE}/maintenance/bulk`, body);
  }

  recordPayment(id: string, body: any) {
    return this.http.patch<ApiResponse>(`${this.BASE}/maintenance/${id}/pay`, body);
  }

  getMaintenanceSummary(year?: number) {
    const params = year ? new HttpParams().set('year', year.toString()) : undefined;
    return this.http.get<ApiResponse>(`${this.BASE}/maintenance/summary`, { params });
  }

  // ─── COMPLAINTS ──────────────────────────────────────────────────────
  getComplaints(query?: PaginationQuery) {
    return this.http.get<ApiResponse>(`${this.BASE}/complaints`, { params: this.buildParams(query) });
  }

  createComplaint(body: any) {
    return this.http.post<ApiResponse>(`${this.BASE}/complaints`, body);
  }

  updateComplaintStatus(id: string, body: any) {
    return this.http.patch<ApiResponse>(`${this.BASE}/complaints/${id}/status`, body);
  }

  addComplaintComment(id: string, comment: string) {
    return this.http.post<ApiResponse>(`${this.BASE}/complaints/${id}/comments`, { comment });
  }

  // ─── VISITORS ────────────────────────────────────────────────────────
  getVisitors(query?: PaginationQuery) {
    return this.http.get<ApiResponse>(`${this.BASE}/visitors`, { params: this.buildParams(query) });
  }

  createVisitor(body: any) {
    return this.http.post<ApiResponse>(`${this.BASE}/visitors`, body);
  }

  approveVisitor(id: string) {
    return this.http.patch<ApiResponse>(`${this.BASE}/visitors/${id}/approve`, {});
  }

  checkInVisitor(id: string) {
    return this.http.patch<ApiResponse>(`${this.BASE}/visitors/${id}/checkin`, {});
  }

  checkOutVisitor(id: string) {
    return this.http.patch<ApiResponse>(`${this.BASE}/visitors/${id}/checkout`, {});
  }

  // ─── INVENTORY ───────────────────────────────────────────────────────
  getInventory(query?: PaginationQuery) {
    return this.http.get<ApiResponse>(`${this.BASE}/inventory`, { params: this.buildParams(query) });
  }

  createInventoryItem(body: any) {
    return this.http.post<ApiResponse>(`${this.BASE}/inventory`, body);
  }

  updateInventoryItem(id: string, body: any) {
    return this.http.put<ApiResponse>(`${this.BASE}/inventory/${id}`, body);
  }

  deleteInventoryItem(id: string) {
    return this.http.delete<ApiResponse>(`${this.BASE}/inventory/${id}`);
  }

  addInventoryTransaction(id: string, body: any) {
    return this.http.post<ApiResponse>(`${this.BASE}/inventory/${id}/transactions`, body);
  }

  // ─── PARKING ─────────────────────────────────────────────────────────
  getParkingSlots(query?: PaginationQuery) {
    return this.http.get<ApiResponse>(`${this.BASE}/parking`, { params: this.buildParams(query) });
  }

  getParkingStats() {
    return this.http.get<ApiResponse>(`${this.BASE}/parking/stats`);
  }

  createParkingSlot(body: any) {
    return this.http.post<ApiResponse>(`${this.BASE}/parking`, body);
  }

  assignParkingSlot(id: string, body: any) {
    return this.http.patch<ApiResponse>(`${this.BASE}/parking/${id}/assign`, body);
  }

  releaseParkingSlot(id: string) {
    return this.http.patch<ApiResponse>(`${this.BASE}/parking/${id}/release`, {});
  }

  // ─── ANALYTICS ───────────────────────────────────────────────────────
  getDashboardStats() {
    return this.http.get<ApiResponse>(`${this.BASE}/analytics/dashboard`);
  }

  getMaintenanceAnalytics(year?: number) {
    const params = year ? new HttpParams().set('year', year.toString()) : undefined;
    return this.http.get<ApiResponse>(`${this.BASE}/analytics/maintenance`, { params });
  }

  getComplaintAnalytics() {
    return this.http.get<ApiResponse>(`${this.BASE}/analytics/complaints`);
  }

  getPlatformAnalytics() {
    return this.http.get<ApiResponse>(`${this.BASE}/analytics/platform`);
  }

  // ─── SUBSCRIPTION ────────────────────────────────────────────────────
  getMySubscription() {
    return this.http.get<ApiResponse>(`${this.BASE}/subscriptions/my`);
  }

  createCheckout(plan: string) {
    return this.http.post<ApiResponse>(`${this.BASE}/subscriptions/checkout`, {
      plan,
      successUrl: `${window.location.origin}/dashboard/subscription?success=true`,
      cancelUrl: `${window.location.origin}/dashboard/subscription?canceled=true`,
    });
  }

  cancelSubscription() {
    return this.http.post<ApiResponse>(`${this.BASE}/subscriptions/cancel`, {});
  }

  getPlatformRevenue() {
    return this.http.get<ApiResponse>(`${this.BASE}/subscriptions/revenue`);
  }

  getAllSubscriptions(query?: PaginationQuery) {
    return this.http.get<ApiResponse>(`${this.BASE}/subscriptions/all`, { params: this.buildParams(query) });
  }
}
