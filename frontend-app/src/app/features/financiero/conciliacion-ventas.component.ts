import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';

interface FilaArchivo {
  fila: number;
  nit: string;
  documento: string;
  tipo_docto?: string | null;
  fecha?: string | null;
  valor_neto?: number | null;
}

interface ResultadoConciliacion {
  totalArchivo: number;
  totalCoincidencias: number;
  totalNoEncontradas: number;
  totalDiscrepancias: number;
  noEncontradas: FilaArchivo[];
  discrepancias: Array<FilaArchivo & { valor_db: number; diferencia: number }>;
  coincidencias: Array<FilaArchivo & { rowid: number; cliente_db: string; valor_db: number }>;
}

@Component({
  selector: 'app-conciliacion-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container-fluid py-4" style="max-width: 1200px;">
      <div class="d-flex align-items-center mb-4 gap-3">
        <a routerLink="/dashboard" class="btn btn-outline-secondary">
          <i class="bi bi-arrow-left me-1"></i>Volver
        </a>
        <div>
          <h2 class="mb-0"><i class="bi bi-file-earmark-check me-2"></i>Conciliación Financiera</h2>
          <small class="text-muted">Validar archivo contra documentos contables (NIT + documento)</small>
        </div>
      </div>

      <div class="card shadow-sm mb-3">
        <div class="card-body">
          <label class="form-label fw-semibold">Tipo de conciliación</label>
          <div class="btn-group w-100" role="group">
            <input type="radio" class="btn-check" id="tipoVentas" [value]="'ventas'" [(ngModel)]="tipoModel" (ngModelChange)="onTipo($event)">
            <label class="btn btn-outline-primary" for="tipoVentas">
              <i class="bi bi-cash-coin me-1"></i>Ventas (facturas/remisiones que emitimos)
            </label>
            <input type="radio" class="btn-check" id="tipoCompras" [value]="'compras'" [(ngModel)]="tipoModel" (ngModelChange)="onTipo($event)">
            <label class="btn btn-outline-primary" for="tipoCompras">
              <i class="bi bi-receipt me-1"></i>Compras (facturas del proveedor causadas)
            </label>
          </div>
          <small class="text-muted d-block mt-2" *ngIf="tipo() === 'ventas'">
            Se compara contra <code>t461</code> (facturas) y <code>t460</code> (remisiones) por consecutivo interno. <strong>Rango: últimos 60 días.</strong>
          </small>
          <small class="text-muted d-block mt-2" *ngIf="tipo() === 'compras'">
            Se compara contra <code>t451_cm_docto_compras</code> por <code>f451_num_docto_referencia</code> (número de factura del proveedor). <strong>Rango: últimos 60 días.</strong>
          </small>
        </div>
      </div>

      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <div class="row g-3 align-items-end">
            <div class="col-md-7">
              <label class="form-label fw-semibold">Archivo (.xlsx, .xls o .csv)</label>
              <input type="file" class="form-control" accept=".xlsx,.xls,.csv" (change)="onFile($event)">
              <small class="text-muted">
                Columnas requeridas: <code>nit</code>, <code>documento</code>.
                Opcionales: <code>tipo_docto</code>, <code>fecha</code>, <code>valor_neto</code>.
              </small>
            </div>
            <div class="col-md-5 d-flex gap-2">
              <button class="btn btn-outline-primary" (click)="descargarPlantilla()">
                <i class="bi bi-download me-1"></i>Descargar plantilla
              </button>
              <button class="btn btn-primary" [disabled]="!file() || cargando()" (click)="validar()">
                <i class="bi bi-shield-check me-1"></i>
                {{ cargando() ? 'Validando...' : 'Validar' }}
              </button>
            </div>
          </div>
          <div *ngIf="error()" class="alert alert-danger mt-3 mb-0">{{ error() }}</div>
        </div>
      </div>

      <div *ngIf="resultado()" class="row g-3 mb-4">
        <div class="col-md-3">
          <div class="card border-secondary"><div class="card-body">
            <div class="text-muted small">Total filas</div>
            <div class="fs-3 fw-bold">{{ resultado()!.totalArchivo }}</div>
          </div></div>
        </div>
        <div class="col-md-3">
          <div class="card border-success"><div class="card-body">
            <div class="text-muted small">Coincidencias</div>
            <div class="fs-3 fw-bold text-success">{{ resultado()!.totalCoincidencias }}</div>
          </div></div>
        </div>
        <div class="col-md-3">
          <div class="card border-danger"><div class="card-body">
            <div class="text-muted small">No encontradas</div>
            <div class="fs-3 fw-bold text-danger">{{ resultado()!.totalNoEncontradas }}</div>
          </div></div>
        </div>
        <div class="col-md-3">
          <div class="card border-warning"><div class="card-body">
            <div class="text-muted small">Discrepancia valor</div>
            <div class="fs-3 fw-bold text-warning">{{ resultado()!.totalDiscrepancias }}</div>
          </div></div>
        </div>
      </div>

      <div *ngIf="resultado()" class="card shadow-sm mb-4">
        <div class="card-header bg-danger text-white d-flex justify-content-between align-items-center">
          <span><i class="bi bi-exclamation-triangle me-2"></i>No encontradas en BD ({{ resultado()!.noEncontradas.length }})</span>
          <button class="btn btn-sm btn-light" [disabled]="!resultado()!.noEncontradas.length" (click)="exportarNoEncontradas()">
            <i class="bi bi-download me-1"></i>Exportar CSV
          </button>
        </div>
        <div class="table-responsive" style="max-height:400px;">
          <table class="table table-sm table-striped mb-0">
            <thead class="table-dark" style="position:sticky;top:0;">
              <tr>
                <th>Fila</th><th>NIT</th><th>Documento</th><th>Tipo</th><th>Fecha</th><th class="text-end">Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of resultado()!.noEncontradas">
                <td>{{ r.fila }}</td>
                <td>{{ r.nit }}</td>
                <td><code>{{ r.documento }}</code></td>
                <td>{{ r.tipo_docto || '-' }}</td>
                <td>{{ r.fecha || '-' }}</td>
                <td class="text-end">{{ r.valor_neto != null ? ('$' + (r.valor_neto | number:'1.0-0')) : '-' }}</td>
              </tr>
              <tr *ngIf="!resultado()!.noEncontradas.length">
                <td colspan="6" class="text-center text-muted py-3">Todas las filas coinciden con la BD ✓</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div *ngIf="resultado() && resultado()!.discrepancias.length" class="card shadow-sm mb-4">
        <div class="card-header bg-warning"><i class="bi bi-currency-dollar me-2"></i>Discrepancias de valor</div>
        <div class="table-responsive" style="max-height:300px;">
          <table class="table table-sm table-striped mb-0">
            <thead class="table-dark" style="position:sticky;top:0;">
              <tr>
                <th>Fila</th><th>NIT</th><th>Documento</th>
                <th class="text-end">Valor archivo</th>
                <th class="text-end">Valor BD</th>
                <th class="text-end">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of resultado()!.discrepancias">
                <td>{{ r.fila }}</td>
                <td>{{ r.nit }}</td>
                <td><code>{{ r.documento }}</code></td>
                <td class="text-end">\${{ r.valor_neto | number:'1.0-0' }}</td>
                <td class="text-end">\${{ r.valor_db | number:'1.0-0' }}</td>
                <td class="text-end fw-bold" [class.text-danger]="r.diferencia > 0" [class.text-success]="r.diferencia < 0">
                  \${{ r.diferencia | number:'1.0-0' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class ConciliacionVentasComponent {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api';

  file = signal<File | null>(null);
  cargando = signal(false);
  error = signal<string | null>(null);
  resultado = signal<ResultadoConciliacion | null>(null);
  tipo = signal<'ventas' | 'compras'>('ventas');
  tipoModel: 'ventas' | 'compras' = 'ventas';

  onTipo(t: 'ventas' | 'compras') {
    this.tipo.set(t);
    this.resultado.set(null);
    this.error.set(null);
  }

  onFile(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0] || null;
    this.file.set(f);
    this.error.set(null);
    this.resultado.set(null);
  }

  validar() {
    const f = this.file();
    if (!f) return;
    this.cargando.set(true);
    this.error.set(null);
    const fd = new FormData();
    fd.append('file', f);
    const endpoint = this.tipo() === 'compras' ? 'conciliacion-compras' : 'conciliacion-ventas';
    this.http.post<ResultadoConciliacion>(`${this.apiUrl}/financiero/${endpoint}`, fd).subscribe({
      next: (r) => {
        this.resultado.set(r);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(e.error?.message || 'Error al procesar el archivo');
        this.cargando.set(false);
      },
    });
  }

  descargarPlantilla() {
    const endpoint = this.tipo() === 'compras' ? 'conciliacion-compras' : 'conciliacion-ventas';
    const filename = this.tipo() === 'compras' ? 'plantilla-conciliacion-compras.xlsx' : 'plantilla-conciliacion-ventas.xlsx';
    this.http
      .get(`${this.apiUrl}/financiero/${endpoint}/plantilla`, { responseType: 'blob' })
      .subscribe((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  exportarNoEncontradas() {
    const r = this.resultado();
    if (!r) return;
    const headers = ['Fila', 'NIT', 'Documento', 'Tipo', 'Fecha', 'Valor'];
    const rows = r.noEncontradas.map((n) => [
      n.fila, n.nit, n.documento, n.tipo_docto || '', n.fecha || '', n.valor_neto ?? '',
    ]);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'no-encontradas.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}
