import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid py-4 px-4">
      <!-- Header -->
      <div class="page-header mb-4">
        <div class="row align-items-center">
          <div class="col">
            <h2 class="mb-1"><i class="bi bi-box-seam me-2 text-danger"></i>Inventario / Stock</h2>
            <p class="text-muted mb-0">Existencias actuales por bodega y producto</p>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="row g-3 mb-4" *ngIf="statsData()">
        <div class="col-6 col-lg-2" *ngFor="let s of statCards()">
          <div class="stat-card" [style.border-left-color]="s.color">
            <span class="stat-value">{{ formatNum(s.value) }}</span>
            <span class="stat-label">{{ s.label }}</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-body py-3">
          <div class="row g-2 align-items-end">
            <div class="col-md-3">
              <label class="form-label small fw-semibold">Buscar producto</label>
              <input type="text" class="form-control form-control-sm" placeholder="Referencia o descripción..."
                     [(ngModel)]="filtros.buscar" (keyup.enter)="cargar()">
            </div>
            <div class="col-md-2">
              <label class="form-label small fw-semibold">Bodega</label>
              <select class="form-select form-select-sm" [(ngModel)]="filtros.bodega">
                <option value="">Todas</option>
                <option *ngFor="let b of bodegas()" [value]="b.id">{{ b.id }} - {{ b.descripcion }}</option>
              </select>
            </div>
            <div class="col-auto">
              <div class="form-check mt-4">
                <input type="checkbox" class="form-check-input" id="chkConStock" [(ngModel)]="filtros.soloConStock">
                <label class="form-check-label small" for="chkConStock">Solo con stock</label>
              </div>
            </div>
            <div class="col-auto">
              <div class="form-check mt-4">
                <input type="checkbox" class="form-check-input" id="chkBajoMin" [(ngModel)]="filtros.bajosMinimo">
                <label class="form-check-label small" for="chkBajoMin">Bajo mínimo</label>
              </div>
            </div>
            <div class="col-auto">
              <button class="btn btn-sm btn-primary" (click)="cargar()">
                <i class="bi bi-search me-1"></i>Buscar
              </button>
              <button class="btn btn-sm btn-outline-secondary ms-1" (click)="limpiarFiltros()">
                <i class="bi bi-x-lg me-1"></i>Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="card border-0 shadow-sm">
        <div class="card-body p-0">
          <div *ngIf="loading()" class="text-center py-5">
            <div class="spinner-border text-primary"></div>
          </div>
          <div *ngIf="!loading() && datos().length === 0" class="text-center py-5 text-muted">
            <i class="bi bi-inbox display-4"></i>
            <p class="mt-2">No se encontraron registros</p>
          </div>
          <div class="table-responsive" *ngIf="!loading() && datos().length > 0">
            <table class="table table-hover table-sm mb-0">
              <thead class="table-light">
                <tr>
                  <th>Referencia</th>
                  <th>Producto</th>
                  <th>Bodega</th>
                  <th class="text-end">Existencia</th>
                  <th class="text-end">Costo Uni.</th>
                  <th class="text-end">Valor Total</th>
                  <th class="text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of datos()">
                  <td><code class="text-primary">{{ row.referencia }}</code></td>
                  <td>{{ row.producto }}</td>
                  <td><span class="badge bg-secondary bg-opacity-10 text-dark">{{ row.bodega_id }} - {{ row.bodega }}</span></td>
                  <td class="text-end fw-semibold" [class.text-danger]="row.existencia <= 0">{{ formatNum(row.existencia) }}</td>
                  <td class="text-end">{{ formatMoney(row.costo_unitario) }}</td>
                  <td class="text-end fw-semibold">{{ formatMoney(row.valor_total) }}</td>
                  <td class="text-center">
                    <span class="badge rounded-pill"
                          [class.bg-success]="row.existencia > 0"
                          [class.bg-danger]="row.existencia <= 0">
                      {{ row.existencia > 0 ? 'En stock' : 'Agotado' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <!-- Pagination -->
        <div class="card-footer bg-white border-top d-flex justify-content-between align-items-center" *ngIf="total() > 0">
          <small class="text-muted">Mostrando {{ datos().length }} de {{ formatNum(total()) }} registros</small>
          <div>
            <button class="btn btn-sm btn-outline-primary me-1" [disabled]="offset() === 0" (click)="paginar(-1)">
              <i class="bi bi-chevron-left"></i> Anterior
            </button>
            <button class="btn btn-sm btn-outline-primary" [disabled]="offset() + 100 >= total()" (click)="paginar(1)">
              Siguiente <i class="bi bi-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-header h2 { font-size: 1.5rem; font-weight: 700; }
    .stat-card {
      background: #fff;
      border-radius: 10px;
      padding: 16px;
      border-left: 4px solid;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .stat-value { display: block; font-size: 1.3rem; font-weight: 700; color: #212529; }
    .stat-label { font-size: 0.75rem; color: #6c757d; }
    th { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.03em; }
    td { font-size: 0.85rem; vertical-align: middle; }
  `]
})
export class InventarioComponent implements OnInit {
  private http = inject(HttpClient);
  private api = 'http://localhost:3000/api/inventario';

  loading = signal(false);
  datos = signal<any[]>([]);
  total = signal(0);
  offset = signal(0);
  statsData = signal<any>(null);
  bodegas = signal<any[]>([]);

  filtros = { buscar: '', bodega: '', soloConStock: false, bajosMinimo: false };

  statCards = computed(() => {
    const s = this.statsData();
    if (!s) return [];
    return [
      { label: 'Productos', value: s.total_productos, color: '#e94560' },
      { label: 'Bodegas', value: s.total_bodegas, color: '#0d6efd' },
      { label: 'Unidades', value: s.total_unidades, color: '#198754' },
      { label: 'Valor Inventario', value: s.valor_inventario, color: '#6f42c1' },
      { label: 'Sin Stock', value: s.sin_stock, color: '#dc3545' },
      { label: 'Bajo Mínimo', value: s.bajo_minimo, color: '#fd7e14' },
    ];
  });

  ngOnInit() {
    this.http.get<any>(`${this.api}/stats`).subscribe(s => this.statsData.set(s));
    this.http.get<any[]>(`${this.api}/bodegas`).subscribe(b => this.bodegas.set(b));
    this.cargar();
  }

  cargar() {
    this.loading.set(true);
    const params: any = { limit: 100, offset: this.offset() };
    if (this.filtros.buscar) params.buscar = this.filtros.buscar;
    if (this.filtros.bodega) params.bodega = this.filtros.bodega;
    if (this.filtros.soloConStock) params.soloConStock = 'true';
    if (this.filtros.bajosMinimo) params.bajosMinimo = 'true';

    this.http.get<any>(`${this.api}/stock`, { params }).subscribe({
      next: (res) => {
        this.datos.set(res.datos || []);
        this.total.set(res.total || 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  paginar(dir: number) {
    this.offset.set(Math.max(0, this.offset() + dir * 100));
    this.cargar();
  }

  limpiarFiltros() {
    this.filtros = { buscar: '', bodega: '', soloConStock: false, bajosMinimo: false };
    this.offset.set(0);
    this.cargar();
  }

  formatNum(n: number): string {
    return n != null ? n.toLocaleString('es-CO') : '0';
  }

  formatMoney(n: number): string {
    return n != null ? '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '$0';
  }
}
