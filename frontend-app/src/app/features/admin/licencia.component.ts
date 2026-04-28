import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService, AuthUser } from '../../auth/auth.service';

interface LicenseHistoryRow {
  id: string;
  keyId: string;
  userId: string;
  username: string;
  issuedAt: string;
  expiresAt: string;
  appliedAt: string;
}

@Component({
  selector: 'app-admin-licencia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid p-4">
      <div class="d-flex align-items-center mb-3">
        <div>
          <h4 class="mb-0"><i class="bi bi-key-fill me-2 text-warning"></i>Licencia / Suscripción</h4>
          <small class="text-muted">Aplica una key generada para extender la suscripción de un usuario SaaS.</small>
        </div>
      </div>

      <div class="row g-3">
        <div class="col-lg-7">
          <div class="card shadow-sm">
            <div class="card-header bg-white">
              <strong><i class="bi bi-1-circle me-1"></i> Selecciona usuario</strong>
            </div>
            <div class="card-body">
              <div class="table-responsive" style="max-height: 360px; overflow-y: auto;">
                <table class="table table-sm table-hover align-middle mb-0">
                  <thead class="table-light sticky-top">
                    <tr>
                      <th></th>
                      <th>Usuario</th>
                      <th>ID</th>
                      <th>Tipo</th>
                      <th>Expira</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let u of users()" (click)="select(u)" style="cursor: pointer;"
                        [class.table-active]="selected()?.id === u.id">
                      <td><i class="bi bi-circle-fill" [style.color]="selected()?.id === u.id ? '#0d6efd' : '#dee2e6'"></i></td>
                      <td>
                        <div class="fw-semibold">{{ u.username }}</div>
                        <small class="text-muted">{{ u.nombre }}</small>
                      </td>
                      <td><code class="small">{{ u.id }}</code></td>
                      <td>
                        <span *ngIf="u.esSuscripcion" class="badge bg-info">SaaS</span>
                        <span *ngIf="!u.esSuscripcion" class="badge bg-success">On-Prem</span>
                      </td>
                      <td>
                        <span *ngIf="u.fechaExpiracion" [class.text-danger]="isExpired(u.fechaExpiracion)">
                          {{ u.fechaExpiracion | date: 'yyyy-MM-dd' }}
                        </span>
                        <span *ngIf="!u.fechaExpiracion" class="text-muted">—</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-5">
          <div class="card shadow-sm mb-3">
            <div class="card-header bg-white">
              <strong><i class="bi bi-2-circle me-1"></i> Aplicar key</strong>
            </div>
            <div class="card-body">
              <div *ngIf="!selected()" class="text-muted small">
                Selecciona primero un usuario en la lista.
              </div>
              <div *ngIf="selected() as u">
                <div class="alert alert-light border small mb-2">
                  Aplicar key al usuario:
                  <strong>{{ u.username }}</strong><br />
                  <code class="text-muted">{{ u.id }}</code>
                </div>
                <textarea class="form-control font-monospace small" rows="6"
                          [(ngModel)]="key" placeholder="Pega aquí la key recibida (formato xxxxx.yyyyy)"></textarea>

                <div *ngIf="error()" class="alert alert-danger py-2 small mt-2 mb-0">{{ error() }}</div>
                <div *ngIf="success()" class="alert alert-success py-2 small mt-2 mb-0">
                  <i class="bi bi-check-circle me-1"></i>{{ success() }}
                </div>

                <button class="btn btn-warning text-dark w-100 mt-2"
                        [disabled]="applying() || !key.trim()" (click)="apply()">
                  <span *ngIf="applying()" class="spinner-border spinner-border-sm me-2"></span>
                  <i *ngIf="!applying()" class="bi bi-key me-1"></i>
                  Aplicar key
                </button>
              </div>
            </div>
          </div>

          <div class="card shadow-sm" *ngIf="selected()">
            <div class="card-header bg-white d-flex justify-content-between align-items-center">
              <strong><i class="bi bi-clock-history me-1"></i> Historial</strong>
              <button class="btn btn-sm btn-outline-secondary" (click)="loadHistory()">
                <i class="bi bi-arrow-clockwise"></i>
              </button>
            </div>
            <div class="card-body p-0">
              <table class="table table-sm mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Aplicada</th>
                    <th>Vence</th>
                    <th>Key ID</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let h of history()">
                    <td><small>{{ h.appliedAt | date: 'yyyy-MM-dd HH:mm' }}</small></td>
                    <td><small>{{ h.expiresAt | date: 'yyyy-MM-dd' }}</small></td>
                    <td><code class="small">{{ h.keyId.substring(0, 8) }}…</code></td>
                  </tr>
                  <tr *ngIf="history().length === 0">
                    <td colspan="3" class="text-center text-muted small py-3">Sin keys aplicadas.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LicenciaComponent {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  users = signal<AuthUser[]>([]);
  selected = signal<AuthUser | null>(null);
  history = signal<LicenseHistoryRow[]>([]);

  key = '';
  applying = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  ngOnInit() {
    this.http.get<AuthUser[]>(`${this.auth.apiUrl}/users`).subscribe({
      // El admin maestro tiene acceso ilimitado: no se le aplican licencias.
      next: (list) => this.users.set(list.filter((u) => u.rol !== 'admin')),
      error: () => this.users.set([]),
    });
  }

  isExpired(date: string | null) {
    if (!date) return false;
    return new Date(date).getTime() < Date.now();
  }

  select(u: AuthUser) {
    this.selected.set(u);
    this.key = '';
    this.error.set(null);
    this.success.set(null);
    this.loadHistory();
  }

  loadHistory() {
    const u = this.selected();
    if (!u) return;
    this.http
      .get<LicenseHistoryRow[]>(`${this.auth.apiUrl}/license/history/${u.id}`)
      .subscribe({
        next: (h) => this.history.set(h),
        error: () => this.history.set([]),
      });
  }

  apply() {
    const u = this.selected();
    if (!u || !this.key.trim()) return;
    this.applying.set(true);
    this.error.set(null);
    this.success.set(null);
    this.http
      .post<{ ok: boolean; fechaExpiracion: string }>(`${this.auth.apiUrl}/license/apply`, {
        userId: u.id,
        key: this.key.trim(),
      })
      .subscribe({
        next: (res) => {
          this.applying.set(false);
          this.success.set(`Suscripción extendida hasta ${new Date(res.fechaExpiracion).toLocaleDateString()}.`);
          this.key = '';
          this.loadHistory();
          // Refrescar la lista de usuarios para ver la nueva fecha.
          this.http.get<AuthUser[]>(`${this.auth.apiUrl}/users`).subscribe({
            next: (list) => {
              this.users.set(list);
              const updated = list.find((x) => x.id === u.id);
              if (updated) this.selected.set(updated);
            },
          });
        },
        error: (err) => {
          this.applying.set(false);
          const msg = err?.error?.message || 'Key inválida.';
          this.error.set(Array.isArray(msg) ? msg.join(' / ') : msg);
        },
      });
  }
}
