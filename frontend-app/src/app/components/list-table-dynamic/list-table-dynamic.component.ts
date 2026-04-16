import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Location, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiViewerService } from '../../services/api-viewer.service';
import { PreferencesService } from '../../services/preferences.service';

@Component({
  selector: 'app-list-table-dynamic',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container-fluid py-4" style="overflow-x: hidden;">
      <!-- Header -->
      <div class="d-flex align-items-center mb-4 gap-3 flex-wrap">
        <button class="btn btn-outline-secondary" (click)="volver()">
          <i class="bi bi-arrow-left me-1"></i>Volver
        </button>
        <div *ngIf="tableData()" class="flex-grow-1">
          <h2 class="mb-0">
            {{ tableData()!.titulo }}
            <button *ngIf="isTableMode()" class="btn btn-sm btn-link p-0 ms-2" (click)="toggleFavorite()" title="Favorito">
              <i class="bi" [class.bi-star-fill]="isFavorite()" [class.bi-star]="!isFavorite()" [style.color]="isFavorite() ? '#ffc107' : '#adb5bd'" style="font-size: 1.2rem;"></i>
            </button>
          </h2>
          <small class="text-muted">{{ tableData()!.subtitulo }}</small>
        </div>
        <div class="d-flex gap-2">
          <button *ngIf="tableData() && isTableMode()" class="btn btn-outline-info" (click)="toggleRelations()" [class.active]="showRelations()">
            <i class="bi bi-diagram-3 me-1"></i>Relaciones
          </button>
          <button *ngIf="tableData()" class="btn btn-outline-success" (click)="exportCsv()" [disabled]="isExporting()">
            <span *ngIf="isExporting()" class="spinner-border spinner-border-sm me-1"></span>
            <i *ngIf="!isExporting()" class="bi bi-download me-1"></i>CSV
          </button>
          <button *ngIf="tableData() && isTableMode()" class="btn btn-success" (click)="openCreateModal()">
            <i class="bi bi-plus-lg me-1"></i>Nuevo registro
          </button>
        </div>
      </div>

      <!-- Relations Panel (Accordion) -->
      <div *ngIf="showRelations() && relations()" class="card shadow-sm mb-3 border-info">
        <div class="card-header bg-info text-white d-flex justify-content-between align-items-center">
          <span><i class="bi bi-diagram-3 me-2"></i>Relaciones de {{ currentEndpoint }}</span>
          <button class="btn btn-sm btn-outline-light" (click)="showRelations.set(false)"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="card-body p-0">
          <!-- Outgoing FK Accordion -->
          <div class="border-bottom">
            <button class="btn btn-link w-100 text-start py-2 px-3 text-decoration-none d-flex align-items-center"
                    (click)="accordionOutgoing.set(!accordionOutgoing())"
                    [class.text-primary]="true">
              <i class="bi me-2" [class.bi-chevron-down]="accordionOutgoing()" [class.bi-chevron-right]="!accordionOutgoing()"></i>
              <i class="bi bi-box-arrow-up-right me-2 text-primary"></i>
              <strong>Esta tabla referencia a</strong>
              <span class="badge bg-primary ms-2">{{ relations()!.outgoing.length }}</span>
            </button>
            <div *ngIf="accordionOutgoing()" class="px-3 pb-3">
              <div *ngIf="relations()!.outgoing.length === 0" class="text-muted small py-2">Sin referencias salientes</div>
              <div *ngFor="let rel of relations()!.outgoing"
                   class="d-flex align-items-center gap-2 mb-2 p-2 rounded border"
                   [class.border-warning]="rel.isMaestra" [class.bg-warning-subtle]="rel.isMaestra"
                   [class.bg-light]="!rel.isMaestra">
                <i class="bi bi-arrow-right text-primary"></i>
                <div class="flex-grow-1">
                  <a class="fw-semibold text-decoration-none" [routerLink]="['/table', rel.referencedTable]" style="cursor: pointer;">
                    {{ rel.referencedTable }}
                  </a>
                  <span *ngIf="rel.isMaestra" class="badge bg-warning text-dark ms-1" style="font-size: 0.65rem;">Maestra</span>
                  <br>
                  <small class="text-muted">{{ rel.column }} → {{ rel.referencedColumn }}</small>
                </div>
                <span class="badge rounded-pill"
                      [class.bg-success]="rel.rowCount > 0" [class.bg-secondary]="rel.rowCount === 0"
                      [class.bg-danger]="rel.rowCount < 0">
                  <i class="bi me-1" [class.bi-check-circle]="rel.rowCount > 0" [class.bi-x-circle]="rel.rowCount === 0"
                     [class.bi-exclamation-triangle]="rel.rowCount < 0"></i>
                  {{ rel.rowCount < 0 ? 'Error' : (rel.rowCount | number) + ' reg.' }}
                </span>
              </div>
            </div>
          </div>
          <!-- Incoming FK Accordion -->
          <div>
            <button class="btn btn-link w-100 text-start py-2 px-3 text-decoration-none d-flex align-items-center"
                    (click)="accordionIncoming.set(!accordionIncoming())"
                    [class.text-success]="true">
              <i class="bi me-2" [class.bi-chevron-down]="accordionIncoming()" [class.bi-chevron-right]="!accordionIncoming()"></i>
              <i class="bi bi-box-arrow-in-down-left me-2 text-success"></i>
              <strong>Referenciada por</strong>
              <span class="badge bg-success ms-2">{{ relations()!.incoming.length }}</span>
            </button>
            <div *ngIf="accordionIncoming()" class="px-3 pb-3">
              <div *ngIf="relations()!.incoming.length === 0" class="text-muted small py-2">Sin referencias entrantes</div>
              <div *ngFor="let rel of relations()!.incoming"
                   class="d-flex align-items-center gap-2 mb-2 p-2 rounded border"
                   [class.border-warning]="rel.isMaestra" [class.bg-warning-subtle]="rel.isMaestra"
                   [class.bg-light]="!rel.isMaestra">
                <i class="bi bi-arrow-left text-success"></i>
                <div class="flex-grow-1">
                  <a class="fw-semibold text-decoration-none" [routerLink]="['/table', rel.referencingTable]" style="cursor: pointer;">
                    {{ rel.referencingTable }}
                  </a>
                  <span *ngIf="rel.isMaestra" class="badge bg-warning text-dark ms-1" style="font-size: 0.65rem;">Maestra</span>
                  <br>
                  <small class="text-muted">{{ rel.referencingColumn }} → {{ rel.column }}</small>
                </div>
                <span class="badge rounded-pill"
                      [class.bg-success]="rel.rowCount > 0" [class.bg-secondary]="rel.rowCount === 0"
                      [class.bg-danger]="rel.rowCount < 0">
                  <i class="bi me-1" [class.bi-check-circle]="rel.rowCount > 0" [class.bi-x-circle]="rel.rowCount === 0"
                     [class.bi-exclamation-triangle]="rel.rowCount < 0"></i>
                  {{ rel.rowCount < 0 ? 'Error' : (rel.rowCount | number) + ' reg.' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div *ngIf="showRelations() && !relations()" class="text-center py-3">
        <div class="spinner-border spinner-border-sm text-info"></div>
        <span class="text-muted ms-2">Cargando relaciones...</span>
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
        <button class="btn btn-outline-secondary" (click)="showColumnFilters.set(!showColumnFilters())" [class.active]="showColumnFilters()" title="Filtros por columna">
          <i class="bi bi-funnel"></i>
        </button>
        <div class="input-group" style="width: auto; min-width: 220px;">
          <span class="input-group-text"><i class="bi bi-list-ol"></i> Límite</span>
          <select class="form-select" [ngModel]="recordLimit()" (ngModelChange)="changeLimit($event)">
            <option *ngFor="let opt of limitOptions" [ngValue]="opt">{{ opt === 0 ? 'Todos' : opt }}</option>
          </select>
        </div>
      </div>

      <!-- Table -->
      <div *ngIf="!isLoading() && tableData()" class="card shadow-sm" style="max-width: 100%; overflow: hidden;">
        <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
          <span><i class="bi bi-grid-3x3 me-2"></i>{{ filteredRows().length }} registros</span>
          <span class="badge bg-primary">{{ tableData()!.columnas.length }} columnas</span>
        </div>
        <div class="table-responsive" style="max-height: 65vh; overflow: auto;">
          <table class="table table-hover table-striped table-sm mb-0" style="min-width: max-content;">
            <thead class="table-dark" style="position: sticky; top: 0; z-index: 1;">
              <tr>
                <th *ngIf="isTableMode()" style="width: 100px">Acciones</th>
                <th *ngFor="let col of tableData()!.columnas" style="white-space: nowrap">
                  {{ col.descripcion }}
                  <i *ngIf="primaryKeys().includes(col.id)" class="bi bi-key-fill text-warning ms-1" title="Primary Key"></i>
                </th>
              </tr>
              <tr *ngIf="showColumnFilters()">
                <th *ngIf="isTableMode()"></th>
                <th *ngFor="let col of tableData()!.columnas" style="padding: 2px 4px;">
                  <input class="col-filter-input" type="text" [placeholder]="'Filtrar...'"
                         [ngModel]="columnFilters()[col.id] || ''"
                         (ngModelChange)="setColumnFilter(col.id, $event)">
                </th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of paginatedRows()" (click)="openDetailPanel(row)" style="cursor: pointer;" [class.table-active]="detailRow() === row">
                <td *ngIf="isTableMode()" style="white-space: nowrap" (click)="$event.stopPropagation()">
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
            <div *ngFor="let col of modalColumns(); let i = index" class="mb-3">
              <label class="form-label fw-semibold" [for]="'field-' + i">
                {{ col.name }}
                <span *ngIf="col.isPrimaryKey" class="badge bg-warning text-dark ms-1">PK</span>
                <span *ngIf="col.isIdentity" class="badge bg-info text-dark ms-1">Identity</span>
                <small class="text-muted ms-1">({{ col.type }}<span *ngIf="col.maxLength"> {{ col.maxLength }}</span>)</small>
              </label>
              <input [id]="'field-' + i" class="form-control"
                     [type]="getInputType(col.type)"
                     [ngModel]="formData[col.name]"
                     (ngModelChange)="formData[col.name] = $event"
                     [disabled]="(modalMode() === 'edit' && col.isPrimaryKey) || col.isIdentity || col.isComputed"
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

    <!-- Detail Panel Slide-in -->
    <div class="detail-panel-backdrop" *ngIf="detailRow()" (click)="closeDetailPanel()"></div>
    <div class="detail-panel" *ngIf="detailRow()" [class.open]="detailRow()">
      <div class="detail-panel-header">
        <h5 class="mb-0"><i class="bi bi-card-text me-2"></i>Detalle del registro</h5>
        <div class="d-flex gap-2 align-items-center">
          <button *ngIf="isTableMode()" class="btn btn-sm btn-outline-warning" (click)="openEditModal(detailRow()!); closeDetailPanel()" title="Editar">
            <i class="bi bi-pencil"></i>
          </button>
          <button *ngIf="isTableMode()" class="btn btn-sm btn-outline-danger" (click)="confirmDelete(detailRow()!); closeDetailPanel()" title="Eliminar">
            <i class="bi bi-trash"></i>
          </button>
          <button class="btn btn-sm btn-outline-secondary" (click)="closeDetailPanel()">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>
      <div class="detail-panel-body">
        <div *ngFor="let col of tableData()!.columnas" class="detail-field">
          <div class="detail-field-label">
            {{ col.descripcion }}
            <i *ngIf="primaryKeys().includes(col.id)" class="bi bi-key-fill text-warning ms-1"></i>
          </div>
          <div class="detail-field-value">{{ detailRow()![col.id] ?? '—' }}</div>
        </div>
      </div>
    </div>
  `
})
export class ListTableDynamicComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private apiService = inject(ApiViewerService);
  private prefs = inject(PreferencesService);

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

  // Column filters
  showColumnFilters = signal(false);
  columnFilters = signal<Record<string, string>>({});

  // Detail panel
  detailRow = signal<any>(null);

  // Favorites
  isFavorite = signal(false);

  // Record limit
  recordLimit = signal(100);
  limitOptions = [50, 100, 250, 500, 1000, 0];

  // Primary keys
  primaryKeys = signal<string[]>([]);
  columnsMetadata = signal<any[]>([]);

  // Columns visible in modal (exclude identity/computed/timestamp in create mode)
  modalColumns = computed(() => {
    const cols = this.columnsMetadata();
    const mode = this.modalMode();
    return cols.filter((c: any) => {
      // Always exclude timestamp columns
      if ((c.type || '').toLowerCase() === 'timestamp') return false;
      // In create mode, hide identity and computed columns
      if (mode === 'create' && (c.isIdentity || c.isComputed)) return false;
      return true;
    });
  });

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

  // Export
  isExporting = signal(false);

  // Relations
  showRelations = signal(false);
  relations = signal<any>(null);
  accordionOutgoing = signal(true);
  accordionIncoming = signal(false);

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
        this.showRelations.set(false);
        this.relations.set(null);
        this.detailRow.set(null);
        this.columnFilters.set({});

        // Load saved preferences for this table
        if (this.isTableMode()) {
          const saved = this.prefs.getTablePrefs(endpoint);
          if (saved.recordLimit !== undefined) this.recordLimit.set(saved.recordLimit);
          if (saved.pageSize !== undefined) this.pageSize = saved.pageSize;
          this.isFavorite.set(this.prefs.isFavorite(endpoint));
        }

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
    // Load real column metadata from backend
    this.apiService.getTableColumns(tableName).subscribe({
      next: (res) => {
        const columns = res.columns || [];
        const pks = columns.filter((c: any) => c.isPrimaryKey).map((c: any) => c.name);
        this.primaryKeys.set(pks);
        this.columnsMetadata.set(columns.map((c: any) => ({
          name: c.name,
          type: c.type,
          nullable: c.nullable,
          isPrimaryKey: c.isPrimaryKey,
          isIdentity: c.isIdentity,
          isComputed: c.isComputed,
          maxLength: c.maxLength
        })));
      },
      error: () => {
        // Fallback: infer from data
        this.buildColumnsFromTableData([]);
        this.apiService.getTablePrimaryKeys(tableName).subscribe({
          next: (res) => {
            const pks = res.primaryKeys || [];
            this.primaryKeys.set(pks);
            this.buildColumnsFromTableData(pks);
          },
          error: () => this.primaryKeys.set([])
        });
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

    // Global search filter
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      rows = rows.filter((r: any) => Object.values(r).some(v => String(v ?? '').toLowerCase().includes(term)));
    }

    // Column-specific filters
    const colFilters = this.columnFilters();
    const activeFilters = Object.entries(colFilters).filter(([, v]) => v.trim());
    if (activeFilters.length > 0) {
      rows = rows.filter((r: any) =>
        activeFilters.every(([col, term]) =>
          String(r[col] ?? '').toLowerCase().includes(term.toLowerCase())
        )
      );
    }

    this.filteredRows.set(rows);
    this.currentPage.set(0);
  }

  setColumnFilter(colId: string, value: string) {
    const current = { ...this.columnFilters() };
    if (value) {
      current[colId] = value;
    } else {
      delete current[colId];
    }
    this.columnFilters.set(current);
    this.filterData();
  }

  changeLimit(value: number) {
    this.recordLimit.set(value);
    if (this.isTableMode()) {
      this.prefs.setTablePrefs(this.currentEndpoint, { recordLimit: value });
    }
    this.cargarDatos(this.currentEndpoint);
  }

  // --- Favorites ---

  toggleFavorite() {
    const added = this.prefs.toggleFavorite(this.currentEndpoint);
    this.isFavorite.set(added);
  }

  // --- Detail Panel ---

  openDetailPanel(row: any) {
    this.detailRow.set(row);
  }

  closeDetailPanel() {
    this.detailRow.set(null);
  }

  // --- CRUD Modal ---

  openCreateModal() {
    this.modalMode.set('create');
    this.modalError.set('');
    this.formData = {};
    // Only initialize editable columns (not identity/computed/timestamp)
    this.modalColumns().forEach(c => this.formData[c.name] = '');
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

    // Build set of non-editable column names
    const excludedCols = new Set(
      this.columnsMetadata()
        .filter((c: any) => c.isIdentity || c.isComputed || (c.type || '').toLowerCase() === 'timestamp')
        .map((c: any) => c.name)
    );

    // Filter out empty values and excluded columns
    const payload: Record<string, any> = {};
    Object.entries(this.formData).forEach(([k, v]) => {
      if (!excludedCols.has(k) && v !== '' && v !== null && v !== undefined) payload[k] = v;
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

  // --- Export CSV ---
  exportCsv() {
    this.isExporting.set(true);
    this.apiService.exportCsv(this.currentEndpoint).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentEndpoint}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.isExporting.set(false);
        this.successMsg.set('Archivo CSV descargado');
      },
      error: () => {
        this.isExporting.set(false);
        this.error.set('Error al exportar CSV');
      }
    });
  }

  // --- Relations ---
  toggleRelations() {
    if (this.showRelations()) {
      this.showRelations.set(false);
      return;
    }
    this.showRelations.set(true);
    if (!this.relations()) {
      this.apiService.getTableRelations(this.currentEndpoint).subscribe({
        next: (res) => this.relations.set(res),
        error: () => this.relations.set({ outgoing: [], incoming: [] })
      });
    }
  }

  volver() {
    this.location.back();
  }
}
