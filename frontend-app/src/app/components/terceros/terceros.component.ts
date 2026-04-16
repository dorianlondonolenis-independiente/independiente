import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-terceros',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid py-4 px-4">
      <div class="page-header mb-4">
        <h2><i class="bi bi-people-fill me-2 text-primary"></i>Terceros</h2>
        <p class="text-muted mb-0">Gestión de clientes, proveedores y empleados</p>
      </div>

      <!-- Stats -->
      <div class="row g-3 mb-4" *ngIf="stats()">
        <div class="col-6 col-lg-3">
          <div class="stat-card" style="border-left-color:#0d6efd">
            <span class="stat-value">{{ stats().total_terceros | number }}</span>
            <span class="stat-label">Total Terceros</span>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="stat-card" style="border-left-color:#198754">
            <span class="stat-value">{{ stats().clientes | number }}</span>
            <span class="stat-label">Clientes</span>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="stat-card" style="border-left-color:#fd7e14">
            <span class="stat-value">{{ stats().proveedores | number }}</span>
            <span class="stat-label">Proveedores</span>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="stat-card" style="border-left-color:#6f42c1">
            <span class="stat-value">{{ stats().empleados | number }}</span>
            <span class="stat-label">Empleados</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-body py-3">
          <div class="row g-2 align-items-end">
            <div class="col-md-4">
              <input type="text" class="form-control form-control-sm" placeholder="Buscar NIT, razón social..."
                     [(ngModel)]="filtros.buscar" (keyup.enter)="cargar()">
            </div>
            <div class="col-md-2">
              <select class="form-select form-select-sm" [(ngModel)]="filtros.tipo" (change)="cargar()">
                <option value="">Todos</option>
                <option value="1">Persona Natural</option>
                <option value="2">Persona Jurídica</option>
              </select>
            </div>
            <div class="col-auto">
              <button class="btn btn-sm btn-primary" (click)="cargar()"><i class="bi bi-search me-1"></i>Buscar</button>
              <button class="btn btn-sm btn-outline-secondary ms-1" (click)="limpiar()"><i class="bi bi-x-lg"></i></button>
            </div>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="card border-0 shadow-sm">
        <div class="card-body p-0">
          <div *ngIf="loading()" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
          <div class="table-responsive" *ngIf="!loading() && datos().length > 0">
            <table class="table table-hover table-sm mb-0">
              <thead class="table-light">
                <tr>
                  <th>NIT</th>
                  <th>Razón Social</th>
                  <th>Establecimiento</th>
                  <th class="text-center">Tipo</th>
                  <th class="text-center">Roles</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let t of datos()">
                  <td><code class="text-primary">{{ t.nit }}</code></td>
                  <td class="fw-semibold">{{ t.razon_social }}</td>
                  <td>{{ t.nombre_establecimiento || '-' }}</td>
                  <td class="text-center">
                    <span class="badge bg-secondary bg-opacity-10 text-dark">{{ t.tipo_tercero === 1 ? 'Natural' : 'Jurídica' }}</span>
                  </td>
                  <td class="text-center">
                    <span class="badge bg-success bg-opacity-10 text-success me-1" *ngIf="t.es_cliente === 1">Cliente</span>
                    <span class="badge bg-warning bg-opacity-10 text-warning me-1" *ngIf="t.es_proveedor === 1">Proveedor</span>
                    <span class="badge bg-info bg-opacity-10 text-info" *ngIf="t.es_empleado === 1">Empleado</span>
                  </td>
                  <td>
                    <button class="btn btn-sm btn-outline-primary py-0" (click)="verDetalle(t.rowid)">
                      <i class="bi bi-eye"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div *ngIf="!loading() && datos().length === 0" class="text-center py-5 text-muted">
            <i class="bi bi-inbox display-4"></i><p class="mt-2">Sin terceros encontrados</p>
          </div>
        </div>
        <div class="card-footer bg-white d-flex justify-content-between" *ngIf="total() > 0">
          <small class="text-muted">{{ datos().length }} de {{ total() | number }}</small>
          <div>
            <button class="btn btn-sm btn-outline-primary me-1" [disabled]="offset() === 0" (click)="paginar(-1)">Anterior</button>
            <button class="btn btn-sm btn-outline-primary" [disabled]="offset() + 100 >= total()" (click)="paginar(1)">Siguiente</button>
          </div>
        </div>
      </div>

      <!-- Modal detalle -->
      <div class="modal fade" [class.show]="detalleVisible()" [style.display]="detalleVisible() ? 'block' : 'none'" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title"><i class="bi bi-person-badge me-2"></i>Detalle del Tercero</h5>
              <button type="button" class="btn-close" (click)="detalleVisible.set(false)"></button>
            </div>
            <div class="modal-body" *ngIf="detalle()">
              <div class="row g-3 mb-4" *ngIf="detalle().tercero">
                <div class="col-md-6">
                  <p class="mb-1"><strong>NIT:</strong> {{ detalle().tercero.nit }}</p>
                  <p class="mb-1"><strong>Razón Social:</strong> {{ detalle().tercero.razon_social }}</p>
                  <p class="mb-1"><strong>Establecimiento:</strong> {{ detalle().tercero.nombre_establecimiento || 'N/A' }}</p>
                </div>
                <div class="col-md-6">
                  <p class="mb-1"><strong>Nombres:</strong> {{ detalle().tercero.nombres || 'N/A' }}</p>
                  <p class="mb-1"><strong>Apellidos:</strong> {{ detalle().tercero.apellido1 || '' }} {{ detalle().tercero.apellido2 || '' }}</p>
                  <p class="mb-1"><strong>Tipo:</strong> {{ detalle().tercero.tipo_tercero === 1 ? 'Persona Natural' : 'Persona Jurídica' }}</p>
                  <p class="mb-0"><strong>Estado:</strong> <span class="badge" [class.bg-success]="detalle().tercero.estado === 1" [class.bg-secondary]="detalle().tercero.estado !== 1">{{ detalle().tercero.estado === 1 ? 'Activo' : 'Inactivo' }}</span></p>
                </div>
              </div>

              <h6 class="fw-semibold" *ngIf="detalle().saldos?.length > 0">
                <i class="bi bi-wallet2 me-1"></i>Saldos Abiertos ({{ detalle().saldos.length }})
              </h6>
              <table class="table table-sm" *ngIf="detalle().saldos?.length > 0">
                <thead class="table-light">
                  <tr>
                    <th>Tipo</th>
                    <th>Consec.</th>
                    <th>Fecha Doc</th>
                    <th>Vencimiento</th>
                    <th class="text-end">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let s of detalle().saldos">
                    <td><code>{{ s.tipo_docto }}</code></td>
                    <td>{{ s.consecutivo }}</td>
                    <td>{{ s.fecha_documento | date:'dd/MM/yyyy' }}</td>
                    <td>{{ s.fecha_vencimiento | date:'dd/MM/yyyy' }}</td>
                    <td class="text-end fw-semibold">\${{ s.saldo | number:'1.0-0' }}</td>
                  </tr>
                </tbody>
              </table>
              <p *ngIf="!detalle().saldos || detalle().saldos.length === 0" class="text-muted">Sin saldos abiertos</p>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show" *ngIf="detalleVisible()" (click)="detalleVisible.set(false)"></div>
    </div>
  `,
  styles: [`
    .page-header h2 { font-size:1.5rem; font-weight:700; }
    .stat-card { background:#fff; border-radius:10px; padding:16px; border-left:4px solid; box-shadow:0 1px 3px rgba(0,0,0,0.06); }
    .stat-value { display:block; font-size:1.3rem; font-weight:700; }
    .stat-label { font-size:0.75rem; color:#6c757d; }
    th { font-size:0.8rem; text-transform:uppercase; }
    td { font-size:0.85rem; vertical-align:middle; }
  `]
})
export class TercerosComponent implements OnInit {
  private http = inject(HttpClient);
  private api = 'http://localhost:3000/api/terceros';

  loading = signal(false);
  datos = signal<any[]>([]);
  total = signal(0);
  offset = signal(0);
  stats = signal<any>(null);
  filtros = { buscar: '', tipo: '' };

  detalleVisible = signal(false);
  detalle = signal<any>(null);

  ngOnInit() {
    this.http.get<any>(`${this.api}/stats`).subscribe(s => this.stats.set(s));
    this.cargar();
  }

  cargar() {
    this.loading.set(true);
    const params: any = { limit: 100, offset: this.offset() };
    if (this.filtros.buscar) params.buscar = this.filtros.buscar;
    if (this.filtros.tipo) params.tipo = this.filtros.tipo;

    this.http.get<any>(`${this.api}/lista`, { params }).subscribe({
      next: (r) => { this.datos.set(r.datos || []); this.total.set(r.total || 0); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  verDetalle(rowid: number) {
    this.http.get<any>(`${this.api}/${rowid}`).subscribe(d => {
      this.detalle.set(d);
      this.detalleVisible.set(true);
    });
  }

  paginar(dir: number) {
    this.offset.set(Math.max(0, this.offset() + dir * 100));
    this.cargar();
  }

  limpiar() {
    this.filtros = { buscar: '', tipo: '' };
    this.offset.set(0);
    this.cargar();
  }
}
