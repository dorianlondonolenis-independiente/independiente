import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dynamic-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card">
      <!-- Encabezado -->
      <div class="card-header" *ngIf="dataTable && dataTable[0]">
        <div class="row">
          <div class="col-md-12" *ngIf="dataTable[0].titulo">
            <h3 class="mb-0">{{ dataTable[0].titulo }}</h3>
          </div>
        </div>
        <div class="row mt-2" *ngIf="dataTable[0].subtitulo">
          <div class="col-md-12">
            <p class="text-muted mb-0">{{ dataTable[0].subtitulo }}</p>
          </div>
        </div>
      </div>

      <!-- Cuerpo de la tabla -->
      <div class="card-body">
        <!-- Controles -->
        <div class="row mb-3" *ngIf="dataTable && dataTable[0]">
          <div class="col-md-12">
            <div class="input-group">
              <input
                type="text"
                class="form-control"
                placeholder="Buscar..."
                [(ngModel)]="searchTerm"
                (input)="filterData()"
                *ngIf="dataTable[0].buscador"
              />
              <button
                class="btn btn-outline-primary"
                (click)="exportToJSON()"
                *ngIf="dataTable[0].exportar"
              >
                Exportar JSON
              </button>
            </div>
          </div>
        </div>

        <!-- Selector de columnas -->
        <div class="row mb-3" *ngIf="dataTable && dataTable[0] && dataTable[0].columnasVisibles">
          <div class="col-md-12">
            <label class="form-label">Columnas visibles:</label>
            <div class="d-flex flex-wrap gap-2">
              <div class="form-check" *ngFor="let col of dataTable[0].columnas">
                <input
                  class="form-check-input"
                  type="checkbox"
                  [id]="'col-' + col.id"
                  [checked]="visibleColumns.includes(col.id)"
                  (change)="toggleColumn(col.id)"
                />
                <label class="form-check-label" [for]="'col-' + col.id">
                  {{ col.descripcion }}
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Tabla -->
        <div class="table-responsive" *ngIf="dataTable && dataTable[0]">
          <table class="table table-striped table-hover">
            <thead class="table-dark">
              <tr>
                <th *ngFor="let col of dataTable[0].columnas" [hidden]="!visibleColumns.includes(col.id)">
                  {{ col.descripcion }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of filteredData">
                <td
                  *ngFor="let col of dataTable[0].columnas"
                  [hidden]="!visibleColumns.includes(col.id)"
                >
                  {{ getRowValue(row, col.id) }}
                </td>
              </tr>
              <tr *ngIf="filteredData.length === 0">
                <td [attr.colspan]="visibleColumns.length" class="text-center text-muted">
                  No hay datos disponibles
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginación simple -->
        <div class="row mt-3">
          <div class="col-md-12">
            <nav>
              <ul class="pagination justify-content-center">
                <li class="page-item" [class.disabled]="currentPage === 0">
                  <button class="page-link" (click)="previousPage()" [disabled]="currentPage === 0">
                    Anterior
                  </button>
                </li>
                <li class="page-item active">
                  <span class="page-link">
                    Página {{ currentPage + 1 }} de {{ totalPages }}
                  </span>
                </li>
                <li class="page-item" [class.disabled]="currentPage >= totalPages - 1">
                  <button class="page-link" (click)="nextPage()" [disabled]="currentPage >= totalPages - 1">
                    Siguiente
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .table {
      margin-bottom: 0;
    }
    .card {
      box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
    }
    .card-header {
      background-color: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
      padding: 1.5rem;
    }
  `]
})
export class DynamicTableComponent implements OnInit {
  @Input() dataTable: any;

  searchTerm: string = '';
  visibleColumns: string[] = [];
  filteredData: any[] = [];
  currentPage: number = 0;
  pageSize: number = 10;

  ngOnInit(): void {
    this.initializeColumns();
    this.updateFilteredData();
  }

  initializeColumns(): void {
    if (this.dataTable && this.dataTable[0] && this.dataTable[0].columnas) {
      // Mostrar todas las columnas por defecto
      this.visibleColumns = this.dataTable[0].columnas.map((col: any) => col.id);
    }
  }

  toggleColumn(colId: string): void {
    const index = this.visibleColumns.indexOf(colId);
    if (index > -1) {
      this.visibleColumns.splice(index, 1);
    } else {
      this.visibleColumns.push(colId);
    }
  }

  filterData(): void {
    this.currentPage = 0;
    this.updateFilteredData();
  }

  updateFilteredData(): void {
    if (!this.dataTable || !this.dataTable[0] || !this.dataTable[0].datos) {
      this.filteredData = [];
      return;
    }

    let filtered = this.dataTable[0].datos;

    // Aplicar filtro de búsqueda
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter((row: any) => {
        return Object.values(row).some(val =>
          String(val).toLowerCase().includes(term)
        );
      });
    }

    // Aplicar paginación
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.filteredData = filtered.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    if (!this.dataTable || !this.dataTable[0] || !this.dataTable[0].datos) {
      return 0;
    }

    let totalItems = this.dataTable[0].datos.length;

    // Si hay filtro de búsqueda, contar los elementos filtrados
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      totalItems = this.dataTable[0].datos.filter((row: any) =>
        Object.values(row).some(val =>
          String(val).toLowerCase().includes(term)
        )
      ).length;
    }

    return Math.ceil(totalItems / this.pageSize);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.updateFilteredData();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.updateFilteredData();
    }
  }

  getRowValue(row: any, colId: string): any {
    return row[colId] !== undefined ? row[colId] : '-';
  }

  exportToJSON(): void {
    if (!this.dataTable || !this.dataTable[0]) {
      return;
    }

    const data = {
      titulo: this.dataTable[0].titulo,
      subtitulo: this.dataTable[0].subtitulo,
      datos: this.dataTable[0].datos
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.dataTable[0].titulo || 'datos'}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
