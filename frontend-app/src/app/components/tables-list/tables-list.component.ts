import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-tables-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container-fluid py-4">
      <div class="d-flex align-items-center mb-4">
        <i class="bi bi-table fs-3 text-primary me-3"></i>
        <h2 class="mb-0">Tablas disponibles</h2>
      </div>

      <div *ngIf="isLoading()" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
        <p class="text-muted mt-2">Cargando tablas...</p>
      </div>

      <div *ngIf="error()" class="alert alert-danger d-flex align-items-center">
        <i class="bi bi-exclamation-triangle-fill me-2"></i>
        {{ error() }}
      </div>

      <div *ngIf="!isLoading() && tables().length === 0 && !error()" class="alert alert-warning">
        <i class="bi bi-info-circle me-2"></i> Sin tablas disponibles
      </div>

      <div *ngIf="!isLoading() && tables().length > 0" class="card shadow-sm">
        <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
          <span><i class="bi bi-database me-2"></i>{{ tables().length }} tablas encontradas</span>
        </div>
        <div class="table-responsive">
          <table class="table table-hover table-striped mb-0">
            <thead class="table-dark">
              <tr>
                <th><i class="bi bi-tag me-1"></i>Nombre</th>
                <th><i class="bi bi-diagram-3 me-1"></i>Esquema</th>
                <th><i class="bi bi-list-ol me-1"></i>Registros</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let table of tables()">
                <td><code>{{ table.name }}</code></td>
                <td><span class="badge bg-secondary">{{ table.schema }}</span></td>
                <td><span class="badge bg-primary rounded-pill">{{ table.rowCount }}</span></td>
                <td>
                  <button class="btn btn-sm btn-outline-primary" (click)="viewTable(table.name)">
                    <i class="bi bi-eye me-1"></i>Ver datos
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class TablesListComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);

  tables = signal<any[]>([]);
  isLoading = signal(true);
  error = signal('');

  ngOnInit() {
    this.http.get<any>('http://localhost:3000/api/metadata/database').subscribe({
      next: (response) => {
        if (response?.tables && Array.isArray(response.tables)) {
          this.tables.set(response.tables);
        } else {
          this.error.set('Formato de respuesta inválido');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || err.message || 'Error al cargar las tablas');
        this.isLoading.set(false);
      }
    });
  }

  viewTable(tableName: string) {
    this.router.navigate(['/table', tableName]);
  }
}
