import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-detalle-remision',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid py-4 px-4">
      <!-- Header -->
      <div class="d-flex align-items-center gap-3 mb-4 flex-wrap">
        <button class="btn btn-outline-secondary" (click)="volver()">
          <i class="bi bi-arrow-left me-1"></i>Volver
        </button>
        <div class="flex-grow-1">
          <h3 class="mb-0"><i class="bi bi-truck me-2 text-info"></i>Detalle de Remisión</h3>
          <small class="text-muted" *ngIf="data()">
            {{ data().documento?.tipo_docto }} - {{ data().documento?.consecutivo }} |
            {{ data().documento?.fecha | date:'dd/MM/yyyy' }}
          </small>
        </div>
        <button class="btn btn-outline-success" (click)="exportarCsv()"
                *ngIf="lineasFiltradas().length > 0" [disabled]="exportando()">
          <span *ngIf="exportando()" class="spinner-border spinner-border-sm me-1"></span>
          <i *ngIf="!exportando()" class="bi bi-download me-1"></i>CSV
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="loading()" class="text-center py-5">
        <div class="spinner-border text-info"></div>
        <p class="text-muted mt-2">Cargando...</p>
      </div>

      <div *ngIf="!loading() && data()">
        <!-- Info documento -->
        <div class="card border-0 shadow-sm mb-4">
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-3">
                <div class="text-muted small">Cliente</div>
                <div class="fw-semibold">{{ data().documento?.cliente }}</div>
              </div>
              <div class="col-md-2">
                <div class="text-muted small">NIT</div>
                <div>{{ data().documento?.nit }}</div>
              </div>
              <div class="col-md-1">
                <div class="text-muted small">Sucursal</div>
                <div>{{ data().documento?.sucursal || '-' }}</div>
              </div>
              <div class="col-md-1 text-end">
                <div class="text-muted small">Valor Bruto</div>
                <div>\${{ data().documento?.valor_bruto | number:'1.0-0' }}</div>
              </div>
              <div class="col-md-1 text-end">
                <div class="text-muted small">Valor Neto</div>
                <div class="fw-bold text-info">\${{ data().documento?.valor_neto | number:'1.0-0' }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Líneas -->
        <div *ngIf="data().lineas?.length > 0" class="card border-0 shadow-sm">
          <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
            <span><i class="bi bi-grid-3x3 me-2"></i>{{ lineasFiltradas().length }} líneas</span>
            <div class="input-group" style="width:280px;">
              <span class="input-group-text bg-secondary border-0"><i class="bi bi-search text-white"></i></span>
              <input type="text" class="form-control form-control-sm" placeholder="Buscar en líneas..."
                     [(ngModel)]="buscar" (input)="pagina.set(0)">
              <button class="btn btn-outline-light btn-sm" *ngIf="buscar" (click)="buscar=''; pagina.set(0)">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
          <div class="table-responsive" style="max-height:60vh; overflow:auto;">
            <table class="table table-hover table-striped table-sm mb-0" style="min-width:max-content;">
              <thead class="table-dark" style="position:sticky;top:0;z-index:1;">
                <tr>
                  <th>Referencia</th>
                  <th>Producto</th>
                  <th>Bodega</th>
                  <th>Sucursal</th>
                  <th>Motivo</th>
                  <th>Desc. Motivo</th>
                  <th class="text-end">Cantidad</th>
                  <th class="text-end">Precio</th>
                  <th class="text-end">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let l of lineasPaginadas()">
                  <td><code>{{ l.referencia }}</code></td>
                  <td>{{ l.producto }}</td>
                  <td>{{ l.bodega }}</td>
                  <td>{{ l.sucursal || '-' }}</td>
                  <td>{{ l.motivo || '-' }}</td>
                  <td class="text-truncate" style="max-width:200px;" [title]="l.motivo_descripcion">{{ l.motivo_descripcion || '-' }}</td>
                  <td class="text-end">{{ l.cantidad }}</td>
                  <td class="text-end">\${{ l.precio | number:'1.0-0' }}</td>
                  <td class="text-end fw-semibold">\${{ l.valor_total | number:'1.0-0' }}</td>
                </tr>
                <tr *ngIf="lineasPaginadas().length === 0">
                  <td colspan="9" class="text-center text-muted py-3">Sin resultados</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="card-footer d-flex justify-content-between align-items-center" *ngIf="totalPaginas() > 1">
            <small class="text-muted">{{ inicio() + 1 }}-{{ fin() }} de {{ lineasFiltradas().length }}</small>
            <div>
              <button class="btn btn-sm btn-outline-primary me-1" [disabled]="pagina() === 0" (click)="pagina.set(pagina() - 1)">Anterior</button>
              <span class="text-muted small me-1">{{ pagina() + 1 }} / {{ totalPaginas() }}</span>
              <button class="btn btn-sm btn-outline-primary" [disabled]="pagina() >= totalPaginas() - 1" (click)="pagina.set(pagina() + 1)">Siguiente</button>
            </div>
          </div>
        </div>

        <div *ngIf="!data().lineas?.length" class="text-center py-5 text-muted">
          <i class="bi bi-info-circle display-4"></i>
          <p class="mt-2">Esta remisión no tiene líneas</p>
        </div>
      </div>
    </div>
  `
})
export class DetalleRemisionComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  data = signal<any>(null);
  loading = signal(false);
  exportando = signal(false);
  buscar = '';
  pagina = signal(0);
  readonly tamPagina = 50;

  lineasFiltradas = computed(() => {
    const lineas: any[] = this.data()?.lineas || [];
    const q = this.buscar.toLowerCase().trim();
    if (!q) return lineas;
    return lineas.filter(l =>
      Object.values(l).some(v => String(v ?? '').toLowerCase().includes(q))
    );
  });

  inicio = computed(() => this.pagina() * this.tamPagina);
  fin = computed(() => Math.min(this.inicio() + this.tamPagina, this.lineasFiltradas().length));
  totalPaginas = computed(() => Math.max(1, Math.ceil(this.lineasFiltradas().length / this.tamPagina)));
  lineasPaginadas = computed(() => this.lineasFiltradas().slice(this.inicio(), this.fin()));

  ngOnInit() {
    const rowid = this.route.snapshot.paramMap.get('rowid');
    if (rowid) {
      this.loading.set(true);
      this.http.get<any>(`http://localhost:3000/api/ventas/remisiones/${rowid}`).subscribe({
        next: (r) => { this.data.set(r); this.loading.set(false); },
        error: () => this.loading.set(false)
      });
    }
  }

  volver() {
    this.router.navigate(['/ventas'], { queryParams: { tab: 'remisiones' } });
  }

  exportarCsv() {
    this.exportando.set(true);
    const lineas = this.lineasFiltradas();
    const doc = this.data()?.documento;
    const headers = ['Referencia', 'Producto', 'Bodega', 'Sucursal', 'Motivo', 'Desc. Motivo', 'Cantidad', 'Precio', 'Total'];
    const rows = lineas.map(l => [l.referencia, l.producto, l.bodega, l.sucursal, l.motivo, l.motivo_descripcion, l.cantidad, l.precio, l.valor_total]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `remision_${doc?.consecutivo || 'detalle'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.exportando.set(false);
  }
}
