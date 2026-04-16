import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-compras',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid py-4 px-4">
      <div class="page-header mb-4">
        <h2><i class="bi bi-truck me-2 text-warning"></i>Compras</h2>
        <p class="text-muted mb-0">Órdenes de compra a proveedores</p>
      </div>

      <!-- Stats -->
      <div class="row g-3 mb-4" *ngIf="stats()">
        <div class="col-6 col-lg-3">
          <div class="stat-card" style="border-left-color:#fd7e14">
            <span class="stat-value">{{ stats().total_ordenes | number }}</span>
            <span class="stat-label">Órdenes</span>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="stat-card" style="border-left-color:#198754">
            <span class="stat-value">\${{ stats().valor_total | number:'1.0-0' }}</span>
            <span class="stat-label">Valor Total</span>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="stat-card" style="border-left-color:#0d6efd">
            <span class="stat-value">{{ stats().proveedores_unicos | number }}</span>
            <span class="stat-label">Proveedores</span>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="stat-card" style="border-left-color:#6f42c1">
            <span class="stat-value">\${{ stats().promedio_orden | number:'1.0-0' }}</span>
            <span class="stat-label">Promedio/Orden</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-body py-3">
          <div class="row g-2 align-items-end">
            <div class="col-md-3">
              <input type="text" class="form-control form-control-sm" placeholder="Buscar proveedor..."
                     [(ngModel)]="filtros.buscar" (keyup.enter)="cargar()">
            </div>
            <div class="col-md-2">
              <input type="date" class="form-control form-control-sm" [(ngModel)]="filtros.fechaDesde">
            </div>
            <div class="col-md-2">
              <input type="date" class="form-control form-control-sm" [(ngModel)]="filtros.fechaHasta">
            </div>
            <div class="col-auto">
              <button class="btn btn-sm btn-primary" (click)="cargar()"><i class="bi bi-search me-1"></i>Buscar</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="card border-0 shadow-sm">
        <div class="card-body p-0">
          <div *ngIf="loading()" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
          <div class="table-responsive" *ngIf="!loading() && ordenes().length > 0">
            <table class="table table-hover table-sm mb-0">
              <thead class="table-light">
                <tr>
                  <th>Tipo Doc</th>
                  <th>Consecutivo</th>
                  <th>Fecha</th>
                  <th>Proveedor</th>
                  <th class="text-end">Valor Bruto</th>
                  <th class="text-end">Valor Neto</th>
                  <th class="text-center">Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let o of ordenes()">
                  <td><code>{{ o.tipo_docto }}</code></td>
                  <td class="fw-semibold">{{ o.consecutivo }}</td>
                  <td>{{ o.fecha | date:'dd/MM/yyyy' }}</td>
                  <td>{{ o.proveedor }}</td>
                  <td class="text-end">\${{ o.valor_bruto | number:'1.0-0' }}</td>
                  <td class="text-end fw-semibold">\${{ o.valor_neto | number:'1.0-0' }}</td>
                  <td class="text-center">
                    <span class="badge rounded-pill" [class.bg-success]="o.estado === 1" [class.bg-warning]="o.estado !== 1">
                      {{ o.estado === 1 ? 'Aprobada' : 'Pendiente' }}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-sm btn-outline-primary py-0" (click)="verDetalle(o.rowid)">
                      <i class="bi bi-eye"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div *ngIf="!loading() && ordenes().length === 0" class="text-center py-5 text-muted">
            <i class="bi bi-inbox display-4"></i><p class="mt-2">Sin órdenes de compra</p>
          </div>
        </div>
        <div class="card-footer bg-white d-flex justify-content-between" *ngIf="total() > 0">
          <small class="text-muted">{{ ordenes().length }} de {{ total() }}</small>
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
              <h5 class="modal-title">Detalle Orden de Compra</h5>
              <button type="button" class="btn-close" (click)="detalleVisible.set(false)"></button>
            </div>
            <div class="modal-body" *ngIf="detalleData()">
              <div class="row mb-3">
                <div class="col-md-4"><strong>Documento:</strong> {{ detalleData().documento?.tipo_docto }} - {{ detalleData().documento?.consecutivo }}</div>
                <div class="col-md-4"><strong>Fecha:</strong> {{ detalleData().documento?.fecha | date:'dd/MM/yyyy' }}</div>
                <div class="col-md-4"><strong>Proveedor:</strong> {{ detalleData().documento?.proveedor }}</div>
              </div>
              <table class="table table-sm" *ngIf="detalleData().lineas?.length > 0">
                <thead class="table-light">
                  <tr><th>Referencia</th><th>Producto</th><th>Bodega</th><th class="text-end">Cantidad</th><th class="text-end">Precio</th><th class="text-end">Total</th></tr>
                </thead>
                <tbody>
                  <tr *ngFor="let l of detalleData().lineas">
                    <td><code>{{ l.referencia }}</code></td>
                    <td>{{ l.producto }}</td>
                    <td>{{ l.bodega }}</td>
                    <td class="text-end">{{ l.cantidad }}</td>
                    <td class="text-end">\${{ l.precio | number:'1.0-0' }}</td>
                    <td class="text-end fw-semibold">\${{ l.valor_total | number:'1.0-0' }}</td>
                  </tr>
                </tbody>
              </table>
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
export class ComprasComponent implements OnInit {
  private http = inject(HttpClient);
  private api = 'http://localhost:3000/api/compras';

  loading = signal(false);
  ordenes = signal<any[]>([]);
  total = signal(0);
  offset = signal(0);
  stats = signal<any>(null);
  filtros = { buscar: '', fechaDesde: '', fechaHasta: '' };

  detalleVisible = signal(false);
  detalleData = signal<any>(null);

  ngOnInit() {
    this.http.get<any>(`${this.api}/stats`).subscribe(s => this.stats.set(s));
    this.cargar();
  }

  cargar() {
    this.loading.set(true);
    const params: any = { limit: 100, offset: this.offset() };
    if (this.filtros.buscar) params.buscar = this.filtros.buscar;
    if (this.filtros.fechaDesde) params.fechaDesde = this.filtros.fechaDesde;
    if (this.filtros.fechaHasta) params.fechaHasta = this.filtros.fechaHasta;

    this.http.get<any>(`${this.api}/ordenes`, { params }).subscribe({
      next: (r) => { this.ordenes.set(r.datos || []); this.total.set(r.total || 0); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  verDetalle(rowid: number) {
    this.http.get<any>(`${this.api}/ordenes/${rowid}`).subscribe(d => {
      this.detalleData.set(d);
      this.detalleVisible.set(true);
    });
  }

  paginar(dir: number) {
    this.offset.set(Math.max(0, this.offset() + dir * 100));
    this.cargar();
  }
}
