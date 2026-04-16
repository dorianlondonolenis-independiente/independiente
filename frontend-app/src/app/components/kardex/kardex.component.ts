import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-kardex',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid py-4 px-4">
      <div class="page-header mb-4">
        <h2><i class="bi bi-arrow-left-right me-2 text-primary"></i>Kardex / Movimientos</h2>
        <p class="text-muted mb-0">Historial de movimientos de inventario por producto</p>
      </div>

      <!-- Resumen mensual -->
      <div class="card border-0 shadow-sm mb-4" *ngIf="resumen().length > 0">
        <div class="card-header bg-white fw-semibold"><i class="bi bi-bar-chart me-2"></i>Resumen Mensual</div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-sm mb-0">
              <thead class="table-light">
                <tr>
                  <th>Mes</th>
                  <th class="text-end text-success">Entradas</th>
                  <th class="text-end text-danger">Salidas</th>
                  <th class="text-end">Movimientos</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let r of resumen()">
                  <td class="fw-semibold">{{ r.mes }}</td>
                  <td class="text-end text-success">+{{ r.entradas | number:'1.0-0' }}</td>
                  <td class="text-end text-danger">-{{ r.salidas | number:'1.0-0' }}</td>
                  <td class="text-end">{{ r.movimientos | number }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-body py-3">
          <div class="row g-2 align-items-end">
            <div class="col-md-3">
              <label class="form-label small fw-semibold">Referencia / Producto</label>
              <input type="text" class="form-control form-control-sm" placeholder="Buscar producto..."
                     [(ngModel)]="filtros.referencia" (keyup.enter)="cargar()">
            </div>
            <div class="col-md-2">
              <label class="form-label small fw-semibold">Bodega</label>
              <input type="text" class="form-control form-control-sm" placeholder="ID bodega..."
                     [(ngModel)]="filtros.bodega">
            </div>
            <div class="col-md-2">
              <label class="form-label small fw-semibold">Desde</label>
              <input type="date" class="form-control form-control-sm" [(ngModel)]="filtros.fechaDesde">
            </div>
            <div class="col-md-2">
              <label class="form-label small fw-semibold">Hasta</label>
              <input type="date" class="form-control form-control-sm" [(ngModel)]="filtros.fechaHasta">
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
                  <th>Fecha</th>
                  <th>Tipo Doc</th>
                  <th>Consec.</th>
                  <th>Producto</th>
                  <th>Bodega</th>
                  <th>Concepto</th>
                  <th class="text-end">Cantidad</th>
                  <th class="text-end">Vlr. Unit.</th>
                  <th class="text-end">Vlr. Total</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let m of datos()">
                  <td>{{ m.fecha | date:'dd/MM/yyyy' }}</td>
                  <td><code>{{ m.tipo_docto }}</code></td>
                  <td>{{ m.consecutivo }}</td>
                  <td>{{ m.producto }}</td>
                  <td><span class="badge bg-secondary bg-opacity-10 text-dark">{{ m.bodega }}</span></td>
                  <td>{{ m.concepto }}</td>
                  <td class="text-end fw-semibold" [class.text-success]="m.cantidad > 0" [class.text-danger]="m.cantidad < 0">
                    {{ m.cantidad > 0 ? '+' : '' }}{{ m.cantidad | number:'1.0-2' }}
                  </td>
                  <td class="text-end">\${{ m.valor_unitario | number:'1.0-0' }}</td>
                  <td class="text-end">\${{ m.valor_total | number:'1.0-0' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div *ngIf="!loading() && datos().length === 0" class="text-center py-5 text-muted">
            <i class="bi bi-inbox display-4"></i><p class="mt-2">Sin movimientos encontrados</p>
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
    </div>
  `,
  styles: [`
    .page-header h2 { font-size:1.5rem; font-weight:700; }
    th { font-size:0.8rem; text-transform:uppercase; }
    td { font-size:0.85rem; vertical-align:middle; }
  `]
})
export class KardexComponent implements OnInit {
  private http = inject(HttpClient);
  private api = 'http://localhost:3000/api/kardex';

  loading = signal(false);
  datos = signal<any[]>([]);
  total = signal(0);
  offset = signal(0);
  resumen = signal<any[]>([]);
  filtros = { referencia: '', bodega: '', fechaDesde: '', fechaHasta: '' };

  ngOnInit() {
    this.http.get<any[]>(`${this.api}/resumen-mensual?meses=6`).subscribe(r => this.resumen.set(r));
    this.cargar();
  }

  cargar() {
    this.loading.set(true);
    const params: any = { limit: 100, offset: this.offset() };
    if (this.filtros.referencia) params.referencia = this.filtros.referencia;
    if (this.filtros.bodega) params.bodega = this.filtros.bodega;
    if (this.filtros.fechaDesde) params.fechaDesde = this.filtros.fechaDesde;
    if (this.filtros.fechaHasta) params.fechaHasta = this.filtros.fechaHasta;

    this.http.get<any>(`${this.api}/movimientos`, { params }).subscribe({
      next: (r) => { this.datos.set(r.datos || []); this.total.set(r.total || 0); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  paginar(dir: number) {
    this.offset.set(Math.max(0, this.offset() + dir * 100));
    this.cargar();
  }

  limpiar() {
    this.filtros = { referencia: '', bodega: '', fechaDesde: '', fechaHasta: '' };
    this.offset.set(0);
    this.cargar();
  }
}
