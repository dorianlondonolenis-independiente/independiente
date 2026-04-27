import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface PreviewRow {
  NIT: string;
  DV?: string;
  TIPO_IDENT?: string;
  TIPO_PERSONA?: string;
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

interface EnvioResult {
  totalLeidos: number;
  enviados: number;
  errores: Array<{ nit: string; status?: number; message: string }>;
}

@Component({
  selector: 'app-siesa-xml',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container-fluid py-4 px-4" style="max-width: 1100px;">

      <!-- Header -->
      <div class="page-header mb-4">
        <h2 class="mb-1"><i class="bi bi-filetype-xml me-2 text-warning"></i>Importador XML Siesa</h2>
        <p class="text-muted mb-0">Importa datos a Siesa UnoEE desde Excel &mdash; BD directa, XML descargable o API Siesa</p>
      </div>

      <!-- Nivel 1: Entidades -->
      <ul class="nav nav-tabs mb-0">
        <li class="nav-item">
          <button class="nav-link" [class.active]="entidad() === 'terceros'" (click)="entidad.set('terceros')">
            <i class="bi bi-people me-1"></i>Terceros
          </button>
        </li>
        <li class="nav-item">
          <a class="nav-link" routerLink="/siesa-xml/comprobantes">
            <i class="bi bi-journal-text me-1"></i>Comprobantes Contables
          </a>
        </li>
        <!-- Aqui se agregan futuras entidades -->
      </ul>

      <!-- Panel de entidad -->
      <div class="card border-0 shadow-sm" style="border-top-left-radius: 0;">

        <!-- Header: descripcion + selector de modo -->
        <div class="card-header bg-white border-bottom d-flex align-items-center flex-wrap gap-2 py-3">
          <div *ngIf="entidad() === 'terceros'">
            <span class="fw-semibold">Maestro de Terceros</span>
            <span class="text-muted ms-2 small">Clientes, proveedores y empleados</span>
          </div>
          <div class="ms-auto">
            <div class="btn-group" role="group">
              <button type="button" class="btn btn-sm"
                [class.btn-primary]="modo() === 'bd'"
                [class.btn-outline-primary]="modo() !== 'bd'"
                (click)="modo.set('bd')">
                <i class="bi bi-database-fill-up me-1"></i>Insertar en BD
              </button>
              <button type="button" class="btn btn-sm"
                [class.btn-success]="modo() === 'xml-descarga'"
                [class.btn-outline-success]="modo() !== 'xml-descarga'"
                (click)="modo.set('xml-descarga')">
                <i class="bi bi-file-earmark-code me-1"></i>Descargar XML
              </button>
              <button type="button" class="btn btn-sm"
                [class.btn-warning]="modo() === 'xml-api'"
                [class.btn-outline-warning]="modo() !== 'xml-api'"
                (click)="modo.set('xml-api')">
                <i class="bi bi-cloud-upload me-1"></i>Enviar al API Siesa
              </button>
            </div>
          </div>
        </div>

        <div class="card-body">

          <!-- Paso 1 comun: Descargar plantilla -->
          <div class="d-flex align-items-center gap-3 p-3 bg-light rounded mb-3">
            <div class="step-badge">1</div>
            <div class="flex-grow-1">
              <h6 class="mb-1 fw-semibold">Descargar plantilla Excel</h6>
              <p class="mb-0 small text-muted">Descarga la plantilla, llenala con los datos y subela abajo.</p>
            </div>
            <button class="btn btn-success btn-sm" (click)="descargarPlantilla()">
              <i class="bi bi-file-earmark-excel me-1"></i>Descargar Plantilla
            </button>
          </div>

          <!-- Zona de upload comun -->
          <div class="upload-zone mb-3"
            (dragover)="$event.preventDefault()"
            (drop)="onDrop($event)"
            (click)="fileInput.click()"
            [class.has-file]="archivo()">
            <input #fileInput type="file" accept=".xlsx,.xls" (change)="onFileSelect($event)" hidden>
            <div *ngIf="!archivo()" class="text-center py-4">
              <i class="bi bi-cloud-arrow-up display-4 text-muted"></i>
              <p class="mt-2 mb-1 fw-semibold">Arrastra el Excel aqui o haz clic</p>
              <small class="text-muted">.xlsx / .xls &mdash; max 10MB</small>
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

          <!-- ── MODO: BD DIRECTA ─────────────────────────────────────────── -->
          <ng-container *ngIf="modo() === 'bd'">
            <div *ngIf="archivo()" class="d-flex align-items-center gap-2 mb-3 flex-wrap">
              <div class="d-flex align-items-center gap-2 me-2">
                <label class="form-label mb-0 small text-muted">ID Compania:</label>
                <input type="number" class="form-control form-control-sm" [(ngModel)]="idCia" style="width: 70px;" min="1">
              </div>
              <button class="btn btn-outline-secondary btn-sm" (click)="previsualizarTerceros()" [disabled]="loadingPreview()">
                <span *ngIf="loadingPreview()" class="spinner-border spinner-border-sm me-1"></span>
                <i *ngIf="!loadingPreview()" class="bi bi-eye me-1"></i>Previsualizar
              </button>
              <button class="btn btn-primary btn-sm" (click)="insertarEnBd()" [disabled]="loadingInsertar()">
                <span *ngIf="loadingInsertar()" class="spinner-border spinner-border-sm me-1"></span>
                <i *ngIf="!loadingInsertar()" class="bi bi-database-fill-up me-1"></i>Insertar en base de datos
              </button>
            </div>

            <div *ngIf="!archivo()" class="text-muted small fst-italic mb-2">
              Sube un Excel en la zona de arriba para continuar.
            </div>

            <!-- Errores parse -->
            <div *ngIf="errores().length > 0" class="alert alert-warning py-2">
              <strong><i class="bi bi-exclamation-triangle me-1"></i>Advertencias ({{ errores().length }}):</strong>
              <ul class="mb-0 mt-1">
                <li *ngFor="let e of errores().slice(0, 10)" class="small">{{ e }}</li>
              </ul>
              <small *ngIf="errores().length > 10" class="text-muted">... y {{ errores().length - 10 }} mas</small>
            </div>

            <!-- Resultado insercion -->
            <div *ngIf="insertResult()" class="alert mb-3"
              [class.alert-success]="insertResult()!.inserted > 0"
              [class.alert-warning]="insertResult()!.inserted === 0">
              <h6 class="alert-heading mb-2"><i class="bi bi-database-fill-check me-1"></i>Resultado de insercion</h6>
              <div class="d-flex gap-4">
                <div><span class="fw-bold text-success">{{ insertResult()!.inserted }}</span> insertados</div>
                <div><span class="fw-bold text-warning">{{ insertResult()!.skipped }}</span> omitidos (duplicados)</div>
                <div><span class="fw-bold">{{ insertResult()!.totalLeidos }}</span> leidos en total</div>
              </div>
            </div>

            <!-- Preview table -->
            <div *ngIf="previewRows().length > 0" class="card border-0 shadow-sm">
              <div class="card-header bg-light fw-semibold">
                <i class="bi bi-table me-1"></i>Previsualizacion &mdash; {{ totalRows() }} registros
                <small class="text-muted ms-2">(mostrando primeros {{ previewRows().length }})</small>
              </div>
              <div class="card-body p-0">
                <div class="table-responsive">
                  <table class="table table-hover table-sm mb-0">
                    <thead class="table-light">
                      <tr>
                        <th>#</th><th>NIT</th><th>T.Ident</th><th>Persona</th>
                        <th>Razon Social</th><th>Ciudad</th><th>Telefono</th><th>Email</th>
                        <th>Cli</th><th>Prov</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let r of previewRows(); let i = index">
                        <td class="text-muted small">{{ i + 1 }}</td>
                        <td><code>{{ r.NIT }}</code></td>
                        <td><span class="badge bg-secondary">{{ r.TIPO_IDENT }}</span></td>
                        <td>
                          <span class="badge"
                            [class.bg-primary]="r.TIPO_PERSONA === 'J'"
                            [class.bg-success]="r.TIPO_PERSONA === 'N'"
                            [class.bg-info]="r.TIPO_PERSONA === 'E'">
                            {{ r.TIPO_PERSONA === 'J' ? 'Juridico' : r.TIPO_PERSONA === 'N' ? 'Natural' : r.TIPO_PERSONA === 'E' ? 'Extranjero' : r.TIPO_PERSONA }}
                          </span>
                        </td>
                        <td>{{ r.RAZON_SOCIAL }}</td>
                        <td>{{ r.COD_CIUDAD }}</td>
                        <td>{{ r.TELEFONO }}</td>
                        <td class="text-truncate" style="max-width: 120px;">{{ r.EMAIL }}</td>
                        <td class="text-center">
                          <i class="bi"
                            [class.bi-check-circle-fill]="r.ES_CLIENTE === '1'" [class.text-success]="r.ES_CLIENTE === '1'"
                            [class.bi-dash-circle]="r.ES_CLIENTE !== '1'" [class.text-muted]="r.ES_CLIENTE !== '1'"></i>
                        </td>
                        <td class="text-center">
                          <i class="bi"
                            [class.bi-check-circle-fill]="r.ES_PROVEEDOR === '1'" [class.text-success]="r.ES_PROVEEDOR === '1'"
                            [class.bi-dash-circle]="r.ES_PROVEEDOR !== '1'" [class.text-muted]="r.ES_PROVEEDOR !== '1'"></i>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </ng-container>
          <!-- /modo bd -->

          <!-- ── MODO: DESCARGAR XML ──────────────────────────────────────── -->
          <ng-container *ngIf="modo() === 'xml-descarga'">
            <div class="row g-3 mb-3 p-3 bg-light rounded">
              <div class="col-12">
                <h6 class="fw-semibold mb-0"><i class="bi bi-sliders me-1"></i>Parametros del XML</h6>
                <small class="text-muted">Estos datos van en el encabezado del archivo XML generado.</small>
              </div>
              <div class="col-md-4">
                <label class="form-label small fw-semibold">Nombre Conexion</label>
                <input type="text" class="form-control form-control-sm" [(ngModel)]="xmlConexion" placeholder="SQL-NEO" />
              </div>
              <div class="col-md-2">
                <label class="form-label small fw-semibold">ID Compania</label>
                <input type="number" class="form-control form-control-sm" [(ngModel)]="xmlIdCia" min="1" />
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-semibold">Usuario</label>
                <input type="text" class="form-control form-control-sm" [(ngModel)]="xmlUsuario" placeholder="jairc" />
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-semibold">Clave</label>
                <input type="password" class="form-control form-control-sm" [(ngModel)]="xmlClave" />
              </div>
            </div>

            <div *ngIf="archivo()" class="mb-3">
              <button class="btn btn-success btn-sm" (click)="descargarXml()" [disabled]="loadingXml()">
                <span *ngIf="loadingXml()" class="spinner-border spinner-border-sm me-1"></span>
                <i *ngIf="!loadingXml()" class="bi bi-file-earmark-code me-1"></i>Generar y Descargar XML
              </button>
              <small class="text-muted ms-3">Genera el XML listo para importar manualmente en Siesa.</small>
            </div>

            <div *ngIf="!archivo()" class="text-muted small fst-italic">
              Sube un Excel en la zona de arriba para generar el XML.
            </div>
          </ng-container>
          <!-- /modo xml-descarga -->

          <!-- ── MODO: ENVIO XML AL API SIESA ────────────────────────────── -->
          <ng-container *ngIf="modo() === 'xml-api'">
            <div class="row g-3 mb-3 p-3 bg-light rounded">
              <div class="col-12">
                <h6 class="fw-semibold mb-0"><i class="bi bi-plug me-1"></i>Conexion API Siesa</h6>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">URL del API <span class="text-danger">*</span></label>
                <input type="url" class="form-control form-control-sm" [(ngModel)]="envioUrl" placeholder="http://servidor/SiesaImport/..." />
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-semibold">Nombre Conexion <span class="text-danger">*</span></label>
                <input type="text" class="form-control form-control-sm" [(ngModel)]="envioNombreConexion" placeholder="SQL-NEO" />
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-semibold">ID Compania</label>
                <input type="number" class="form-control form-control-sm" [(ngModel)]="envioIdCia" min="1" />
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-semibold">Usuario <span class="text-danger">*</span></label>
                <input type="text" class="form-control form-control-sm" [(ngModel)]="envioUsuario" placeholder="jairc" />
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-semibold">Clave <span class="text-danger">*</span></label>
                <input type="password" class="form-control form-control-sm" [(ngModel)]="envioClave" />
              </div>
            </div>

            <div *ngIf="archivo()" class="mb-3">
              <button class="btn btn-warning btn-sm" (click)="enviarXmlSiesa()" [disabled]="loadingEnvio()">
                <span *ngIf="loadingEnvio()" class="spinner-border spinner-border-sm me-1"></span>
                <i *ngIf="!loadingEnvio()" class="bi bi-send me-1"></i>Enviar XML al API Siesa
              </button>
            </div>

            <div *ngIf="!archivo()" class="text-muted small fst-italic">
              Sube un Excel en la zona de arriba para enviar al API.
            </div>

            <!-- Resultado envio -->
            <div *ngIf="envioResult()" class="alert"
              [class.alert-success]="envioResult()!.errores.length === 0"
              [class.alert-warning]="envioResult()!.errores.length > 0">
              <h6 class="alert-heading mb-2"><i class="bi bi-send-check me-1"></i>Resultado del envio</h6>
              <div class="d-flex gap-4 mb-2">
                <div><span class="fw-bold text-success">{{ envioResult()!.enviados }}</span> enviados</div>
                <div><span class="fw-bold text-danger">{{ envioResult()!.errores.length }}</span> con error</div>
                <div><span class="fw-bold">{{ envioResult()!.totalLeidos }}</span> leidos en total</div>
              </div>
              <div *ngIf="envioResult()!.errores.length > 0">
                <p class="mb-1 small fw-semibold text-danger">Errores:</p>
                <ul class="mb-0">
                  <li *ngFor="let e of envioResult()!.errores.slice(0, 20)" class="small">
                    <code>{{ e.nit }}</code>
                    <span *ngIf="e.status" class="badge bg-danger me-1 ms-1">HTTP {{ e.status }}</span>
                    {{ e.message }}
                  </li>
                </ul>
                <small *ngIf="envioResult()!.errores.length > 20" class="text-muted">... y {{ envioResult()!.errores.length - 20 }} mas</small>
              </div>
            </div>
          </ng-container>
          <!-- /modo xml-api -->

        </div>
      </div>

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

  // Nivel 1: Entidad activa
  entidad = signal<'terceros'>('terceros');

  // Nivel 2: Modo
  modo = signal<'bd' | 'xml-descarga' | 'xml-api'>('bd');

  // Archivo compartido entre modos
  archivo = signal<File | null>(null);

  // Modo BD
  loadingPreview = signal(false);
  loadingInsertar = signal(false);
  previewRows = signal<PreviewRow[]>([]);
  totalRows = signal(0);
  errores = signal<string[]>([]);
  insertResult = signal<InsertResult | null>(null);
  idCia = 1;

  // Modo Descargar XML
  loadingXml = signal(false);
  xmlConexion = 'SQL-NEO';
  xmlIdCia = 1;
  xmlUsuario = '';
  xmlClave = '';

  // Modo API Siesa
  loadingEnvio = signal(false);
  envioResult = signal<EnvioResult | null>(null);
  envioUrl = '';
  envioNombreConexion = 'SQL-NEO';
  envioIdCia = 1;
  envioUsuario = '';
  envioClave = '';

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
      this.insertResult.set(null);
      this.envioResult.set(null);
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.archivo.set(file);
      this.previewRows.set([]);
      this.errores.set([]);
      this.insertResult.set(null);
      this.envioResult.set(null);
    }
  }

  limpiar() {
    this.archivo.set(null);
    this.previewRows.set([]);
    this.errores.set([]);
    this.totalRows.set(0);
    this.insertResult.set(null);
    this.envioResult.set(null);
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

  insertarEnBd() {
    if (!this.archivo()) return;
    if (!confirm('Insertar los terceros en la base de datos Siesa (CIA ' + this.idCia + ')?\n\nEsta accion no se puede deshacer.')) return;

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

  descargarXml() {
    if (!this.archivo()) return;
    this.loadingXml.set(true);
    const fd = new FormData();
    fd.append('file', this.archivo()!);
    const params = `conexion=${encodeURIComponent(this.xmlConexion)}&idCia=${this.xmlIdCia}&usuario=${encodeURIComponent(this.xmlUsuario)}&clave=${encodeURIComponent(this.xmlClave)}`;

    this.http.post(`${this.api}/terceros/generar?${params}`, fd, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Importar_Terceros.xml';
        a.click();
        URL.revokeObjectURL(url);
        this.loadingXml.set(false);
      },
      error: (err) => {
        alert('Error al generar el XML: ' + (err?.error?.message || 'Error desconocido'));
        this.loadingXml.set(false);
      }
    });
  }

  enviarXmlSiesa() {
    if (!this.archivo()) return;
    if (!this.envioUrl) { alert('Ingresa la URL del API Siesa.'); return; }
    if (!this.envioNombreConexion) { alert('Ingresa el Nombre de Conexion.'); return; }
    if (!this.envioUsuario) { alert('Ingresa el Usuario.'); return; }

    if (!confirm('Enviar los terceros al API Siesa?\nURL: ' + this.envioUrl + '\nConexion: ' + this.envioNombreConexion + ' / CIA: ' + this.envioIdCia)) return;

    this.loadingEnvio.set(true);
    this.envioResult.set(null);
    const fd = new FormData();
    fd.append('file', this.archivo()!);
    fd.append('url', this.envioUrl);
    fd.append('nombreConexion', this.envioNombreConexion);
    fd.append('idCia', String(this.envioIdCia));
    fd.append('usuario', this.envioUsuario);
    fd.append('clave', this.envioClave);

    this.http.post<EnvioResult>(`${this.api}/terceros/enviar-xml`, fd).subscribe({
      next: (res) => {
        this.envioResult.set(res);
        this.loadingEnvio.set(false);
      },
      error: (err) => {
        this.envioResult.set({ totalLeidos: 0, enviados: 0, errores: [{ nit: '-', message: err?.error?.message || 'Error al enviar' }] });
        this.loadingEnvio.set(false);
      }
    });
  }
}
