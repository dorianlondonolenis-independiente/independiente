import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface PreviewRow {
  NIT: string;
  DV?: string;
  TIPO?: string;
  RAZON_SOCIAL?: string;
  APELLIDO1?: string;
  APELLIDO2?: string;
  NOMBRES?: string;
  NOMBRE_COMERCIAL?: string;
  NOMBRE_ESTABLECIMIENTO?: string;
  DIRECCION?: string;
  COD_CIUDAD?: string;
  TELEFONO?: string;
  EMAIL?: string;
  ES_CLIENTE?: string;
  ES_PROVEEDOR?: string;
  ES_EMPLEADO?: string;
}

interface InsertResult {
  totalLeidos: number;
  inserted: number;
  skipped: number;
  errores: string[];
}

@Component({
  selector: 'app-siesa-xml',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid py-4 px-4" style="max-width: 1100px;">
      <!-- Header -->
      <div class="page-header mb-4">
        <h2 class="mb-1"><i class="bi bi-filetype-xml me-2 text-warning"></i>Generador XML Siesa</h2>
        <p class="text-muted mb-0">Crea archivos XML de importación masiva para Siesa UnoEE desde Excel</p>
      </div>

      <!-- Tabs -->
      <ul class="nav nav-tabs mb-4">
        <li class="nav-item">
          <button class="nav-link" [class.active]="tab() === 'terceros'" (click)="tab.set('terceros')">
            <i class="bi bi-people me-1"></i>Terceros
          </button>
        </li>
      </ul>

      <!-- ── TAB TERCEROS ─────────────────────────────────────────────────── -->
      <div *ngIf="tab() === 'terceros'">

        <!-- Paso 1: Descargar plantilla -->
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-body">
            <div class="d-flex align-items-center gap-3">
              <div class="step-badge">1</div>
              <div class="flex-grow-1">
                <h6 class="mb-1 fw-semibold">Descargar plantilla Excel</h6>
                <p class="mb-0 small text-muted">Descarga la plantilla, llénala con los datos de los terceros y súbela en el paso 2.</p>
              </div>
              <button class="btn btn-success" (click)="descargarPlantilla()">
                <i class="bi bi-file-earmark-excel me-1"></i>Descargar Plantilla
              </button>
            </div>
          </div>
        </div>

        <!-- Paso 2: Subir Excel e insertar -->
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-body">
            <div class="d-flex align-items-center gap-3 mb-3">
              <div class="step-badge">2</div>
              <h6 class="mb-0 fw-semibold">Subir Excel e insertar en base de datos</h6>
              <div class="ms-auto d-flex align-items-center gap-2">
                <label class="form-label mb-0 small text-muted">ID Compañía:</label>
                <input type="number" class="form-control form-control-sm" [(ngModel)]="idCia" style="width: 70px;" min="1">
              </div>
            </div>

            <div class="upload-zone" (dragover)="$event.preventDefault()" (drop)="onDrop($event)" (click)="fileInput.click()" [class.has-file]="archivo()">
              <input #fileInput type="file" accept=".xlsx,.xls" (change)="onFileSelect($event)" hidden>
              <div *ngIf="!archivo()" class="text-center py-4">
                <i class="bi bi-cloud-arrow-up display-4 text-muted"></i>
                <p class="mt-2 mb-1 fw-semibold">Arrastra el Excel aquí o haz clic</p>
                <small class="text-muted">.xlsx / .xls — máx 10MB</small>
              </div>
              <div *ngIf="archivo()" class="d-flex align-items-center gap-3 py-2 px-3">
                <i class="bi bi-file-earmark-excel text-success" style="font-size: 2rem;"></i>
                <div>
                  <p class="mb-0 fw-semibold">{{ archivo()!.name }}</p>
                  <small class="text-muted">{{ (archivo()!.size / 1024).toFixed(1) }} KB</small>
                </div>
                <button class="btn btn-sm btn-outline-secondary ms-auto" (click)="$event.stopPropagation(); limpiar()">
                  <i class="bi bi-x-lg"></i>
                </button>
              </div>
            </div>

            <div *ngIf="archivo()" class="mt-3 d-flex gap-2">
              <button class="btn btn-outline-secondary" (click)="previsualizarTerceros()" [disabled]="loadingPreview()">
                <span *ngIf="loadingPreview()" class="spinner-border spinner-border-sm me-1"></span>
                <i *ngIf="!loadingPreview()" class="bi bi-eye me-1"></i>Previsualizar
              </button>
              <button class="btn btn-primary" (click)="insertarEnBd()" [disabled]="loadingInsertar()">
                <span *ngIf="loadingInsertar()" class="spinner-border spinner-border-sm me-1"></span>
                <i *ngIf="!loadingInsertar()" class="bi bi-database-fill-up me-1"></i>Insertar en base de datos
              </button>
            </div>
          </div>
        </div>

        <!-- Errores -->
        <div *ngIf="errores().length > 0" class="alert alert-warning">
          <strong><i class="bi bi-exclamation-triangle me-1"></i>Advertencias ({{ errores().length }}):</strong>
          <ul class="mb-0 mt-1">
            <li *ngFor="let e of errores().slice(0, 10)" class="small">{{ e }}</li>
          </ul>
          <small *ngIf="errores().length > 10" class="text-muted">... y {{ errores().length - 10 }} más</small>
        </div>

        <!-- Resultado inserción -->
        <div *ngIf="insertResult()" class="alert mb-3" [class.alert-success]="insertResult()!.inserted > 0" [class.alert-warning]="insertResult()!.inserted === 0">
          <h6 class="alert-heading mb-2"><i class="bi bi-database-fill-check me-1"></i>Resultado de inserción</h6>
          <div class="d-flex gap-4">
            <div><span class="fw-bold text-success">{{ insertResult()!.inserted }}</span> insertados</div>
            <div><span class="fw-bold text-warning">{{ insertResult()!.skipped }}</span> omitidos (duplicados)</div>
            <div><span class="fw-bold">{{ insertResult()!.totalLeidos }}</span> leídos en total</div>
          </div>
        </div>

        <!-- Preview -->
        <div *ngIf="previewRows().length > 0" class="card border-0 shadow-sm">
          <div class="card-header bg-light fw-semibold">
            <i class="bi bi-table me-1"></i>Previsualización — {{ totalRows() }} registros
            <small class="text-muted ms-2">(mostrando primeros {{ previewRows().length }})</small>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover table-sm mb-0">
                <thead class="table-light">
                  <tr>
                    <th>#</th>
                    <th>NIT</th>
                    <th>Tipo</th>
                    <th>Razón Social</th>
                    <th>Ciudad</th>
                    <th>Teléfono</th>
                    <th>Email</th>
                    <th>Cliente</th>
                    <th>Proveedor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let r of previewRows(); let i = index">
                    <td class="text-muted small">{{ i + 1 }}</td>
                    <td><code>{{ r.NIT }}</code></td>
                    <td>
                      <span class="badge" [class.bg-primary]="r.TIPO === 'J'" [class.bg-success]="r.TIPO === 'N'" [class.bg-secondary]="r.TIPO === 'E'">
                        {{ r.TIPO === 'J' ? 'Jurídico' : r.TIPO === 'N' ? 'Natural' : r.TIPO }}
                      </span>
                    </td>
                    <td>{{ r.RAZON_SOCIAL }}</td>
                    <td>{{ r.COD_CIUDAD }}</td>
                    <td>{{ r.TELEFONO }}</td>
                    <td class="text-truncate" style="max-width: 120px;">{{ r.EMAIL }}</td>
                    <td class="text-center">
                      <i class="bi" [class.bi-check-circle-fill]="r.ES_CLIENTE === '1'" [class.text-success]="r.ES_CLIENTE === '1'" [class.bi-dash-circle]="r.ES_CLIENTE !== '1'" [class.text-muted]="r.ES_CLIENTE !== '1'"></i>
                    </td>
                    <td class="text-center">
                      <i class="bi" [class.bi-check-circle-fill]="r.ES_PROVEEDOR === '1'" [class.text-success]="r.ES_PROVEEDOR === '1'" [class.bi-dash-circle]="r.ES_PROVEEDOR !== '1'" [class.text-muted]="r.ES_PROVEEDOR !== '1'"></i>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div><!-- /tab terceros -->
    </div>
  `,
  styles: [`
    .page-header h2 { font-size: 1.5rem; font-weight: 700; }
    .step-badge {
      width: 32px; height: 32px; border-radius: 50%;
      background: #0d6efd; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 0.9rem; flex-shrink: 0;
    }
    .upload-zone {
      border: 2px dashed #dee2e6; border-radius: 12px;
      cursor: pointer; transition: border-color 0.2s;
    }
    .upload-zone:hover, .upload-zone.has-file { border-color: #0d6efd; }
    th { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.03em; }
    td { font-size: 0.85rem; vertical-align: middle; }
  `]
})
export class SiesaXmlComponent {
  private http = inject(HttpClient);
  private api = 'http://localhost:3000/api/siesa-xml';

  tab = signal<'terceros'>('terceros');
  archivo = signal<File | null>(null);
  loadingPreview = signal(false);
  loadingInsertar = signal(false);
  previewRows = signal<PreviewRow[]>([]);
  totalRows = signal(0);
  errores = signal<string[]>([]);
  insertResult = signal<InsertResult | null>(null);

  idCia = 1;

  descargarPlantilla() {
    const a = document.createElement('a');
    a.href = `${this.api}/terceros/plantilla`;
    a.download = 'Plantilla_Terceros_Siesa.xlsx';
    a.click();
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.archivo.set(input.files[0]);
      this.previewRows.set([]);
      this.errores.set([]);
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.archivo.set(file);
      this.previewRows.set([]);
      this.errores.set([]);
    }
  }

  limpiar() {
    this.archivo.set(null);
    this.previewRows.set([]);
    this.errores.set([]);
    this.totalRows.set(0);
    this.insertResult.set(null);
  }

  previsualizarTerceros() {
    if (!this.archivo()) return;
    this.loadingPreview.set(true);
    const fd = new FormData();
    fd.append('file', this.archivo()!);
    this.http.post<any>(`${this.api}/terceros/preview`, fd).subscribe({
      next: (res) => {
        this.previewRows.set(res.preview || []);
        this.totalRows.set(res.totalRows || 0);
        this.errores.set(res.errors || []);
        this.loadingPreview.set(false);
      },
      error: (err) => {
        this.errores.set([err?.error?.message || 'Error al previsualizar']);
        this.loadingPreview.set(false);
      }
    });
  }

  generarXml() { /* eliminado — usar botón Insertar en BD */ }

  insertarEnBd() {
    if (!this.archivo()) return;
    if (!confirm(`¿Insertar los terceros del Excel directamente en la base de datos Siesa (compañía ${this.idCia})?\n\nEsta operación no se puede deshacer fácilmente.`)) return;

    this.loadingInsertar.set(true);
    this.insertResult.set(null);
    const fd = new FormData();
    fd.append('file', this.archivo()!);

    this.http.post<InsertResult>(`${this.api}/terceros/insertar?idCia=${this.idCia}`, fd).subscribe({
      next: (res) => {
        this.insertResult.set(res);
        this.errores.set(res.errores || []);
        this.loadingInsertar.set(false);
      },
      error: (err) => {
        this.errores.set([err?.error?.message || 'Error al insertar en la base de datos']);
        this.loadingInsertar.set(false);
      }
    });
  }
}
