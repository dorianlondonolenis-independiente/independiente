import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiViewerService } from '../../services/api-viewer.service';

@Component({
  selector: 'app-list-table-dynamic',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid py-4">
      <!-- Header -->
      <div class="d-flex align-items-center mb-4 gap-3 flex-wrap">
        <button class="btn btn-outline-secondary" (click)="volver()">
          <i class="bi bi-arrow-left me-1"></i>Volver
        </button>
        <div *ngIf="tableData()" class="flex-grow-1">
          <h2 class="mb-0">{{ tableData()!.titulo }}</h2>
          <small class="text-muted">{{ tableData()!.subtitulo }}</small>
        </div>
        <button *ngIf="tableData() && isTableMode()" class="btn btn-success" (click)="openCreateModal()">
          <i class="bi bi-plus-lg me-1"></i>Nuevo registro
        </button>
      </div>

      <!-- Alerts -->
      <div *ngIf="successMsg()" class="alert alert-success alert-dismissible fade show">
        <i class="bi bi-check-circle me-2"></i>{{ successMsg() }}
        <button type="button" class="btn-close" (click)="successMsg.set('')"></button>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading()" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="text-muted mt-2">Cargando datos...</p>
      </div>

      <!-- Error -->
      <div *ngIf="error()" class="alert alert-danger d-flex align-items-center">
        <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ error() }}
      </div>

      <!-- Search & Limit -->
      <div *ngIf="!isLoading() && tableData()" class="mb-3 d-flex gap-2 align-items-center flex-wrap">
        <div class="input-group flex-grow-1">
          <span class="input-group-text"><i class="bi bi-search"></i></span>
          <input type="text" class="form-control" placeholder="Buscar en todos los campos..."
                 [(ngModel)]="searchTerm" (input)="filterData()">
          <button class="btn btn-outline-secondary" *ngIf="searchTerm" (click)="searchTerm=''; filterData()">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="input-group" style="width: auto; min-width: 220px;">
          <span class="input-group-text"><i class="bi bi-list-ol"></i> Límite</span>
          <select class="form-select" [ngModel]="recordLimit()" (ngModelChange)="changeLimit($event)">
            <option *ngFor="let opt of limitOptions" [ngValue]="opt">{{ opt === 0 ? 'Todos' : opt }}</option>
          </select>
        </div>
      </div>

      <!-- Table -->
      <div *ngIf="!isLoading() && tableData()" class="card shadow-sm">
        <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
          <span><i class="bi bi-grid-3x3 me-2"></i>{{ filteredRows().length }} registros</span>
          <span class="badge bg-primary">{{ tableData()!.columnas.length }} columnas</span>
        </div>
        <div class="table-responsive">
          <table class="table table-hover table-striped table-sm mb-0">
            <thead class="table-dark">
              <tr>
                <th *ngIf="isTableMode()" style="width: 100px">Acciones</th>
                <th *ngFor="let col of tableData()!.columnas" style="white-space: nowrap">
                  {{ col.descripcion }}
                  <i *ngIf="primaryKeys().includes(col.id)" class="bi bi-key-fill text-warning ms-1" title="Primary Key"></i>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of paginatedRows()">
                <td *ngIf="isTableMode()" style="white-space: nowrap">
                  <button class="btn btn-sm btn-outline-warning me-1" (click)="openEditModal(row)" title="Editar">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger" (click)="confirmDelete(row)" title="Eliminar">
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
                <td *ngFor="let col of tableData()!.columnas" style="white-space: nowrap; max-width: 300px; overflow: hidden; text-overflow: ellipsis;">
                  {{ row[col.id] }}
                </td>
              </tr>
              <tr *ngIf="paginatedRows().length === 0">
                <td [attr.colspan]="tableData()!.columnas.length + (isTableMode() ? 1 : 0)" class="text-center text-muted py-4">
                  Sin datos
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Pagination -->
        <div class="card-footer d-flex justify-content-between align-items-center">
          <small class="text-muted">
            Mostrando {{ paginationStart() + 1 }}-{{ paginationEnd() }} de {{ filteredRows().length }}
          </small>
          <nav>
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" [class.disabled]="currentPage() === 0">
                <button class="page-link" (click)="currentPage.set(currentPage() - 1)">Anterior</button>
              </li>
              <li class="page-item active">
                <span class="page-link">{{ currentPage() + 1 }} / {{ totalPages() }}</span>
              </li>
              <li class="page-item" [class.disabled]="currentPage() >= totalPages() - 1">
                <button class="page-link" (click)="currentPage.set(currentPage() + 1)">Siguiente</button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>

    <!-- CRUD Modal -->
    <div class="modal-backdrop fade show" *ngIf="showModal()" (click)="closeModal()"></div>
    <div class="modal fade show d-block" *ngIf="showModal()" tabindex="-1">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 shadow">
          <div class="modal-header" [class.bg-success]="modalMode() === 'create'" [class.bg-warning]="modalMode() === 'edit'" [class.text-white]="modalMode() === 'create'">
            <h5 class="modal-title">
              <i class="bi me-2" [class.bi-plus-circle]="modalMode() === 'create'" [class.bi-pencil]="modalMode() === 'edit'"></i>
              {{ modalMode() === 'create' ? 'Nuevo registro' : 'Editar registro' }}
            </h5>
            <button type="button" class="btn-close" (click)="closeModal()"></button>
          </div>
          <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
            <div *ngIf="modalError()" class="alert alert-danger">
              <i class="bi bi-exclamation-triangle me-2"></i>{{ modalError() }}
            </div>
            <div *ngFor="let col of columnsMetadata(); let i = index" class="mb-3">
              <label class="form-label fw-semibold" [for]="'field-' + i">
                {{ col.name }}
                <span *ngIf="col.isPrimaryKey" class="badge bg-warning text-dark ms-1">PK</span>
                <small class="text-muted ms-1">({{ col.type }}<span *ngIf="col.maxLength"> {{ col.maxLength }}</span>)</small>
              </label>
              <input [id]="'field-' + i" class="form-control"
                     [type]="getInputType(col.type)"
                     [ngModel]="formData[col.name]"
                     (ngModelChange)="formData[col.name] = $event"
                     [disabled]="modalMode() === 'edit' && col.isPrimaryKey"
                     [placeholder]="col.nullable ? 'Opcional' : 'Requerido'">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeModal()">
              <i class="bi bi-x-lg me-1"></i>Cancelar
            </button>
            <button class="btn" [class.btn-success]="modalMode() === 'create'" [class.btn-warning]="modalMode() === 'edit'"
                    (click)="saveRecord()" [disabled]="isSaving()">
              <span *ngIf="isSaving()" class="spinner-border spinner-border-sm me-1"></span>
              <i *ngIf="!isSaving()" class="bi me-1" [class.bi-save]="true"></i>
              {{ isSaving() ? 'Guardando...' : (modalMode() === 'create' ? 'Crear' : 'Guardar') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div class="modal-backdrop fade show" *ngIf="showDeleteConfirm()" (click)="showDeleteConfirm.set(false)"></div>
    <div class="modal fade show d-block" *ngIf="showDeleteConfirm()" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title"><i class="bi bi-exclamation-triangle me-2"></i>Confirmar eliminación</h5>
            <button type="button" class="btn-close btn-close-white" (click)="showDeleteConfirm.set(false)"></button>
          </div>
          <div class="modal-body">
            <p>¿Estás seguro de que deseas eliminar este registro?</p>
            <p class="text-muted mb-0"><small>Esta acción no se puede deshacer.</small></p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showDeleteConfirm.set(false)">Cancelar</button>
            <button class="btn btn-danger" (click)="executeDelete()" [disabled]="isSaving()">
              <span *ngIf="isSaving()" class="spinner-border spinner-border-sm me-1"></span>
              <i *ngIf="!isSaving()" class="bi bi-trash me-1"></i>
              {{ isSaving() ? 'Eliminando...' : 'Eliminar' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ListTableDynamicComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private apiService = inject(ApiViewerService);

  // Data
  tableData = signal<any>(null);
  isLoading = signal(true);
  error = signal('');
  successMsg = signal('');
  currentEndpoint = '';

  // Table mode (true = table name, false = query id)
  isTableMode = signal(false);

  // Search & pagination
  searchTerm = '';
  filteredRows = signal<any[]>([]);
  currentPage = signal(0);
  pageSize = 15;

  // Record limit
  recordLimit = signal(100);
  limitOptions = [50, 100, 250, 500, 1000, 0];

  // Primary keys
  primaryKeys = signal<string[]>([]);
  columnsMetadata = signal<any[]>([]);

  // Modal
  showModal = signal(false);
  modalMode = signal<'create' | 'edit'>('create');
  modalError = signal('');
  formData: Record<string, any> = {};
  isSaving = signal(false);
  editingRow: any = null;

  // Delete
  showDeleteConfirm = signal(false);
  deletingRow: any = null;

  paginatedRows = computed(() => {
    const start = this.currentPage() * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredRows().slice(start, end);
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredRows().length / this.pageSize)));
  paginationStart = computed(() => Math.min(this.currentPage() * this.pageSize, this.filteredRows().length));
  paginationEnd = computed(() => Math.min((this.currentPage() + 1) * this.pageSize, this.filteredRows().length));

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const endpoint = params.get('endpoint');
      if (endpoint) {
        this.currentEndpoint = endpoint;
        this.isTableMode.set(!/^\d+$/.test(endpoint));
        this.cargarDatos(endpoint);
      }
    });
  }

  private cargarDatos(endpoint: string) {
    this.isLoading.set(true);
    this.error.set('');
    this.tableData.set(null);

    const limit = this.recordLimit() || 100000;
    this.apiService.executeEndpoint(endpoint, limit, 0).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res[0] : res;
        this.tableData.set(data);
        this.filterData();
        this.isLoading.set(false);

        // Load metadata for CRUD if table mode
        if (this.isTableMode()) {
          this.loadTableMeta(endpoint);
        }
      },
      error: (err: any) => {
        this.error.set(err.error?.message || err.message || 'Error al cargar datos');
        this.isLoading.set(false);
      }
    });
  }

  private loadTableMeta(tableName: string) {
    // Build column metadata from the already-loaded table data
    this.buildColumnsFromTableData([]);

    this.apiService.getTablePrimaryKeys(tableName).subscribe({
      next: (res) => {
        const pks = res.primaryKeys || [];
        this.primaryKeys.set(pks);
        this.buildColumnsFromTableData(pks);
      },
      error: () => {
        this.primaryKeys.set([]);
      }
    });
  }

  private buildColumnsFromTableData(pks: string[]) {
    const data = this.tableData();
    if (!data?.columnas) {
      this.columnsMetadata.set([]);
      return;
    }
    const firstRow = data.datos?.[0];
    const cols = data.columnas.map((c: any) => ({
      name: c.id,
      type: this.inferColumnType(firstRow?.[c.id]),
      nullable: true,
      isPrimaryKey: pks.includes(c.id),
      maxLength: null
    }));
    this.columnsMetadata.set(cols);
  }

  private inferColumnType(value: any): string {
    if (value === null || value === undefined) return 'varchar';
    if (typeof value === 'number') return 'int';
    if (typeof value === 'boolean') return 'bit';
    if (typeof value === 'string' && !isNaN(Date.parse(value)) && value.includes('-')) return 'datetime';
    return 'varchar';
  }

  filterData() {
    const data = this.tableData();
    if (!data?.datos) { this.filteredRows.set([]); return; }

    let rows = data.datos;
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      rows = rows.filter((r: any) => Object.values(r).some(v => String(v ?? '').toLowerCase().includes(term)));
    }
    this.filteredRows.set(rows);
    this.currentPage.set(0);
  }

  changeLimit(value: number) {
    this.recordLimit.set(value);
    this.cargarDatos(this.currentEndpoint);
  }

  // --- CRUD Modal ---

  openCreateModal() {
    this.modalMode.set('create');
    this.modalError.set('');
    this.formData = {};
    this.columnsMetadata().forEach(c => this.formData[c.name] = '');
    this.editingRow = null;
    this.showModal.set(true);
  }

  openEditModal(row: any) {
    this.modalMode.set('edit');
    this.modalError.set('');
    this.editingRow = row;
    this.formData = { ...row };
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  saveRecord() {
    if (this.modalMode() === 'create') {
      this.createRecord();
    } else {
      this.updateRecord();
    }
  }

  private createRecord() {
    this.isSaving.set(true);
    this.modalError.set('');

    // Filter out empty values
    const payload: Record<string, any> = {};
    Object.entries(this.formData).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) payload[k] = v;
    });

    this.apiService.createRecord(this.currentEndpoint, payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeModal();
        this.successMsg.set('Registro creado exitosamente');
        this.cargarDatos(this.currentEndpoint);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.modalError.set(err.error?.message || 'Error al crear registro');
      }
    });
  }

  private updateRecord() {
    const pks = this.primaryKeys();
    this.isSaving.set(true);
    this.modalError.set('');

    if (pks.length > 0) {
      // Tiene PK: usar endpoint por PK
      const pkField = pks[0];
      const pkValue = this.editingRow[pkField];
      const payload: Record<string, any> = {};
      Object.entries(this.formData).forEach(([k, v]) => {
        if (k !== pkField) payload[k] = v === '' ? null : v;
      });

      this.apiService.updateRecord(this.currentEndpoint, pkField, pkValue, payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeModal();
          this.successMsg.set('Registro actualizado exitosamente');
          this.cargarDatos(this.currentEndpoint);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.modalError.set(err.error?.message || 'Error al actualizar registro');
        }
      });
    } else {
      // Sin PK: usar todos los campos originales en el WHERE
      const updated: Record<string, any> = {};
      Object.entries(this.formData).forEach(([k, v]) => {
        updated[k] = v === '' ? null : v;
      });

      this.apiService.updateRecordByRow(this.currentEndpoint, this.editingRow, updated).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeModal();
          this.successMsg.set('Registro actualizado exitosamente');
          this.cargarDatos(this.currentEndpoint);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.modalError.set(err.error?.message || 'Error al actualizar registro');
        }
      });
    }
  }

  // --- Delete ---

  confirmDelete(row: any) {
    this.deletingRow = row;
    this.showDeleteConfirm.set(true);
  }

  executeDelete() {
    if (!this.deletingRow) return;
    const pks = this.primaryKeys();
    this.isSaving.set(true);

    if (pks.length > 0) {
      // Tiene PK: usar endpoint por PK
      const pkField = pks[0];
      const pkValue = this.deletingRow[pkField];

      this.apiService.deleteRecord(this.currentEndpoint, pkField, pkValue).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showDeleteConfirm.set(false);
          this.deletingRow = null;
          this.successMsg.set('Registro eliminado exitosamente');
          this.cargarDatos(this.currentEndpoint);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.showDeleteConfirm.set(false);
          this.error.set(err.error?.message || 'Error al eliminar registro');
        }
      });
    } else {
      // Sin PK: usar todos los campos en el WHERE
      this.apiService.deleteRecordByRow(this.currentEndpoint, this.deletingRow).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showDeleteConfirm.set(false);
          this.deletingRow = null;
          this.successMsg.set('Registro eliminado exitosamente');
          this.cargarDatos(this.currentEndpoint);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.showDeleteConfirm.set(false);
          this.error.set(err.error?.message || 'Error al eliminar registro');
        }
      });
    }
  }

  getInputType(dataType: string): string {
    const type = (dataType || '').toLowerCase();
    if (type.includes('int') || type.includes('decimal') || type.includes('numeric') || type.includes('float') || type.includes('money')) return 'number';
    if (type.includes('date') || type.includes('time')) return 'datetime-local';
    if (type.includes('bit')) return 'checkbox';
    return 'text';
  }

  volver() {
    this.location.back();
  }
}
