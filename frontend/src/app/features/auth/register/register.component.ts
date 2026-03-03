import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-wrapper">
      <div class="auth-card">
        <div class="auth-header">
          <div class="logo">
            <span class="logo-icon">🏢</span>
            <h1>SocietyTracker</h1>
          </div>
          <p class="subtitle">Create your society account</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
          <h3 class="section-label">Society Details</h3>
          <div class="form-row">
            <div class="form-group">
              <label>Society Name</label>
              <input formControlName="tenantName" placeholder="Green Valley Homes" [class.error]="isInvalid('tenantName')" />
            </div>
            <div class="form-group">
              <label>Total Flats</label>
              <input type="number" formControlName="totalFlats" placeholder="100" [class.error]="isInvalid('totalFlats')" />
            </div>
          </div>
          <div class="form-group">
            <label>Address</label>
            <input formControlName="address" placeholder="123 Main St, Springfield" [class.error]="isInvalid('address')" />
          </div>

          <h3 class="section-label">Admin Account</h3>
          <div class="form-row">
            <div class="form-group">
              <label>First Name</label>
              <input formControlName="firstName" placeholder="John" [class.error]="isInvalid('firstName')" />
            </div>
            <div class="form-group">
              <label>Last Name</label>
              <input formControlName="lastName" placeholder="Doe" [class.error]="isInvalid('lastName')" />
            </div>
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" formControlName="email" placeholder="admin@yoursociety.com" [class.error]="isInvalid('email')" />
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" formControlName="password" placeholder="Min 8 chars, include number & symbol" [class.error]="isInvalid('password')" />
          </div>
          <div class="form-group">
            <label>Confirm Password</label>
            <input type="password" formControlName="confirmPassword" placeholder="Repeat password" [class.error]="isInvalid('confirmPassword')" />
            @if (form.errors?.['mismatch'] && form.get('confirmPassword')?.touched) {
              <span class="error-msg">Passwords do not match</span>
            }
          </div>

          @if (errorMsg()) {
            <div class="alert alert-error">{{ errorMsg() }}</div>
          }
          @if (successMsg()) {
            <div class="alert alert-success">{{ successMsg() }}</div>
          }

          <button type="submit" class="btn-primary" [disabled]="loading()">
            @if (loading()) {
              <span class="spinner"></span> Creating account...
            } @else {
              Create Account
            }
          </button>

          <p class="login-link">Already have an account? <a routerLink="/auth/login">Sign in</a></p>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .auth-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem 1rem;
    }
    .auth-card {
      background: white;
      border-radius: 16px;
      padding: 2.5rem;
      width: 100%;
      max-width: 560px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
    }
    .auth-header { text-align: center; margin-bottom: 2rem; }
    .logo { display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
    .logo-icon { font-size: 2rem; }
    .logo h1 { font-size: 1.8rem; font-weight: 700; color: #2d3748; margin: 0; }
    .subtitle { color: #718096; margin-top: 0.5rem; }
    .auth-form { display: flex; flex-direction: column; gap: 1rem; }
    .section-label { font-size: 0.875rem; font-weight: 700; color: #667eea; text-transform: uppercase; letter-spacing: 0.05em; margin: 0.5rem 0 0; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
    label { font-size: 0.875rem; font-weight: 600; color: #4a5568; }
    input {
      padding: 0.7rem 1rem;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 0.95rem;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }
    input:focus { outline: none; border-color: #667eea; }
    input.error { border-color: #fc8181; }
    .error-msg { font-size: 0.75rem; color: #e53e3e; }
    .alert { padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.875rem; }
    .alert-error { background: #fff5f5; color: #c53030; border: 1px solid #fed7d7; }
    .alert-success { background: #f0fff4; color: #276749; border: 1px solid #c6f6d5; }
    .btn-primary {
      padding: 0.875rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: opacity 0.2s;
      margin-top: 0.5rem;
    }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .spinner {
      width: 18px; height: 18px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .login-link { text-align: center; font-size: 0.875rem; color: #718096; margin: 0; }
    .login-link a { color: #667eea; text-decoration: none; font-weight: 600; }
  `],
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private http = inject(HttpClient);

  loading = signal(false);
  errorMsg = signal('');
  successMsg = signal('');

  form: FormGroup = this.fb.group(
    {
      tenantName: ['', Validators.required],
      totalFlats: [100, [Validators.required, Validators.min(1)]],
      address: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: (g: AbstractControl) => g.get('password')?.value !== g.get('confirmPassword')?.value ? { mismatch: true } : null }
  );

  isInvalid(field: string) {
    const ctrl = this.form.get(field);
    return ctrl?.invalid && ctrl?.touched;
  }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.errorMsg.set('');

    const { confirmPassword, ...payload } = this.form.value;
    this.http.post<any>(`${environment.apiUrl}/auth/register`, payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.successMsg.set('Account created! Redirecting to login...');
        setTimeout(() => this.router.navigate(['/auth/login']), 2000);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.message ?? 'Registration failed.');
      },
    });
  }
}
