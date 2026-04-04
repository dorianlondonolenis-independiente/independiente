import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { CommonModule } from '@angular/common';
import { ApiViewerService } from '../../services/api-viewer.service';

@Component({
  selector: 'app-list-table-dynamic',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container-fluid py-4">
      <div class="d-flex align-items-center mb-4 gap-3">
        <button class="btn btn-outline-secondary" (click)="volver()">
          <i class="bi bi-arrow-left me-1"></i>Volver
        </button>
        <div *ngIf="tableData()">
          <h2 class="mb-0">{{ tableData()!.titulo }}</h2>
          <small class="text-muted">{{ tableData()!.subtitulo }}</small>
        </div>
      </div>

      <div *ngIf="isLoading()" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
        <p class="text-muted mt-2">Cargando datos...</p>
      </div>

      <div *ngIf="error()" class="alert alert-danger d-flex align-items-center">
        <i class="bi bi-exclamation-triangle-fill me-2"></i>
        {{ error() }}
      </div>

      <div *ngIf="!isLoading() && tableData()" class="card shadow-sm">
        <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
          <span><i class="bi bi-grid-3x3 me-2"></i>{{ tableData()!.datos.length }} registros</span>
          <span class="badge bg-primary">{{ tableData()!.columnas.length }} columnas</span>
        </div>
        <div class="table-responsive">
          <table class="table table-hover table-striped table-sm mb-0">
            <thead class="table-dark">
              <tr>
                <th *ngFor="let col of tableData()!.columnas" style="white-space: nowrap">
                  {{ col.descripcion }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of tableData()!.datos">
                <td *ngFor="let col of tableData()!.columnas" style="white-space: nowrap">
                  {{ row[col.id] }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class ListTableDynamicComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private apiService = inject(ApiViewerService);

  tableData = signal<any>(null);
  isLoading = signal(true);
  error = signal('');

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const endpoint = params.get('endpoint');
      if (endpoint) {
        this.cargarDatos(endpoint);
      }
    });
  }

  private cargarDatos(endpoint: string) {
    this.isLoading.set(true);
    this.error.set('');
    this.tableData.set(null);

    this.apiService.executeEndpoint(endpoint).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res[0] : res;
        this.tableData.set(data);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        this.error.set(err.message || 'Error al cargar datos');
        this.isLoading.set(false);
      }
    });
  }

  volver() {
    this.location.back();
  }
}
