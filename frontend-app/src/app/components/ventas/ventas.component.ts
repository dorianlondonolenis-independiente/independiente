import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid py-4 px-4">
      <div class="page-header mb-4">
        <h2><i class="bi bi-cart-check me-2 text-success"></i>Ventas</h2>
        <p class="text-muted mb-0">Pedidos de venta y facturación</p>
      </div>

      <!-- Stats -->
      <div class="row g-3 mb-4" *ngIf="stats()">
        <div class="col-6 col-lg-3">
          <div class="stat-card" style="border-left-color:#198754">
            <span class="stat-value">{{ stats().total_pedidos | number }}</span>
            <span class="stat-label">Pedidos</span>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="stat-card" style="border-left-color:#0d6efd">
            <span class="stat-value">{{ stats().total_facturas | number }}</span>
            <span class="stat-label">Facturas</span>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="stat-card" style="border-left-color:#6f42c1">
            <span class="stat-value">\${{ stats().valor_pedidos | number:'1.0-0' }}</span>
            <span class="stat-label">Valor Pedidos</span>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="stat-card" style="border-left-color:#e94560">
            <span class="stat-value">\${{ stats().valor_facturas | number:'1.0-0' }}</span>
            <span class="stat-label">Valor Facturas</span>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <ul class="nav nav-tabs mb-3">
        <li class="nav-item">
          <a class="nav-link" [class.active]="tab() === 'pedidos'" (click)="tab.set('pedidos')" role="button">
            <i class="bi bi-bag me-1"></i>Pedidos
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" [class.active]="tab() === 'facturas'" (click)="tab.set('facturas'); cargarFacturas()" role="button">
            <i class="bi bi-receipt me-1"></i>Facturas
          </a>
        </li>
      </ul>

      <!-- Pedidos -->
      <div *ngIf="tab() === 'pedidos'">
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-body py-3">
            <div class="row g-2 align-items-end">
              <div class="col-md-3">
                <input type="text" class="form-control form-control-sm" placeholder="Buscar nit o razón social..."
                       [(ngModel)]="filtrosPedidos.buscar" (keyup.enter)="cargarPedidos()">
              </div>
              <div class="col-md-2">
                <input type="date" class="form-control form-control-sm" [(ngModel)]="filtrosPedidos.fechaDesde">
              </div>
              <div class="col-md-2">
                <input type="date" class="form-control form-control-sm" [(ngModel)]="filtrosPedidos.fechaHasta">
              </div>
              <div class="col-auto">
                <button class="btn btn-sm btn-primary" (click)="cargarPedidos()"><i class="bi bi-search"></i></button>
              </div>
            </div>
          </div>
        </div>

        <div class="card border-0 shadow-sm">
          <div class="card-body p-0">
            <div *ngIf="loadingPedidos()" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
            <div class="table-responsive" *ngIf="!loadingPedidos() && pedidos().length > 0">
              <table class="table table-hover table-sm mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Tipo Doc</th>
                    <th>Consecutivo</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th class="text-end">Valor Bruto</th>
                    <th class="text-end">Valor Neto</th>
                    <th class="text-center">Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let p of pedidos()">
                    <td><code>{{ p.tipo_docto }}</code></td>
                    <td class="fw-semibold">{{ p.consecutivo }}</td>
                    <td>{{ p.fecha | date:'dd/MM/yyyy' }}</td>
                    <td>{{ p.cliente }}</td>
                    <td class="text-end">\${{ p.valor_bruto | number:'1.0-0' }}</td>
                    <td class="text-end fw-semibold">\${{ p.valor_neto | number:'1.0-0' }}</td>
                    <td class="text-center">
                      <span class="badge rounded-pill" [class.bg-success]="p.estado === 1" [class.bg-warning]="p.estado !== 1">
                        {{ p.estado === 1 ? 'Aprobado' : 'Pendiente' }}
                      </span>
                    </td>
                    <td>
                      <button class="btn btn-sm btn-outline-primary py-0" (click)="verDetallePedido(p.rowid)">
                        <i class="bi bi-eye"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div *ngIf="!loadingPedidos() && pedidos().length === 0" class="text-center py-5 text-muted">
              <i class="bi bi-inbox display-4"></i><p class="mt-2">Sin pedidos</p>
            </div>
          </div>
          <div class="card-footer bg-white d-flex justify-content-between" *ngIf="totalPedidos() > 0">
            <small class="text-muted">{{ pedidos().length }} de {{ totalPedidos() }}</small>
            <div>
              <button class="btn btn-sm btn-outline-primary me-1" [disabled]="offsetPedidos() === 0" (click)="paginarPedidos(-1)">Anterior</button>
              <button class="btn btn-sm btn-outline-primary" [disabled]="offsetPedidos() + 100 >= totalPedidos()" (click)="paginarPedidos(1)">Siguiente</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Facturas -->
      <div *ngIf="tab() === 'facturas'">
        <div class="card border-0 shadow-sm">
          <div class="card-body p-0">
            <div *ngIf="loadingFacturas()" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
            <div class="table-responsive" *ngIf="!loadingFacturas() && facturas().length > 0">
              <table class="table table-hover table-sm mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Tipo Doc</th>
                    <th>Consecutivo</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th class="text-end">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let f of facturas()">
                    <td><code>{{ f.tipo_docto }}</code></td>
                    <td class="fw-semibold">{{ f.consecutivo }}</td>
                    <td>{{ f.fecha | date:'dd/MM/yyyy' }}</td>
                    <td>{{ f.cliente }}</td>
                    <td class="text-end fw-semibold">\${{ f.valor | number:'1.0-0' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div *ngIf="!loadingFacturas() && facturas().length === 0" class="text-center py-5 text-muted">
              <i class="bi bi-inbox display-4"></i><p class="mt-2">Sin facturas</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal detalle pedido -->
      <div class="modal fade" [class.show]="detalleVisible()" [style.display]="detalleVisible() ? 'block' : 'none'" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Detalle del Pedido</h5>
              <button type="button" class="btn-close" (click)="detalleVisible.set(false)"></button>
            </div>
            <div class="modal-body">
              <div *ngIf="detalleData()">
                <div class="row mb-3">
                  <div class="col-md-4"><strong>Documento:</strong> {{ detalleData().documento?.tipo_docto }} - {{ detalleData().documento?.consecutivo }}</div>
                  <div class="col-md-4"><strong>Fecha:</strong> {{ detalleData().documento?.fecha | date:'dd/MM/yyyy' }}</div>
                  <div class="col-md-4"><strong>Cliente:</strong> {{ detalleData().documento?.cliente }}</div>
                </div>
                <table class="table table-sm" *ngIf="detalleData().lineas?.length > 0">
                  <thead class="table-light">
                    <tr>
                      <th>Referencia</th>
                      <th>Producto</th>
                      <th>Bodega</th>
                      <th class="text-end">Cantidad</th>
                      <th class="text-end">Precio</th>
                      <th class="text-end">Total</th>
                    </tr>
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
      </div>
      <div class="modal-backdrop fade show" *ngIf="detalleVisible()" (click)="detalleVisible.set(false)"></div>
    </div>
  `,
  styles: [`
    .page-header h2 { font-size: 1.5rem; font-weight: 700; }
    .stat-card { background:#fff; border-radius:10px; padding:16px; border-left:4px solid; box-shadow:0 1px 3px rgba(0,0,0,0.06); }
    .stat-value { display:block; font-size:1.3rem; font-weight:700; color:#212529; }
    .stat-label { font-size:0.75rem; color:#6c757d; }
    th { font-size:0.8rem; text-transform:uppercase; }
    td { font-size:0.85rem; vertical-align:middle; }
    .nav-link { cursor:pointer; }
  `]
})
export class VentasComponent implements OnInit {
  private http = inject(HttpClient);
  private api = 'http://localhost:3000/api/ventas';

  tab = signal<'pedidos' | 'facturas'>('pedidos');
  stats = signal<any>(null);

  // Pedidos
  loadingPedidos = signal(false);
  pedidos = signal<any[]>([]);
  totalPedidos = signal(0);
  offsetPedidos = signal(0);
  filtrosPedidos = { buscar: '', fechaDesde: '', fechaHasta: '' };

  // Facturas
  loadingFacturas = signal(false);
  facturas = signal<any[]>([]);

  // Detalle
  detalleVisible = signal(false);
  detalleData = signal<any>(null);

  ngOnInit() {
    this.http.get<any>(`${this.api}/stats`).subscribe(s => this.stats.set(s));
    this.cargarPedidos();
  }

  cargarPedidos() {
    this.loadingPedidos.set(true);
    const params: any = { limit: 100, offset: this.offsetPedidos() };
    if (this.filtrosPedidos.buscar) params.buscar = this.filtrosPedidos.buscar;
    if (this.filtrosPedidos.fechaDesde) params.fechaDesde = this.filtrosPedidos.fechaDesde;
    if (this.filtrosPedidos.fechaHasta) params.fechaHasta = this.filtrosPedidos.fechaHasta;

    this.http.get<any>(`${this.api}/pedidos`, { params }).subscribe({
      next: (r) => { this.pedidos.set(r.datos || []); this.totalPedidos.set(r.total || 0); this.loadingPedidos.set(false); },
      error: () => this.loadingPedidos.set(false),
    });
  }

  cargarFacturas() {
    this.loadingFacturas.set(true);
    this.http.get<any>(`${this.api}/facturas`, { params: { limit: 100 } }).subscribe({
      next: (r) => { this.facturas.set(r.datos || []); this.loadingFacturas.set(false); },
      error: () => this.loadingFacturas.set(false),
    });
  }

  verDetallePedido(rowid: number) {
    this.http.get<any>(`${this.api}/pedidos/${rowid}`).subscribe(d => {
      this.detalleData.set(d);
      this.detalleVisible.set(true);
    });
  }

  paginarPedidos(dir: number) {
    this.offsetPedidos.set(Math.max(0, this.offsetPedidos() + dir * 100));
    this.cargarPedidos();
  }
}
