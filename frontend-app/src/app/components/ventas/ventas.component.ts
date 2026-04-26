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
        <li class="nav-item">
          <a class="nav-link" [class.active]="tab() === 'remisiones'" (click)="tab.set('remisiones'); cargarRemisiones()" role="button">
            <i class="bi bi-truck me-1"></i>Remisiones
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" [class.active]="tab() === 'devoluciones'" (click)="tab.set('devoluciones'); cargarDevoluciones()" role="button">
            <i class="bi bi-arrow-return-left me-1"></i>Devoluciones
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
                    <th>Sucursal</th>
                    <th>Motivo</th>
                    <th>Descripción Motivo</th>
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
                    <td>{{ p.sucursal || '-' }}</td>
                    <td>{{ p.motivo || '-' }}</td>
                    <td>{{ p.motivo_descripcion || '-' }}</td>
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
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-body py-3">
            <div class="row g-2 align-items-end">
              <div class="col-md-4">
                <input type="text" class="form-control form-control-sm" placeholder="Buscar nit o razón social..."
                       [(ngModel)]="filtrosFacturas.buscar" (keyup.enter)="cargarFacturas()">
              </div>
              <div class="col-auto">
                <button class="btn btn-sm btn-primary" (click)="cargarFacturas()"><i class="bi bi-search"></i></button>
              </div>
            </div>
          </div>
        </div>

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
                    <th>Sucursal</th>
                    <th>Motivo</th>
                    <th>Descripción Motivo</th>
                    <th class="text-end">Valor</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let f of facturas()">
                    <td><code>{{ f.tipo_docto }}</code></td>
                    <td class="fw-semibold">{{ f.consecutivo }}</td>
                    <td>{{ f.fecha | date:'dd/MM/yyyy' }}</td>
                    <td>{{ f.cliente }}</td>
                    <td>{{ f.sucursal || '-' }}</td>
                    <td>{{ f.motivo || '-' }}</td>
                    <td>{{ f.motivo_descripcion || '-' }}</td>
                    <td class="text-end fw-semibold">\${{ f.valor | number:'1.0-0' }}</td>
                    <td>
                      <button class="btn btn-sm btn-outline-primary py-0" (click)="verDetalleFactura(f.rowid)">
                        <i class="bi bi-eye"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div *ngIf="!loadingFacturas() && facturas().length === 0" class="text-center py-5 text-muted">
              <i class="bi bi-inbox display-4"></i><p class="mt-2">Sin facturas</p>
            </div>
          </div>
          <div class="card-footer bg-white d-flex justify-content-between" *ngIf="totalFacturas() > 0">
            <small class="text-muted">{{ facturas().length }} de {{ totalFacturas() }}</small>
            <div>
              <button class="btn btn-sm btn-outline-primary me-1" [disabled]="offsetFacturas() === 0" (click)="paginarFacturas(-1)">Anterior</button>
              <button class="btn btn-sm btn-outline-primary" [disabled]="offsetFacturas() + 100 >= totalFacturas()" (click)="paginarFacturas(1)">Siguiente</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Remisiones -->
      <div *ngIf="tab() === 'remisiones'">
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-body py-3">
            <div class="row g-2 align-items-end">
              <div class="col-md-3">
                <input type="text" class="form-control form-control-sm" placeholder="Buscar nit o raz&oacute;n social..."
                       [(ngModel)]="filtrosRemisiones.buscar" (keyup.enter)="cargarRemisiones()">
              </div>
              <div class="col-md-2">
                <input type="date" class="form-control form-control-sm" [(ngModel)]="filtrosRemisiones.fechaDesde">
              </div>
              <div class="col-md-2">
                <input type="date" class="form-control form-control-sm" [(ngModel)]="filtrosRemisiones.fechaHasta">
              </div>
              <div class="col-auto">
                <button class="btn btn-sm btn-primary" (click)="cargarRemisiones()"><i class="bi bi-search"></i></button>
              </div>
            </div>
          </div>
        </div>
        <div class="card border-0 shadow-sm">
          <div class="card-body p-0">
            <div *ngIf="loadingRemisiones()" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
            <div class="table-responsive" *ngIf="!loadingRemisiones() && remisiones().length > 0">
              <table class="table table-hover table-sm mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Tipo Doc</th>
                    <th>Consecutivo</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Sucursal</th>
                    <th class="text-center">Estado</th>
                    <th class="text-end">Valor Bruto</th>
                    <th class="text-end">Valor Neto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let r of remisiones()">
                    <td><code>{{ r.tipo_docto }}</code></td>
                    <td class="fw-semibold">{{ r.consecutivo }}</td>
                    <td>{{ r.fecha | date:'dd/MM/yyyy' }}</td>
                    <td>{{ r.cliente }}</td>
                    <td>{{ r.sucursal || '-' }}</td>
                    <td class="text-center">
                      <span class="badge rounded-pill" [class.bg-success]="r.estado === 1" [class.bg-warning]="r.estado !== 1">
                        {{ r.estado === 1 ? 'Facturado' : 'Pendiente' }}
                      </span>
                    </td>
                    <td class="text-end">\${{ r.valor_bruto | number:'1.0-0' }}</td>
                    <td class="text-end fw-semibold">\${{ r.valor_neto | number:'1.0-0' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div *ngIf="!loadingRemisiones() && remisiones().length === 0" class="text-center py-5 text-muted">
              <i class="bi bi-inbox display-4"></i><p class="mt-2">Sin remisiones</p>
            </div>
          </div>
          <div class="card-footer bg-white d-flex justify-content-between" *ngIf="totalRemisiones() > 0">
            <small class="text-muted">{{ remisiones().length }} de {{ totalRemisiones() }}</small>
            <div>
              <button class="btn btn-sm btn-outline-primary me-1" [disabled]="offsetRemisiones() === 0" (click)="paginarRemisiones(-1)">Anterior</button>
              <button class="btn btn-sm btn-outline-primary" [disabled]="offsetRemisiones() + 100 >= totalRemisiones()" (click)="paginarRemisiones(1)">Siguiente</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Devoluciones -->
      <div *ngIf="tab() === 'devoluciones'">
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-body py-3">
            <div class="row g-2 align-items-end">
              <div class="col-md-3">
                <input type="text" class="form-control form-control-sm" placeholder="Buscar nit o raz&oacute;n social..."
                       [(ngModel)]="filtrosDevoluciones.buscar" (keyup.enter)="cargarDevoluciones()">
              </div>
              <div class="col-md-2">
                <input type="date" class="form-control form-control-sm" [(ngModel)]="filtrosDevoluciones.fechaDesde">
              </div>
              <div class="col-md-2">
                <input type="date" class="form-control form-control-sm" [(ngModel)]="filtrosDevoluciones.fechaHasta">
              </div>
              <div class="col-auto">
                <button class="btn btn-sm btn-primary" (click)="cargarDevoluciones()"><i class="bi bi-search"></i></button>
              </div>
            </div>
          </div>
        </div>
        <div class="card border-0 shadow-sm">
          <div class="card-body p-0">
            <div *ngIf="loadingDevoluciones()" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
            <div class="table-responsive" *ngIf="!loadingDevoluciones() && devoluciones().length > 0">
              <table class="table table-hover table-sm mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Tipo Doc</th>
                    <th>Consecutivo</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Sucursal</th>
                    <th class="text-center">Estado</th>
                    <th class="text-end">Valor Bruto</th>
                    <th class="text-end">Valor Neto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let d of devoluciones()">
                    <td><code>{{ d.tipo_docto }}</code></td>
                    <td class="fw-semibold">{{ d.consecutivo }}</td>
                    <td>{{ d.fecha | date:'dd/MM/yyyy' }}</td>
                    <td>{{ d.cliente }}</td>
                    <td>{{ d.sucursal || '-' }}</td>
                    <td class="text-center">
                      <span class="badge rounded-pill" [class.bg-danger]="d.estado === 1" [class.bg-secondary]="d.estado !== 1">
                        {{ d.estado === 1 ? 'Aplicada' : 'Pendiente' }}
                      </span>
                    </td>
                    <td class="text-end">\${{ d.valor_bruto | number:'1.0-0' }}</td>
                    <td class="text-end fw-semibold">\${{ d.valor_neto | number:'1.0-0' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div *ngIf="!loadingDevoluciones() && devoluciones().length === 0" class="text-center py-5 text-muted">
              <i class="bi bi-inbox display-4"></i><p class="mt-2">Sin devoluciones</p>
            </div>
          </div>
          <div class="card-footer bg-white d-flex justify-content-between" *ngIf="totalDevoluciones() > 0">
            <small class="text-muted">{{ devoluciones().length }} de {{ totalDevoluciones() }}</small>
            <div>
              <button class="btn btn-sm btn-outline-primary me-1" [disabled]="offsetDevoluciones() === 0" (click)="paginarDevoluciones(-1)">Anterior</button>
              <button class="btn btn-sm btn-outline-primary" [disabled]="offsetDevoluciones() + 100 >= totalDevoluciones()" (click)="paginarDevoluciones(1)">Siguiente</button>
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

      <!-- Modal detalle factura -->
      <div class="modal fade" [class.show]="detalleFacturaVisible()" [style.display]="detalleFacturaVisible() ? 'block' : 'none'" tabindex="-1">
        <div class="modal-dialog modal-xl">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title"><i class="bi bi-receipt me-2 text-primary"></i>Detalle de Factura</h5>
              <button type="button" class="btn-close" (click)="detalleFacturaVisible.set(false)"></button>
            </div>
            <div class="modal-body">
              <div *ngIf="detalleFacturaData()">
                <div class="row mb-3 g-2">
                  <div class="col-md-3"><strong>Documento:</strong> {{ detalleFacturaData().documento?.tipo_docto }} - {{ detalleFacturaData().documento?.consecutivo }}</div>
                  <div class="col-md-2"><strong>Fecha:</strong> {{ detalleFacturaData().documento?.fecha | date:'dd/MM/yyyy' }}</div>
                  <div class="col-md-4"><strong>Cliente:</strong> {{ detalleFacturaData().documento?.cliente }}</div>
                  <div class="col-md-2"><strong>NIT:</strong> {{ detalleFacturaData().documento?.nit }}</div>
                  <div class="col-md-1"><strong>Sucursal:</strong> {{ detalleFacturaData().documento?.sucursal || '-' }}</div>
                  <div class="col-md-2"><strong>Motivo:</strong> {{ detalleFacturaData().documento?.motivo || '-' }}</div>
                  <div class="col-md-4"><strong>Desc. Motivo:</strong> {{ detalleFacturaData().documento?.motivo_descripcion || '-' }}</div>
                  <div class="col-md-2 text-end"><strong>Bruto:</strong> \${{ detalleFacturaData().documento?.valor_bruto | number:'1.0-0' }}</div>
                  <div class="col-md-2 text-end"><strong>Neto:</strong> \${{ detalleFacturaData().documento?.valor_neto | number:'1.0-0' }}</div>
                </div>
                <div *ngIf="detalleFacturaData().lineas?.length > 0">
                  <table class="table table-sm table-hover">
                    <thead class="table-light">
                      <tr>
                        <th>Referencia</th>
                        <th>Producto</th>
                        <th>Bodega</th>
                        <th>Unidad</th>
                        <th class="text-end">Cantidad</th>
                        <th class="text-end">Precio</th>
                        <th class="text-end">Bruto</th>
                        <th class="text-end">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let l of detalleFacturaData().lineas">
                        <td><code>{{ l.referencia }}</code></td>
                        <td>{{ l.producto }}</td>
                        <td>{{ l.bodega }}</td>
                        <td>{{ l.unidad }}</td>
                        <td class="text-end">{{ l.cantidad }}</td>
                        <td class="text-end">\${{ l.precio | number:'1.0-0' }}</td>
                        <td class="text-end">\${{ l.valor_bruto | number:'1.0-0' }}</td>
                        <td class="text-end fw-semibold">\${{ l.valor_total | number:'1.0-0' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div *ngIf="!detalleFacturaData().lineas?.length" class="text-center py-3 text-muted">
                  <i class="bi bi-info-circle me-1"></i>Esta factura no tiene líneas vinculadas a un pedido
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show" *ngIf="detalleFacturaVisible()" (click)="detalleFacturaVisible.set(false)"></div>
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

  tab = signal<'pedidos' | 'facturas' | 'remisiones' | 'devoluciones'>('pedidos');
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
  totalFacturas = signal(0);
  offsetFacturas = signal(0);
  filtrosFacturas = { buscar: '' };

  // Remisiones
  loadingRemisiones = signal(false);
  remisiones = signal<any[]>([]);
  totalRemisiones = signal(0);
  offsetRemisiones = signal(0);
  filtrosRemisiones = { buscar: '', fechaDesde: '', fechaHasta: '' };

  // Devoluciones
  loadingDevoluciones = signal(false);
  devoluciones = signal<any[]>([]);
  totalDevoluciones = signal(0);
  offsetDevoluciones = signal(0);
  filtrosDevoluciones = { buscar: '', fechaDesde: '', fechaHasta: '' };

  // Detalle pedido
  detalleVisible = signal(false);
  detalleData = signal<any>(null);

  // Detalle factura
  detalleFacturaVisible = signal(false);
  detalleFacturaData = signal<any>(null);

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
    const params: any = { limit: 100, offset: this.offsetFacturas() };
    if (this.filtrosFacturas.buscar) params.buscar = this.filtrosFacturas.buscar;

    this.http.get<any>(`${this.api}/facturas`, { params }).subscribe({
      next: (r) => { this.facturas.set(r.datos || []); this.totalFacturas.set(r.total || 0); this.loadingFacturas.set(false); },
      error: () => this.loadingFacturas.set(false),
    });
  }

  paginarFacturas(dir: number) {
    this.offsetFacturas.set(Math.max(0, this.offsetFacturas() + dir * 100));
    this.cargarFacturas();
  }

  verDetallePedido(rowid: number) {
    this.http.get<any>(`${this.api}/pedidos/${rowid}`).subscribe(d => {
      this.detalleData.set(d);
      this.detalleVisible.set(true);
    });
  }

  verDetalleFactura(rowid: number) {
    this.http.get<any>(`${this.api}/facturas/${rowid}`).subscribe(d => {
      this.detalleFacturaData.set(d);
      this.detalleFacturaVisible.set(true);
    });
  }

  paginarPedidos(dir: number) {
    this.offsetPedidos.set(Math.max(0, this.offsetPedidos() + dir * 100));
    this.cargarPedidos();
  }

  cargarRemisiones() {
    this.loadingRemisiones.set(true);
    const params: any = { limit: 100, offset: this.offsetRemisiones() };
    if (this.filtrosRemisiones.buscar) params.buscar = this.filtrosRemisiones.buscar;
    if (this.filtrosRemisiones.fechaDesde) params.fechaDesde = this.filtrosRemisiones.fechaDesde;
    if (this.filtrosRemisiones.fechaHasta) params.fechaHasta = this.filtrosRemisiones.fechaHasta;
    this.http.get<any>(`${this.api}/remisiones`, { params }).subscribe({
      next: (r) => { this.remisiones.set(r.datos || []); this.totalRemisiones.set(r.total || 0); this.loadingRemisiones.set(false); },
      error: () => this.loadingRemisiones.set(false),
    });
  }

  paginarRemisiones(dir: number) {
    this.offsetRemisiones.set(Math.max(0, this.offsetRemisiones() + dir * 100));
    this.cargarRemisiones();
  }

  cargarDevoluciones() {
    this.loadingDevoluciones.set(true);
    const params: any = { limit: 100, offset: this.offsetDevoluciones() };
    if (this.filtrosDevoluciones.buscar) params.buscar = this.filtrosDevoluciones.buscar;
    if (this.filtrosDevoluciones.fechaDesde) params.fechaDesde = this.filtrosDevoluciones.fechaDesde;
    if (this.filtrosDevoluciones.fechaHasta) params.fechaHasta = this.filtrosDevoluciones.fechaHasta;
    this.http.get<any>(`${this.api}/devoluciones`, { params }).subscribe({
      next: (r) => { this.devoluciones.set(r.datos || []); this.totalDevoluciones.set(r.total || 0); this.loadingDevoluciones.set(false); },
      error: () => this.loadingDevoluciones.set(false),
    });
  }

  paginarDevoluciones(dir: number) {
    this.offsetDevoluciones.set(Math.max(0, this.offsetDevoluciones() + dir * 100));
    this.cargarDevoluciones();
  }
}
