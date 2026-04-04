import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-queries-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container-fluid py-4">
      <div class="d-flex align-items-center mb-4">
        <i class="bi bi-search fs-3 text-success me-3"></i>
        <h2 class="mb-0">Consultas disponibles</h2>
      </div>

      <div *ngIf="isLoading()" class="text-center py-5">
        <div class="spinner-border text-success" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
        <p class="text-muted mt-2">Cargando consultas...</p>
      </div>

      <div *ngIf="error()" class="alert alert-danger d-flex align-items-center">
        <i class="bi bi-exclamation-triangle-fill me-2"></i>
        {{ error() }}
      </div>

      <div *ngIf="!isLoading() && queries().length === 0 && !error()" class="alert alert-warning">
        <i class="bi bi-info-circle me-2"></i> Sin consultas disponibles
      </div>

      <div *ngIf="!isLoading() && queries().length > 0" class="card shadow-sm">
        <div class="card-header bg-success text-white">
          <i class="bi bi-collection me-2"></i>{{ queries().length }} consultas encontradas
        </div>
        <div class="table-responsive">
          <table class="table table-hover table-striped mb-0">
            <thead class="table-dark">
              <tr>
                <th style="width: 80px"><i class="bi bi-hash me-1"></i>ID</th>
                <th><i class="bi bi-file-text me-1"></i>Nombre</th>
                <th><i class="bi bi-info-circle me-1"></i>Descripción</th>
                <th style="width: 120px">Acción</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let q of queries()">
                <td><span class="badge bg-secondary">{{ q.id }}</span></td>
                <td><strong>{{ q.nombre || q.name || '-' }}</strong></td>
                <td><small class="text-muted">{{ q.description || '-' }}</small></td>
                <td>
                  <button class="btn btn-sm btn-outline-success" (click)="nav(q.id)">
                    <i class="bi bi-play-fill me-1"></i>Ejecutar
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
export class QueriesListComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);

  queries = signal<any[]>([]);
  isLoading = signal(true);
  error = signal('');

  ngOnInit() {
    this.http.get('http://localhost:3000/api/queries').subscribe({
      next: (res: any) => {
        this.queries.set(Array.isArray(res) ? res : []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err.message);
        this.isLoading.set(false);
      }
    });
  }

  nav(id: number) {
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate(['/table', id]);
    });
  }
}
