import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  tenantId: string | null;
  flatNumber: string | null;
  phone: string | null;
  profileImage: string | null;
  isActive: boolean;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = environment.apiUrl;

  // Signals for reactive auth state
  private _user = signal<User | null>(this.loadFromStorage('user'));
  private _accessToken = signal<string | null>(this.loadFromStorage('accessToken'));
  private _refreshToken = signal<string | null>(this.loadFromStorage('refreshToken'));

  // Public readonly computed signals
  user = computed(() => this._user());
  accessToken = computed(() => this._accessToken());
  isAuthenticated = computed(() => !!this._accessToken() && !!this._user());
  userRole = computed(() => this._user()?.role);
  tenantId = computed(() => this._user()?.tenantId);

  constructor(private http: HttpClient, private router: Router) {}

  login(body: { email: string; password: string }) {
    return this.http
      .post<any>(`${this.API}/auth/login`, body)
      .pipe(
        tap((res) => {
          if (res.success) {
            this.setAuthState(res.data.accessToken, res.data.refreshToken, res.data.user);
          }
        }),
        catchError((err) => throwError(() => err.error || err))
      );
  }

  refresh() {
    const refreshToken = this._refreshToken();
    if (!refreshToken) return throwError(() => new Error('No refresh token'));
    return this.http
      .post<any>(`${this.API}/auth/refresh`, { refreshToken })
      .pipe(
        tap((res) => {
          if (res.success) {
            this._accessToken.set(res.data.accessToken);
            this._refreshToken.set(res.data.refreshToken);
            localStorage.setItem('accessToken', res.data.accessToken);
            localStorage.setItem('refreshToken', res.data.refreshToken);
          }
        }),
        map((res) => res.data.accessToken as string)
      );
  }

  logout() {
    const refreshToken = this._refreshToken();
    this.http.post(`${this.API}/auth/logout`, { refreshToken }).subscribe();
    this.clearAuthState();
    this.router.navigate(['/auth/login']);
  }

  getProfile() {
    return this.http.get<any>(`${this.API}/auth/profile`).pipe(
      tap((res) => {
        if (res.success) {
          this._user.set(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        }
      })
    );
  }

  private setAuthState(accessToken: string, refreshToken: string, user: User) {
    this._accessToken.set(accessToken);
    this._refreshToken.set(refreshToken);
    this._user.set(user);
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
  }

  private clearAuthState() {
    this._accessToken.set(null);
    this._refreshToken.set(null);
    this._user.set(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  private loadFromStorage(key: string): any {
    if (typeof window === 'undefined') return null;
    const item = localStorage.getItem(key);
    if (!item) return null;
    try {
      return JSON.parse(item);
    } catch {
      return item;
    }
  }

  hasRole(...roles: string[]): boolean {
    return roles.includes(this._user()?.role || '');
  }

  isAdmin(): boolean {
    return this.hasRole('PLATFORM_OWNER', 'SUPER_ADMIN', 'SOCIETY_ADMIN', 'SUB_ADMIN');
  }

  isPlatformAdmin(): boolean {
    return this.hasRole('PLATFORM_OWNER', 'SUPER_ADMIN');
  }
}
