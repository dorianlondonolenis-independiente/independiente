import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { ApiViewerService } from './api-viewer.service';

interface Column {
  field: string;
  header: string;
}

@Component({
  selector: 'app-api-viewer',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  providers: [ApiViewerService],
  template: `
    <div class="container-fluid p-4">
      <!-- Header -->
      <div class="row mb-4">
        <div class="col-md-12">
          <h2 class="text-primary">
            <i class="fas fa-database"></i> API Viewer - {{ currentEndpoint() }}
          </h2>
          <p class="text-muted">
            URL: <code>/api-viewer/{{ endpointType() }}/{{ endpointId() }}</code>
          </p>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="alert alert-info">
        <div class="spinner-border spinner-border-sm" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
        Cargando datos del endpoint...
      </div>

      <!-- Error State -->
      <div *ngIf="error() && !isLoading()" class="alert alert-danger alert-dismissible fade show">
        <strong>Error:</strong> {{ error() }}
        <button type="button" class="btn-close" (click)="clearError()"></button>
      </div>

      <!-- Data Display -->
      <div *ngIf="!isLoading() && !error() && displayData()" class="card">
        <div class="card-header bg-primary text-white">
          <h5 class="mb-0">
            <i class="fas fa-table"></i> Resultados ({{ recordCount() }} registros)
          </h5>
        </div>
        <div class="card-body">
          <!-- Tabla para array de datos -->
          <div *ngIf="isArrayData()" class="table-responsive">
            <table class="table table-hover table-sm">
              <thead class="table-light">
                <tr>
                  <th *ngFor="let col of getColumns()">{{ col.header }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of displayData()">
                  <td *ngFor="let col of getColumns()" [innerHTML]="row[col.field] | json"></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- JSON para datos complejos -->
          <div *ngIf="!isArrayData()" class="bg-light p-3 rounded">
            <pre><code>{{ displayData() | json }}</code></pre>
          </div>
        </div>
      </div>

      <!-- Pagination Controls -->
      <div *ngIf="!isLoading() && !error() && displayData()" class="row mt-3">
        <div class="col-md-12">
          <nav>
            <ul class="pagination justify-content-center">
              <li class="page-item" [class.disabled]="currentPage() <= 0">
                <button class="page-link" (click)="previousPage()">Anterior</button>
              </li>
              <li class="page-item">
                <span class="page-link">
                  Página {{ currentPage() + 1 }} de {{ totalPages() }}
                </span>
              </li>
              <li class="page-item" [class.disabled]="currentPage() >= totalPages() - 1">
                <button class="page-link" (click)="nextPage()">Siguiente</button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <!-- Metadata Info -->
      <div *ngIf="!isLoading() && !error()" class="row mt-4">
        <div class="col-md-12">
          <div class="alert alert-light border">
            <h6 class="alert-heading">
              <i class="fas fa-info-circle"></i> Información de la consulta
            </h6>
            <small>
              <strong>Endpoint:</strong> {{ endpointType() }} <br />
              <strong>Registros:</strong> {{ recordCount() }} <br />
              <strong>Columnas:</strong> {{ getColumns().length }} <br />
              <strong>Tamaño:</strong> {{ dataSize() | number }} bytes
            </small>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        padding: 20px;
        background-color: #f8f9fa;
        min-height: 100vh;
      }

      code {
        background-color: #e9ecef;
        padding: 2px 6px;
        border-radius: 3px;
        color: #d63384;
      }

      pre {
        background-color: #f5f5f5;
        padding: 15px;
        border-radius: 5px;
        overflow-x: auto;
        max-height: 400px;
      }

      .table-hover tbody tr:hover {
        background-color: #f0f0f0;
      }

      .spinner-border-sm {
        width: 1rem;
        height: 1rem;
        margin-right: 0.5rem;
      }
    `,
  ],
})
export class ApiViewerComponent implements OnInit {
  private apiService = new ApiViewerService(null as any);
  private route = new ActivatedRoute();
  private router = new Router(null as any, null as any);

  // Signals
  endpointType = signal<string>('');
  endpointId = signal<string>('');
  currentPage = signal<number>(0);
  limit = signal<number>(100);

  // Data signals
  data = signal<any>(null);
  isLoading = signal<boolean>(false);
  error = signal<string>('');

  // Computed signals
  recordCount = computed(() => {
    const d = this.data();
    if (Array.isArray(d)) return d.length;
    if (d && typeof d === 'object' && 'count' in d) return d.count;
    return 0;
  });

  displayData = computed(() => {
    const d = this.data();
    if (Array.isArray(d)) return d;
    if (d && Array.isArray(d.data)) return d.data;
    return d;
  });

  totalPages = computed(() => {
    return Math.ceil(this.recordCount() / this.limit());
  });

  currentEndpoint = computed(() => {
    const type = this.endpointType();
    const id = this.endpointId();
    return id ? `${type} (${id})` : type;
  });

  dataSize = computed(() => {
    try {
      return JSON.stringify(this.data()).length;
    } catch {
      return 0;
    }
  });

  constructor(apiService: ApiViewerService, route: ActivatedRoute, router: Router) {
    this.apiService = apiService;
    this.route = route;
    this.router = router;
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const endpoint = params['endpoint'] || '';
      const id = params['id'] || '';

      this.endpointType.set(endpoint);
      this.endpointId.set(id);
      this.currentPage.set(0);

      this.loadData(endpoint, id);
    });
  }

  /**
   * Carga los datos del endpoint especificado
   */
  loadData(endpoint: string, id: string): void {
    this.isLoading.set(true);
    this.error.set('');

    const offset = this.currentPage() * this.limit();

    const request$ = this.getEndpointObservable(endpoint, id, offset);

    if (request$) {
      request$.subscribe({
        next: (response) => {
          this.data.set(response);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.error.set(err.error?.message || err.message || 'Error loading data');
          console.error('API Error:', err);
        },
      });
    } else {
      this.isLoading.set(false);
      this.error.set('Endpoint no válido');
    }
  }

  /**
   * Retorna el Observable correspondiente al endpoint
   */
  private getEndpointObservable(endpoint: string, id: string, offset: number) {
    const limit = this.limit();

    switch (endpoint) {
      case 'metadata/database':
        return this.apiService.getMetadataDatabase();
      case 'metadata/tables':
        return this.apiService.getMetadataTables();
      case 'metadata/columns':
        return this.apiService.getMetadataTableColumns(id);
      case 'metadata/row-count':
        return this.apiService.getMetadataRowCount(id);
      case 'data':
        return this.apiService.getTableData(id, limit, offset);
      case 'data/single':
        return this.apiService.getTableSingleRecord(id, 'id', id);
      case 'queries':
        return this.apiService.getQueriesList();
      case 'queries/detail':
        return this.apiService.getQueryDetail(parseInt(id));
      case 'queries/execute':
        return this.apiService.executeQuery(parseInt(id), limit, offset);
      default:
        return null;
    }
  }

  /**
   * Obtiene las columnas del dataset actual
   */
  getColumns(): Column[] {
    const data = this.displayData();

    if (!data) return [];

    if (Array.isArray(data) && data.length > 0) {
      const firstRow = data[0];
      if (typeof firstRow === 'object') {
        return Object.keys(firstRow).map((key) => ({
          field: key,
          header: key.charAt(0).toUpperCase() + key.slice(1),
        }));
      }
    }

    return [];
  }

  /**
   * Determina si los datos son un array
   */
  isArrayData(): boolean {
    return Array.isArray(this.displayData());
  }

  /**
   * Navega a la página anterior
   */
  previousPage(): void {
    if (this.currentPage() > 0) {
      this.currentPage.update((p) => p - 1);
      this.loadData(this.endpointType(), this.endpointId());
    }
  }

  /**
   * Navega a la página siguiente
   */
  nextPage(): void {
    if (this.currentPage() < this.totalPages() - 1) {
      this.currentPage.update((p) => p + 1);
      this.loadData(this.endpointType(), this.endpointId());
    }
  }

  /**
   * Limpia el error
   */
  clearError(): void {
    this.error.set('');
  }
}
