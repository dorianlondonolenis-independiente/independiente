import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface MaestraTable {
  name: string;
  label: string;
  description: string;
  rowCount: number;
}

interface MaestraGroup {
  key: string;
  label: string;
  tables: MaestraTable[];
}

@Component({
  selector: 'app-maestras-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container-fluid py-4">
      <!-- Header -->
      <div class="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div class="d-flex align-items-center gap-3">
          <i class="bi bi-grid-3x3-gap-fill fs-2 text-primary"></i>
          <div>
            <h2 class="mb-0">Maestras</h2>
            <small class="text-muted">Mantenimiento de datos maestros del sistema</small>
          </div>
        </div>
        <button class="btn btn-success btn-lg" (click)="goToWizard()">
          <i class="bi bi-plus-circle me-2"></i>Crear Producto
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading()" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="text-muted mt-2">Cargando maestras...</p>
      </div>

      <!-- Error -->
      <div *ngIf="error()" class="alert alert-danger d-flex align-items-center">
        <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ error() }}
      </div>

      <!-- Groups -->
      <div *ngIf="!isLoading() && grupos().length > 0">
        <div *ngFor="let grupo of grupos()" class="mb-4">
          <h4 class="mb-3 d-flex align-items-center gap-2">
            <i [class]="getGroupIcon(grupo.key)" class="text-primary"></i>
            {{ grupo.label }}
          </h4>
          <div class="row g-3">
            <div *ngFor="let tabla of grupo.tables" class="col-md-6 col-lg-4 col-xl-3">
              <div class="card h-100 shadow-sm border-0 card-hover" (click)="openTable(tabla.name)" style="cursor: pointer;">
                <div class="card-body">
                  <div class="d-flex align-items-start justify-content-between">
                    <div>
                      <h6 class="card-title mb-1">{{ tabla.label }}</h6>
                      <p class="card-text text-muted small mb-2">{{ tabla.description }}</p>
                    </div>
                    <span class="badge bg-primary rounded-pill">{{ formatNumber(tabla.rowCount) }}</span>
                  </div>
                  <div class="d-flex align-items-center justify-content-between mt-2">
                    <code class="small text-muted">{{ tabla.name }}</code>
                    <i class="bi bi-arrow-right text-primary"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card-hover {
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .card-hover:hover {
      transform: translateY(-3px);
      box-shadow: 0 0.5rem 1rem rgba(0,0,0,.15) !important;
    }
  `]
})
export class MaestrasDashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);

  grupos = signal<MaestraGroup[]>([]);
  isLoading = signal(true);
  error = signal('');

  ngOnInit() {
    this.http.get<MaestraGroup[]>('http://localhost:3000/api/maestras').subscribe({
      next: (data) => {
        this.grupos.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al cargar maestras');
        this.isLoading.set(false);
      }
    });
  }

  openTable(tableName: string) {
    this.router.navigate(['/table', tableName]);
  }

  goToWizard() {
    this.router.navigate(['/maestras/producto/nuevo']);
  }

  getGroupIcon(key: string): string {
    const icons: Record<string, string> = {
      inventario: 'bi bi-box-seam fs-5',
      terceros: 'bi bi-people fs-5',
      comercial: 'bi bi-cart4 fs-5',
      configuracion: 'bi bi-gear fs-5',
    };
    return icons[key] || 'bi bi-folder fs-5';
  }

  formatNumber(n: number): string {
    return n?.toLocaleString('es-CO') || '0';
  }
}
