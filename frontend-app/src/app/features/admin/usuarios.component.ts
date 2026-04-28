import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService, AuthUser } from '../../auth/auth.service';
import { APP_MODULES } from '../../auth/modules';

interface UserForm {
  id?: string;
  username: string;
  email: string;
  nombre: string;
  password: string;
  rol: 'admin' | 'user';
  activo: boolean;
  esSuscripcion: boolean;
  fechaExpiracion: string; // yyyy-MM-dd
  modulosPermitidos: string[];
}

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid p-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 class="mb-0"><i class="bi bi-people-fill me-2 text-primary"></i>Usuarios</h4>
          <small class="text-muted">Gestiona usuarios y módulos accesibles.</small>
        </div>
        <button class="btn btn-primary" (click)="openNew()">
          <i class="bi bi-person-plus me-1"></i>Nuevo usuario
        </button>
      </div>

      <div class="card shadow-sm">
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th>Usuario</th>
                  <th>Nombre</th>
                  <th>Rol</th>
                  <th>Suscripción</th>
                  <th>Expira</th>
                  <th>Módulos</th>
                  <th>Estado</th>
                  <th class="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let u of users()">
                  <td>
                    <div class="fw-semibold">{{ u.username }}</div>
                    <small class="text-muted">{{ u.email }}</small>
                  </td>
                  <td>{{ u.nombre }}</td>
                  <td>
                    <span class="badge" [class.bg-danger]="u.rol === 'admin'" [class.bg-secondary]="u.rol !== 'admin'">
                      {{ u.rol }}
                    </span>
                  </td>
                  <td>
                    <span *ngIf="u.esSuscripcion" class="badge bg-info">SaaS</span>
                    <span *ngIf="!u.esSuscripcion" class="badge bg-success">On-Premise</span>
                  </td>
                  <td>
                    <span *ngIf="u.fechaExpiracion" [class.text-danger]="isExpired(u.fechaExpiracion)">
                      {{ u.fechaExpiracion | date: 'yyyy-MM-dd' }}
                    </span>
                    <span *ngIf="!u.fechaExpiracion" class="text-muted">—</span>
                  </td>
                  <td>
                    <span *ngIf="u.modulosPermitidos.includes('*')" class="badge bg-warning text-dark">Todos</span>
                    <span *ngIf="!u.modulosPermitidos.includes('*')" class="text-muted small">
                      {{ u.modulosPermitidos.length }} módulos
                    </span>
                  </td>
                  <td>
                    <span class="badge" [class.bg-success]="u.activo" [class.bg-secondary]="!u.activo">
                      {{ u.activo ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary me-1"
                            (click)="openEdit(u)" [disabled]="u.username === 'admin@local'">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger"
                            (click)="remove(u)" [disabled]="u.username === 'admin@local'">
                      <i class="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
                <tr *ngIf="users().length === 0">
                  <td colspan="8" class="text-center text-muted py-4">
                    Sin usuarios.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Modal -->
      <div *ngIf="showModal()" class="modal-backdrop-custom" (click)="close()">
        <div class="modal-dialog-custom" (click)="$event.stopPropagation()">
          <div class="modal-content shadow-lg">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="bi bi-person-gear me-2"></i>
                {{ form().id ? 'Editar usuario' : 'Nuevo usuario' }}
              </h5>
              <button class="btn-close" (click)="close()"></button>
            </div>
            <div class="modal-body">
              <div *ngIf="formError()" class="alert alert-danger py-2 small">{{ formError() }}</div>

              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label small fw-semibold">Username (email)</label>
                  <input type="email" class="form-control" [(ngModel)]="form().username"
                         [disabled]="!!form().id" required />
                </div>
                <div class="col-md-6">
                  <label class="form-label small fw-semibold">Email de contacto</label>
                  <input type="email" class="form-control" [(ngModel)]="form().email" />
                </div>
                <div class="col-md-6">
                  <label class="form-label small fw-semibold">Nombre completo</label>
                  <input type="text" class="form-control" [(ngModel)]="form().nombre" />
                </div>
                <div class="col-md-6">
                  <label class="form-label small fw-semibold">
                    {{ form().id ? 'Nueva contraseña (opcional)' : 'Contraseña' }}
                  </label>
                  <input type="text" class="form-control" [(ngModel)]="form().password" />
                </div>
                <div class="col-md-4 d-flex align-items-end">
                  <div class="form-check form-switch mb-2">
                    <input type="checkbox" class="form-check-input" id="sw-activo" [(ngModel)]="form().activo" />
                    <label class="form-check-label small fw-semibold" for="sw-activo">Activo</label>
                  </div>
                </div>
                <div class="col-md-4 d-flex align-items-end">
                  <div class="form-check form-switch mb-2">
                    <input type="checkbox" class="form-check-input" id="sw-saas" [(ngModel)]="form().esSuscripcion" />
                    <label class="form-check-label small fw-semibold" for="sw-saas">Es suscripción (SaaS)</label>
                  </div>
                </div>
                <div class="col-md-4" *ngIf="form().esSuscripcion">
                  <label class="form-label small fw-semibold">Fecha de expiración</label>
                  <input type="date" class="form-control" [(ngModel)]="form().fechaExpiracion" />
                  <small class="text-muted">Vacío = no expira aún (la prolongación se hace por key).</small>
                </div>
              </div>

              <hr />

              <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="mb-0"><i class="bi bi-grid-fill me-1"></i>Módulos permitidos</h6>
                <div>
                  <button class="btn btn-sm btn-outline-primary me-1" (click)="selectAllModules()">
                    <i class="bi bi-check-all"></i> Todos
                  </button>
                  <button class="btn btn-sm btn-outline-secondary" (click)="clearModules()">
                    <i class="bi bi-x-lg"></i> Ninguno
                  </button>
                </div>
              </div>
              <div class="row g-2">
                <div class="col-lg-4 col-md-6 col-sm-6" *ngFor="let m of modules">
                  <div class="form-check border rounded p-2 px-3">
                    <input class="form-check-input" type="checkbox" [id]="'m-' + m.id"
                           [checked]="form().modulosPermitidos.includes(m.id)"
                           (change)="toggleModule(m.id, $any($event.target).checked)" />
                    <label class="form-check-label small" [for]="'m-' + m.id">
                      <i class="bi me-1" [class]="m.icon"></i>{{ m.label }}
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline-secondary" (click)="close()">Cancelar</button>
              <button class="btn btn-primary" [disabled]="saving()" (click)="save()">
                <span *ngIf="saving()" class="spinner-border spinner-border-sm me-2"></span>
                <i *ngIf="!saving()" class="bi bi-check-lg me-1"></i>
                Guardar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .modal-backdrop-custom {
        position: fixed; inset: 0; background: rgba(0,0,0,0.45);
        display: flex; align-items: flex-start; justify-content: center;
        z-index: 1050; padding: 40px 16px; overflow-y: auto;
      }
      .modal-dialog-custom { width: 100%; max-width: 880px; }
      .modal-content {
        background-color: #ffffff;
        border: 1px solid #dee2e6;
        border-radius: 12px;
        max-height: calc(100vh - 80px);
        display: flex;
        flex-direction: column;
      }
      .modal-content .modal-body {
        overflow-y: auto;
        overflow-x: hidden;
      }
      .modal-content .form-check.border {
        min-height: 44px;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding-left: 2.25rem !important;
      }
      .modal-content .form-check.border .form-check-input {
        margin-left: -1.5rem;
        flex-shrink: 0;
      }
      .modal-content .form-check.border .form-check-label {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        min-width: 0;
      }
      :host-context(body.dark-mode) .modal-content {
        background-color: #1f2937;
        color: #f3f4f6;
        border-color: #374151;
      }
    `,
  ],
})
export class UsuariosComponent {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  modules = APP_MODULES;
  users = signal<AuthUser[]>([]);
  showModal = signal(false);
  saving = signal(false);
  formError = signal<string | null>(null);

  form = signal<UserForm>(this.emptyForm());

  ngOnInit() {
    this.load();
  }

  private emptyForm(): UserForm {
    return {
      username: '',
      email: '',
      nombre: '',
      password: '',
      rol: 'user',
      activo: true,
      esSuscripcion: false,
      fechaExpiracion: '',
      modulosPermitidos: [],
    };
  }

  load() {
    this.http
      .get<AuthUser[]>(`${this.auth.apiUrl}/users`)
      .subscribe({
        next: (list) => this.users.set(list),
        error: () => this.users.set([]),
      });
  }

  isExpired(date: string | null) {
    if (!date) return false;
    return new Date(date).getTime() < Date.now();
  }

  openNew() {
    this.form.set(this.emptyForm());
    this.formError.set(null);
    this.showModal.set(true);
  }

  openEdit(u: AuthUser) {
    this.form.set({
      id: u.id,
      username: u.username,
      email: u.email,
      nombre: u.nombre,
      password: '',
      rol: u.rol,
      activo: u.activo,
      esSuscripcion: u.esSuscripcion,
      fechaExpiracion: u.fechaExpiracion ? u.fechaExpiracion.substring(0, 10) : '',
      modulosPermitidos: [...(u.modulosPermitidos ?? [])],
    });
    this.formError.set(null);
    this.showModal.set(true);
  }

  close() {
    this.showModal.set(false);
  }

  toggleModule(id: string, checked: boolean) {
    const f = this.form();
    const set = new Set(f.modulosPermitidos);
    if (checked) set.add(id);
    else set.delete(id);
    this.form.set({ ...f, modulosPermitidos: Array.from(set) });
  }

  selectAllModules() {
    const f = this.form();
    this.form.set({ ...f, modulosPermitidos: this.modules.map((m) => m.id) });
  }

  clearModules() {
    const f = this.form();
    this.form.set({ ...f, modulosPermitidos: [] });
  }

  save() {
    const f = this.form();
    if (!f.username) {
      this.formError.set('El username es obligatorio.');
      return;
    }
    if (!f.id && !f.password) {
      this.formError.set('La contraseña es obligatoria al crear.');
      return;
    }
    if (f.esSuscripcion && !f.fechaExpiracion) {
      // Para SaaS sin fecha el usuario no podría entrar nunca; advertimos pero permitimos.
    }

    const body: Record<string, unknown> = {
      email: f.email,
      nombre: f.nombre,
      rol: f.rol,
      activo: f.activo,
      esSuscripcion: f.esSuscripcion,
      fechaExpiracion: f.esSuscripcion && f.fechaExpiracion ? new Date(f.fechaExpiracion).toISOString() : null,
      modulosPermitidos: f.modulosPermitidos,
    };
    if (f.password) body['password'] = f.password;
    if (!f.id) body['username'] = f.username;

    this.saving.set(true);
    this.formError.set(null);
    const req = f.id
      ? this.http.put(`${this.auth.apiUrl}/users/${f.id}`, body)
      : this.http.post(`${this.auth.apiUrl}/users`, body);

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.showModal.set(false);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message || 'Error al guardar.';
        this.formError.set(Array.isArray(msg) ? msg.join(' / ') : msg);
      },
    });
  }

  remove(u: AuthUser) {
    if (!confirm(`¿Eliminar al usuario ${u.username}?`)) return;
    this.http.delete(`${this.auth.apiUrl}/users/${u.id}`).subscribe({
      next: () => this.load(),
      error: (err) => alert(err?.error?.message || 'Error al eliminar.'),
    });
  }
}
