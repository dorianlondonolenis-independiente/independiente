import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-cartera',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid py-4 px-4">
      <div class="page-header mb-4">
        <h2><i class="bi bi-wallet2 me-2 text-info"></i>Cartera / Saldos</h2>
        <p class="text-muted mb-0">Cuentas por cobrar y por pagar — Antigüedad de saldos</p>
      </div>

      <!-- Stats -->
      <div class="row g-3 mb-4" *ngIf="stats()">
        <div class="col-6 col-lg-3">
          <div class="stat-card" style="border-left-color:#198754">
            <span class="stat-value">\${{ stats().total_cxc | number:'1.0-0' }}</span>
            <span class="stat-label">Cuentas x Cobrar</span>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="stat-card" style="border-left-color:#dc3545">
            <span class="stat-value">\${{ stats().total_cxp | number:'1.0-0' }}</span>
            <span class="stat-label">Cuentas x Pagar</span>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="stat-card" style="border-left-color:#0d6efd">
            <span class="stat-value">{{ stats().total_saldos | number }}</span>
            <span class="stat-label">Docs Abiertos</span>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="stat-card" style="border-left-color:#6f42c1">
            <span class="stat-value">{{ stats().terceros_con_saldo | number }}</span>
            <span class="stat-label">Terceros con saldo</span>
          </div>
        </div>
      </div>

      <!-- Aging chart-like display -->
      <div class="card border-0 shadow-sm mb-4" *ngIf="aging().length > 0">
        <div class="card-header bg-white fw-semibold"><i class="bi bi-clock-history me-2"></i>Antigüedad de Saldos</div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col" *ngFor="let a of aging()">
              <div class="aging-bucket text-center p-3 rounded-3" [style.background]="a.bg">
                <div class="fw-bold fs-6" [style.color]="a.color">\${{ a.valor | number:'1.0-0' }}</div>
                <small class="text-muted">{{ a.rango }}</small>
                <div class="mt-1"><span class="badge" [style.background]="a.color" style="color:#fff">{{ a.cantidad }} docs</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filter -->
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-body py-3">
          <div class="row g-2 align-items-end">
            <div class="col-md-3">
              <input type="text" class="form-control form-control-sm" placeholder="Buscar tercero..."
                     [(ngModel)]="filtros.buscar" (keyup.enter)="cargar()">
            </div>
            <div class="col-md-2">
              <select class="form-select form-select-sm" [(ngModel)]="filtros.tipo" (change)="cargar()">
                <option value="">CxC + CxP</option>
                <option value="cxc">Solo CxC</option>
                <option value="cxp">Solo CxP</option>
              </select>
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
          <div class="table-responsive" *ngIf="!loading() && saldos().length > 0">
            <table class="table table-hover table-sm mb-0">
              <thead class="table-light">
                <tr>
                  <th>Tipo Doc</th>
                  <th>Consecutivo</th>
                  <th>Tercero</th>
                  <th>Fecha Doc</th>
                  <th>Vencimiento</th>
                  <th class="text-end">Saldo</th>
                  <th class="text-center">Tipo</th>
                  <th class="text-center">Días</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let s of saldos()">
                  <td><code>{{ s.tipo_docto }}</code></td>
                  <td class="fw-semibold">{{ s.consecutivo }}</td>
                  <td>{{ s.tercero }}</td>
                  <td>{{ s.fecha_documento | date:'dd/MM/yyyy' }}</td>
                  <td>{{ s.fecha_vencimiento | date:'dd/MM/yyyy' }}</td>
                  <td class="text-end fw-semibold" [class.text-success]="s.tipo === 'CxC'" [class.text-danger]="s.tipo === 'CxP'">
                    \${{ s.saldo | number:'1.0-0' }}
                  </td>
                  <td class="text-center">
                    <span class="badge" [class.bg-success]="s.tipo === 'CxC'" [class.bg-danger]="s.tipo === 'CxP'">
                      {{ s.tipo }}
                    </span>
                  </td>
                  <td class="text-center">
                    <span class="badge rounded-pill"
                          [class.bg-success]="s.dias_vencido <= 0"
                          [class.bg-warning]="s.dias_vencido > 0 && s.dias_vencido <= 30"
                          [class.bg-danger]="s.dias_vencido > 30">
                      {{ s.dias_vencido > 0 ? s.dias_vencido + 'd' : 'Vigente' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div *ngIf="!loading() && saldos().length === 0" class="text-center py-5 text-muted">
            <i class="bi bi-inbox display-4"></i><p class="mt-2">Sin saldos abiertos</p>
          </div>
        </div>
        <div class="card-footer bg-white d-flex justify-content-between" *ngIf="totalSaldos() > 0">
          <small class="text-muted">{{ saldos().length }} de {{ totalSaldos() }}</small>
          <div>
            <button class="btn btn-sm btn-outline-primary me-1" [disabled]="offset() === 0" (click)="paginar(-1)">Anterior</button>
            <button class="btn btn-sm btn-outline-primary" [disabled]="offset() + 100 >= totalSaldos()" (click)="paginar(1)">Siguiente</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-header h2 { font-size:1.5rem; font-weight:700; }
    .stat-card { background:#fff; border-radius:10px; padding:16px; border-left:4px solid; box-shadow:0 1px 3px rgba(0,0,0,0.06); }
    .stat-value { display:block; font-size:1.3rem; font-weight:700; }
    .stat-label { font-size:0.75rem; color:#6c757d; }
    .aging-bucket { transition: transform 0.2s; }
    .aging-bucket:hover { transform: translateY(-2px); }
    th { font-size:0.8rem; text-transform:uppercase; }
    td { font-size:0.85rem; vertical-align:middle; }
  `]
})
export class CarteraComponent implements OnInit {
  private http = inject(HttpClient);
  private api = 'http://localhost:3000/api/cartera';

  loading = signal(false);
  stats = signal<any>(null);
  saldos = signal<any[]>([]);
  totalSaldos = signal(0);
  offset = signal(0);
  aging = signal<any[]>([]);
  filtros = { buscar: '', tipo: '' };

  private agingColors = [
    { bg: '#d1f2eb', color: '#198754' },
    { bg: '#fff3cd', color: '#fd7e14' },
    { bg: '#fce4ec', color: '#e94560' },
    { bg: '#f8d7da', color: '#dc3545' },
    { bg: '#d32f2f20', color: '#b71c1c' },
  ];

  ngOnInit() {
    this.http.get<any>(`${this.api}/stats`).subscribe(s => this.stats.set(s));
    this.http.get<any[]>(`${this.api}/aging`).subscribe(data => {
      this.aging.set(data.map((a: any, i: number) => ({
        ...a,
        bg: this.agingColors[i]?.bg || '#f0f0f0',
        color: this.agingColors[i]?.color || '#666',
      })));
    });
    this.cargar();
  }

  cargar() {
    this.loading.set(true);
    const params: any = { limit: 100, offset: this.offset() };
    if (this.filtros.buscar) params.buscar = this.filtros.buscar;
    if (this.filtros.tipo) params.tipo = this.filtros.tipo;

    this.http.get<any>(`${this.api}/saldos`, { params }).subscribe({
      next: (r) => { this.saldos.set(r.datos || []); this.totalSaldos.set(r.total || 0); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  paginar(dir: number) {
    this.offset.set(Math.max(0, this.offset() + dir * 100));
    this.cargar();
  }
}
