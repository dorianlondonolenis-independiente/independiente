import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container d-flex align-items-center justify-content-center"
         style="min-height: 100vh; background: linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);">
      <div class="card shadow-lg" style="width: 380px; max-width: 92vw; border: none; border-radius: 14px;">
        <div class="card-body p-4">
          <div class="text-center mb-4">
            <div style="width: 64px; height: 64px; background: linear-gradient(135deg,#3b82f6,#1e3a8a); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center;">
              <i class="bi bi-database-fill-gear text-white" style="font-size: 1.8rem;"></i>
            </div>
            <h4 class="mt-3 mb-1 fw-bold">Independiente</h4>
            <p class="text-muted small mb-0">Inicia sesión para continuar</p>
          </div>

          <form (submit)="submit($event)" autocomplete="off">
            <div class="mb-3">
              <label class="form-label small fw-semibold">Usuario</label>
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-person"></i></span>
                <input type="text" class="form-control" required
                       [(ngModel)]="username" name="username"
                       placeholder="admin@local" autocomplete="username" />
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label small fw-semibold">Contraseña</label>
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-lock"></i></span>
                <input [type]="showPwd() ? 'text' : 'password'"
                       class="form-control" required
                       [(ngModel)]="password" name="password"
                       autocomplete="current-password" />
                <button type="button" class="btn btn-outline-secondary"
                        (click)="showPwd.set(!showPwd())">
                  <i class="bi" [class.bi-eye]="!showPwd()" [class.bi-eye-slash]="showPwd()"></i>
                </button>
              </div>
            </div>

            <div *ngIf="error()" class="alert alert-danger py-2 small mb-3">
              <i class="bi bi-exclamation-triangle me-1"></i>{{ error() }}
            </div>

            <button type="submit" class="btn btn-primary w-100" [disabled]="loading()">
              <span *ngIf="loading()" class="spinner-border spinner-border-sm me-2"></span>
              <i *ngIf="!loading()" class="bi bi-box-arrow-in-right me-1"></i>
              Iniciar sesión
            </button>
          </form>

          <div class="text-center mt-4">
            <small class="text-muted">© 2026 Independiente</small>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  loading = signal(false);
  error = signal<string | null>(null);
  showPwd = signal(false);

  submit(event: Event) {
    event.preventDefault();
    if (!this.username || !this.password) return;
    this.loading.set(true);
    this.error.set(null);
    this.auth.login(this.username.trim(), this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message || err?.message || 'Error al iniciar sesión';
        this.error.set(typeof msg === 'string' ? msg : 'Credenciales inválidas.');
      },
    });
  }
}
