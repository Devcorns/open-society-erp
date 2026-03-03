import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
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
          <p class="subtitle">Sign in to your account</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
          <div class="form-group">
            <label for="email">Email Address</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              placeholder="admin@example.com"
              [class.error]="isInvalid('email')"
            />
            @if (isInvalid('email')) {
              <span class="error-msg">Valid email is required</span>
            }
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <div class="input-with-toggle">
              <input
                id="password"
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                placeholder="••••••••"
                [class.error]="isInvalid('password')"
              />
              <button type="button" class="toggle-btn" (click)="showPassword.set(!showPassword())">
                {{ showPassword() ? '🙈' : '👁️' }}
              </button>
            </div>
            @if (isInvalid('password')) {
              <span class="error-msg">Password is required</span>
            }
          </div>

          @if (errorMsg()) {
            <div class="alert alert-error">{{ errorMsg() }}</div>
          }

          <button type="submit" class="btn-primary" [disabled]="loading()">
            @if (loading()) {
              <span class="spinner"></span> Signing in...
            } @else {
              Sign In
            }
          </button>
        </form>

        <div class="demo-creds">
          <p><strong>Demo Credentials</strong></p>
          <div class="cred-list">
            @for (cred of demoCreds; track cred.label) {
              <button class="cred-btn" (click)="fillCred(cred.email, cred.pass)">
                {{ cred.label }}
              </button>
            }
          </div>
        </div>
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
      padding: 1rem;
    }
    .auth-card {
      background: white;
      border-radius: 16px;
      padding: 2.5rem;
      width: 100%;
      max-width: 440px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
    }
    .auth-header { text-align: center; margin-bottom: 2rem; }
    .logo { display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
    .logo-icon { font-size: 2rem; }
    .logo h1 { font-size: 1.8rem; font-weight: 700; color: #2d3748; margin: 0; }
    .subtitle { color: #718096; margin-top: 0.5rem; }
    .auth-form { display: flex; flex-direction: column; gap: 1.25rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
    label { font-size: 0.875rem; font-weight: 600; color: #4a5568; }
    input {
      padding: 0.75rem 1rem;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s;
      width: 100%;
      box-sizing: border-box;
    }
    input:focus { outline: none; border-color: #667eea; }
    input.error { border-color: #fc8181; }
    .input-with-toggle { position: relative; }
    .input-with-toggle input { padding-right: 3rem; }
    .toggle-btn {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.1rem;
    }
    .error-msg { font-size: 0.75rem; color: #e53e3e; }
    .alert { padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.875rem; }
    .alert-error { background: #fff5f5; color: #c53030; border: 1px solid #fed7d7; }
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
    }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .demo-creds {
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid #e2e8f0;
    }
    .demo-creds p { font-size: 0.875rem; color: #718096; margin: 0 0 0.75rem; text-align: center; }
    .cred-list { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
    .cred-btn {
      padding: 0.4rem 0.875rem;
      background: #edf2f7;
      border: none;
      border-radius: 20px;
      font-size: 0.75rem;
      cursor: pointer;
      color: #4a5568;
      transition: background 0.2s;
    }
    .cred-btn:hover { background: #e2e8f0; }
  `],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  loading = signal(false);
  errorMsg = signal('');
  showPassword = signal(false);

  demoCreds = [
    { label: 'Platform Owner', email: 'owner@societytracker.com', pass: 'PlatformOwner@2024!' },
    { label: 'Super Admin', email: 'superadmin@societytracker.com', pass: 'SuperAdmin@2024!' },
    { label: 'Society Admin', email: 'admin@greenvalley.com', pass: 'SocietyAdmin@2024!' },
    { label: 'Resident', email: 'ankit@resident.com', pass: 'Resident@2024!' },
  ];

  isInvalid(field: string) {
    const ctrl = this.form.get(field);
    return ctrl?.invalid && ctrl?.touched;
  }

  fillCred(email: string, pass: string) {
    this.form.patchValue({ email, password: pass });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMsg.set('');

    this.auth.login(this.form.value).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.message ?? 'Login failed. Please try again.');
      },
    });
  }
}
