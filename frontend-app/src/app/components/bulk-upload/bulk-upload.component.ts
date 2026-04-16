import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiViewerService } from '../../services/api-viewer.service';

interface ColumnMapping {
  fileHeader: string;
  tableColumn: string; // '' = sin mapear
}

@Component({
  selector: 'app-bulk-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container-fluid py-4" style="max-width: 1100px;">
      <!-- Header -->
      <div class="d-flex align-items-center mb-4 gap-3">
        <a routerLink="/tables" class="btn btn-outline-secondary">
          <i class="bi bi-arrow-left me-1"></i>Volver
        </a>
        <div>
          <h2 class="mb-0"><i class="bi bi-cloud-arrow-up me-2"></i>Carga Masiva de Datos</h2>
          <small class="text-muted">Importar datos desde CSV o Excel</small>
        </div>
      </div>

      <!-- Stepper -->
      <div class="d-flex align-items-center mb-4 gap-2">
        <div *ngFor="let s of steps; let i = index" class="d-flex align-items-center">
          <div class="step-circle" [class.active]="currentStep() === i" [class.completed]="currentStep() > i">
            <i *ngIf="currentStep() > i" class="bi bi-check-lg"></i>
            <span *ngIf="currentStep() <= i">{{ i + 1 }}</span>
          </div>
          <span class="step-label" [class.fw-semibold]="currentStep() === i">{{ s }}</span>
          <i *ngIf="i < steps.length - 1" class="bi bi-chevron-right text-muted mx-2"></i>
        </div>
      </div>

      <!-- Step 0: Select Table & Upload File -->
      <div *ngIf="currentStep() === 0" class="card shadow-sm">
        <div class="card-header bg-primary text-white">
          <i class="bi bi-upload me-2"></i>Paso 1: Seleccionar tabla y subir archivo
        </div>
        <div class="card-body">
          <!-- Table selection -->
          <div class="mb-4">
            <label class="form-label fw-semibold">Tabla destino</label>
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-table"></i></span>
              <input type="text" class="form-control" placeholder="Buscar tabla..."
                     [(ngModel)]="tableSearch" (input)="filterTables()">
            </div>
            <div *ngIf="filteredTables().length > 0 && !selectedTable()" class="list-group mt-1"
                 style="max-height: 200px; overflow-y: auto; position: absolute; z-index: 100; width: calc(100% - 2rem);">
              <button *ngFor="let t of filteredTables().slice(0, 20)" class="list-group-item list-group-item-action py-1 small"
                      (click)="selectTable(t)">
                {{ t }}
              </button>
            </div>
            <div *ngIf="selectedTable()" class="mt-2">
              <span class="badge bg-success fs-6 px-3 py-2">
                <i class="bi bi-table me-1"></i>{{ selectedTable() }}
                <button class="btn btn-sm btn-close btn-close-white ms-2" (click)="clearTable()" style="font-size: 0.5rem;"></button>
              </span>
              <button class="btn btn-sm btn-outline-secondary ms-2" (click)="downloadTemplate()">
                <i class="bi bi-download me-1"></i>Descargar plantilla CSV
              </button>
            </div>
          </div>

          <!-- File upload -->
          <div *ngIf="selectedTable()">
            <label class="form-label fw-semibold">Archivo (CSV o Excel)</label>
            <div class="upload-zone" (dragover)="$event.preventDefault()" (drop)="onFileDrop($event)"
                 (click)="fileInput.click()" [class.has-file]="uploadedFile()">
              <input #fileInput type="file" accept=".csv,.xlsx,.xls" (change)="onFileSelect($event)" hidden>
              <div *ngIf="!uploadedFile()" class="text-center py-4">
                <i class="bi bi-cloud-arrow-up display-4 text-muted"></i>
                <p class="text-muted mb-0 mt-2">Arrastra un archivo aquí o haz clic para seleccionar</p>
                <small class="text-muted">Formatos: CSV, Excel (.xlsx, .xls) — Máx. 50MB</small>
              </div>
              <div *ngIf="uploadedFile()" class="text-center py-3">
                <i class="bi bi-file-earmark-check display-4 text-success"></i>
                <p class="fw-semibold mb-0 mt-2">{{ uploadedFile()!.name }}</p>
                <small class="text-muted">{{ (uploadedFile()!.size / 1024).toFixed(1) }} KB</small>
              </div>
            </div>
          </div>

          <!-- Parse button -->
          <div class="mt-4 d-flex justify-content-end">
            <button class="btn btn-primary" [disabled]="!selectedTable() || !uploadedFile() || isParsing()"
                    (click)="parseFile()">
              <span *ngIf="isParsing()" class="spinner-border spinner-border-sm me-1"></span>
              <i *ngIf="!isParsing()" class="bi bi-arrow-right me-1"></i>
              {{ isParsing() ? 'Procesando...' : 'Continuar' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Step 1: Column Mapping -->
      <div *ngIf="currentStep() === 1" class="card shadow-sm">
        <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <span><i class="bi bi-arrows-angle-expand me-2"></i>Paso 2: Mapeo de columnas</span>
          <span class="badge bg-light text-dark">{{ parseResult()!.totalRows }} filas detectadas</span>
        </div>
        <div class="card-body">
          <p class="text-muted mb-3">
            Asigna cada columna del archivo a una columna de la tabla. Las columnas con
            <i class="bi bi-check-circle-fill text-success"></i> fueron auto-mapeadas.
          </p>

          <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
            <table class="table table-sm table-bordered">
              <thead class="table-light" style="position: sticky; top: 0; z-index: 1;">
                <tr>
                  <th>Columna del archivo</th>
                  <th>→</th>
                  <th>Columna de la tabla</th>
                  <th>Tipo</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let m of columnMappings(); let i = index">
                  <td>
                    <code>{{ m.fileHeader }}</code>
                  </td>
                  <td class="text-center">
                    <i class="bi" [class.bi-check-circle-fill]="m.tableColumn" [class.text-success]="m.tableColumn"
                       [class.bi-dash-circle]="!m.tableColumn" [class.text-muted]="!m.tableColumn"></i>
                  </td>
                  <td>
                    <select class="form-select form-select-sm" [ngModel]="m.tableColumn"
                            (ngModelChange)="updateMapping(i, $event)">
                      <option value="">-- Sin mapear --</option>
                      <option *ngFor="let col of parseResult()!.tableColumns" [value]="col.name">
                        {{ col.name }} ({{ col.type }}){{ col.nullable ? '' : ' *' }}
                      </option>
                    </select>
                  </td>
                  <td>
                    <small class="text-muted" *ngIf="getColumnType(m.tableColumn)">{{ getColumnType(m.tableColumn) }}</small>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Preview -->
          <div class="mt-3">
            <h6><i class="bi bi-eye me-1"></i>Vista previa (primeras filas)</h6>
            <div class="table-responsive" style="max-height: 200px; overflow: auto;">
              <table class="table table-sm table-striped small" style="min-width: max-content;">
                <thead class="table-dark">
                  <tr>
                    <th *ngFor="let h of parseResult()!.fileHeaders">{{ h }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let row of parseResult()!.preview">
                    <td *ngFor="let h of parseResult()!.fileHeaders" style="white-space: nowrap;">{{ row[h] }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="mt-4 d-flex justify-content-between">
            <button class="btn btn-outline-secondary" (click)="currentStep.set(0)">
              <i class="bi bi-arrow-left me-1"></i>Atrás
            </button>
            <button class="btn btn-primary" [disabled]="mappedCount() === 0" (click)="validateData()">
              <span *ngIf="isValidating()" class="spinner-border spinner-border-sm me-1"></span>
              <i *ngIf="!isValidating()" class="bi bi-arrow-right me-1"></i>
              {{ isValidating() ? 'Validando...' : 'Validar datos' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Step 2: Validate -->
      <div *ngIf="currentStep() === 2" class="card shadow-sm">
        <div class="card-header bg-primary text-white">
          <i class="bi bi-shield-check me-2"></i>Paso 3: Validación
        </div>
        <div class="card-body">
          <div class="row mb-3">
            <div class="col-md-4">
              <div class="card border-success">
                <div class="card-body text-center">
                  <h3 class="text-success mb-0">{{ validationResult()!.validCount }}</h3>
                  <small class="text-muted">Filas válidas</small>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card border-danger">
                <div class="card-body text-center">
                  <h3 class="text-danger mb-0">{{ validationResult()!.errorCount }}</h3>
                  <small class="text-muted">Errores</small>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card border-primary">
                <div class="card-body text-center">
                  <h3 class="text-primary mb-0">{{ validationResult()!.totalRows }}</h3>
                  <small class="text-muted">Total filas</small>
                </div>
              </div>
            </div>
          </div>

          <!-- Validation errors -->
          <div *ngIf="validationResult()!.errors.length > 0" class="mb-3">
            <h6 class="text-danger"><i class="bi bi-exclamation-triangle me-1"></i>Errores de validación</h6>
            <div class="table-responsive" style="max-height: 200px; overflow-y: auto;">
              <table class="table table-sm table-bordered small">
                <thead class="table-danger">
                  <tr><th>Fila</th><th>Columna</th><th>Valor</th><th>Error</th></tr>
                </thead>
                <tbody>
                  <tr *ngFor="let e of validationResult()!.errors">
                    <td>{{ e.row }}</td>
                    <td><code>{{ e.column }}</code></td>
                    <td>{{ e.value }}</td>
                    <td>{{ e.message }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Preview valid data -->
          <div *ngIf="validationResult()!.preview.length > 0">
            <h6><i class="bi bi-eye me-1"></i>Vista previa datos válidos</h6>
            <div class="table-responsive" style="max-height: 200px; overflow: auto;">
              <table class="table table-sm table-striped small" style="min-width: max-content;">
                <thead class="table-dark">
                  <tr>
                    <th *ngFor="let col of validationPreviewCols()">{{ col }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let row of validationResult()!.preview">
                    <td *ngFor="let col of validationPreviewCols()" style="white-space: nowrap;">{{ row[col] }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div *ngIf="validationResult()!.validCount === 0" class="alert alert-danger mt-3">
            <i class="bi bi-exclamation-octagon me-2"></i>No hay filas válidas para insertar. Corrige los errores y vuelve a intentar.
          </div>

          <div class="mt-4 d-flex justify-content-between">
            <button class="btn btn-outline-secondary" (click)="currentStep.set(1)">
              <i class="bi bi-arrow-left me-1"></i>Atrás
            </button>
            <button class="btn btn-success btn-lg" [disabled]="validationResult()!.validCount === 0 || isExecuting()"
                    (click)="executeBulk()">
              <span *ngIf="isExecuting()" class="spinner-border spinner-border-sm me-1"></span>
              <i *ngIf="!isExecuting()" class="bi bi-cloud-arrow-up me-1"></i>
              {{ isExecuting() ? 'Insertando...' : 'Ejecutar carga (' + validationResult()!.validCount + ' filas)' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Step 3: Results -->
      <div *ngIf="currentStep() === 3" class="card shadow-sm">
        <div class="card-header" [class.bg-success]="executeResult()!.errors === 0" [class.bg-warning]="executeResult()!.errors > 0" [class.text-white]="executeResult()!.errors === 0">
          <i class="bi me-2" [class.bi-check-circle-fill]="executeResult()!.errors === 0" [class.bi-exclamation-triangle-fill]="executeResult()!.errors > 0"></i>
          Paso 4: Resultado
        </div>
        <div class="card-body">
          <div class="row mb-4">
            <div class="col-md-4">
              <div class="card border-success">
                <div class="card-body text-center">
                  <h2 class="text-success mb-0">{{ executeResult()!.inserted }}</h2>
                  <small class="text-muted">Insertados</small>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card border-danger">
                <div class="card-body text-center">
                  <h2 class="text-danger mb-0">{{ executeResult()!.errors }}</h2>
                  <small class="text-muted">Rechazados</small>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card border-info">
                <div class="card-body text-center">
                  <h2 class="text-info mb-0">{{ executeResult()!.total }}</h2>
                  <small class="text-muted">Total procesados</small>
                </div>
              </div>
            </div>
          </div>

          <!-- Rejected rows -->
          <div *ngIf="executeResult()!.rejectedRows.length > 0">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h6 class="text-danger mb-0"><i class="bi bi-x-circle me-1"></i>Filas rechazadas</h6>
              <button class="btn btn-sm btn-outline-danger" (click)="downloadRejected()">
                <i class="bi bi-download me-1"></i>Descargar rechazados (CSV)
              </button>
            </div>
            <div class="table-responsive" style="max-height: 250px; overflow-y: auto;">
              <table class="table table-sm table-bordered small">
                <thead class="table-danger">
                  <tr><th>Fila</th><th>Error</th><th>Datos</th></tr>
                </thead>
                <tbody>
                  <tr *ngFor="let r of executeResult()!.rejectedRows.slice(0, 50)">
                    <td>{{ r.row }}</td>
                    <td class="text-danger">{{ r.error }}</td>
                    <td><small>{{ r.data | json }}</small></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="mt-4 d-flex justify-content-between">
            <button class="btn btn-outline-secondary" (click)="reset()">
              <i class="bi bi-arrow-repeat me-1"></i>Nueva carga
            </button>
            <a *ngIf="selectedTable()" class="btn btn-primary" [routerLink]="['/table', selectedTable()]">
              <i class="bi bi-table me-1"></i>Ver tabla {{ selectedTable() }}
            </a>
          </div>
        </div>
      </div>

      <!-- Error alert -->
      <div *ngIf="errorMsg()" class="alert alert-danger mt-3 alert-dismissible">
        <i class="bi bi-exclamation-triangle me-2"></i>{{ errorMsg() }}
        <button type="button" class="btn-close" (click)="errorMsg.set('')"></button>
      </div>
    </div>
  `,
  styles: [`
    .step-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: 600;
      border: 2px solid #dee2e6;
      color: #6c757d;
      margin-right: 6px;
      flex-shrink: 0;
    }
    .step-circle.active {
      border-color: #0d6efd;
      background: #0d6efd;
      color: white;
    }
    .step-circle.completed {
      border-color: #198754;
      background: #198754;
      color: white;
    }
    .step-label {
      font-size: 0.85rem;
      color: #495057;
      white-space: nowrap;
    }
    .upload-zone {
      border: 2px dashed #dee2e6;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
      padding: 8px;
    }
    .upload-zone:hover {
      border-color: #0d6efd;
      background: rgba(13,110,253,0.03);
    }
    .upload-zone.has-file {
      border-color: #198754;
      border-style: solid;
      background: rgba(25,135,84,0.03);
    }
  `]
})
export class BulkUploadComponent implements OnInit {
  private api = inject(ApiViewerService);

  steps = ['Subir archivo', 'Mapear columnas', 'Validar', 'Resultado'];
  currentStep = signal(0);

  // Step 0
  allTables = signal<string[]>([]);
  filteredTables = signal<string[]>([]);
  tableSearch = '';
  selectedTable = signal<string>('');
  uploadedFile = signal<File | null>(null);
  isParsing = signal(false);

  // Step 1
  parseResult = signal<any>(null);
  columnMappings = signal<ColumnMapping[]>([]);
  isValidating = signal(false);

  // Step 2
  validationResult = signal<any>(null);
  validationPreviewCols = computed(() => {
    const vr = this.validationResult();
    if (!vr?.preview?.length) return [];
    return Object.keys(vr.preview[0]);
  });
  isExecuting = signal(false);

  // Step 3
  executeResult = signal<any>(null);

  // General
  errorMsg = signal('');

  mappedCount = computed(() =>
    this.columnMappings().filter(m => m.tableColumn).length
  );

  ngOnInit() {
    this.api.getAllTables().subscribe({
      next: (res) => {
        const tables = (res.tables || res || []).map((t: any) => t.tableName || t.name || t);
        this.allTables.set(tables);
      },
      error: () => this.allTables.set([])
    });
  }

  filterTables() {
    if (!this.tableSearch || this.tableSearch.length < 2) {
      this.filteredTables.set([]);
      return;
    }
    const term = this.tableSearch.toLowerCase();
    this.filteredTables.set(
      this.allTables().filter(t => t.toLowerCase().includes(term)).slice(0, 30)
    );
  }

  selectTable(table: string) {
    this.selectedTable.set(table);
    this.tableSearch = table;
    this.filteredTables.set([]);
  }

  clearTable() {
    this.selectedTable.set('');
    this.tableSearch = '';
    this.uploadedFile.set(null);
  }

  downloadTemplate() {
    this.api.bulkUploadTemplate(this.selectedTable()).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `plantilla_${this.selectedTable()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.errorMsg.set('Error al descargar plantilla')
    });
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.uploadedFile.set(input.files[0]);
    }
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      const ext = file.name.toLowerCase().split('.').pop();
      if (['csv', 'xlsx', 'xls'].includes(ext || '')) {
        this.uploadedFile.set(file);
      } else {
        this.errorMsg.set('Formato no soportado. Use CSV o Excel (.xlsx/.xls)');
      }
    }
  }

  parseFile() {
    const table = this.selectedTable();
    const file = this.uploadedFile();
    if (!table || !file) return;

    this.isParsing.set(true);
    this.errorMsg.set('');

    this.api.bulkUploadParse(table, file).subscribe({
      next: (res) => {
        this.parseResult.set(res);

        // Build column mappings from suggested mapping
        const mappings: ColumnMapping[] = res.fileHeaders.map((fh: string) => ({
          fileHeader: fh,
          tableColumn: res.suggestedMapping[fh] || '',
        }));
        this.columnMappings.set(mappings);

        this.isParsing.set(false);
        this.currentStep.set(1);
      },
      error: (err) => {
        this.isParsing.set(false);
        this.errorMsg.set(err.error?.message || 'Error al procesar archivo');
      }
    });
  }

  updateMapping(index: number, value: string) {
    const current = [...this.columnMappings()];
    current[index] = { ...current[index], tableColumn: value };
    this.columnMappings.set(current);
  }

  getColumnType(colName: string): string {
    if (!colName || !this.parseResult()) return '';
    const col = this.parseResult().tableColumns.find((c: any) => c.name === colName);
    return col ? `${col.type}${col.nullable ? '' : ' *'}` : '';
  }

  validateData() {
    const table = this.selectedTable();
    const file = this.uploadedFile();
    if (!table || !file) return;

    // Build mapping object
    const mapping: Record<string, string> = {};
    this.columnMappings().forEach(m => {
      if (m.tableColumn) mapping[m.fileHeader] = m.tableColumn;
    });

    this.isValidating.set(true);
    this.errorMsg.set('');

    this.api.bulkUploadValidate(table, file, mapping).subscribe({
      next: (res) => {
        this.validationResult.set(res);
        this.isValidating.set(false);
        this.currentStep.set(2);
      },
      error: (err) => {
        this.isValidating.set(false);
        this.errorMsg.set(err.error?.message || 'Error de validación');
      }
    });
  }

  executeBulk() {
    const table = this.selectedTable();
    const file = this.uploadedFile();
    if (!table || !file) return;

    const mapping: Record<string, string> = {};
    this.columnMappings().forEach(m => {
      if (m.tableColumn) mapping[m.fileHeader] = m.tableColumn;
    });

    this.isExecuting.set(true);
    this.errorMsg.set('');

    this.api.bulkUploadExecute(table, file, mapping).subscribe({
      next: (res) => {
        this.executeResult.set(res);
        this.isExecuting.set(false);
        this.currentStep.set(3);
      },
      error: (err) => {
        this.isExecuting.set(false);
        this.errorMsg.set(err.error?.message || 'Error al ejecutar carga');
      }
    });
  }

  downloadRejected() {
    const res = this.executeResult();
    if (!res?.rejectedRows.length) return;

    const headers = Object.keys(res.rejectedRows[0].data);
    const csvLines = ['Fila,Error,' + headers.join(',')];
    for (const r of res.rejectedRows) {
      const vals = headers.map(h => {
        const v = r.data[h];
        const s = String(v ?? '');
        return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      });
      csvLines.push(`${r.row},"${r.error.replace(/"/g, '""')}",${vals.join(',')}`);
    }

    const blob = new Blob(['\uFEFF' + csvLines.join('\r\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rechazados_${this.selectedTable()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  reset() {
    this.currentStep.set(0);
    this.uploadedFile.set(null);
    this.parseResult.set(null);
    this.columnMappings.set([]);
    this.validationResult.set(null);
    this.executeResult.set(null);
    this.errorMsg.set('');
  }
}
