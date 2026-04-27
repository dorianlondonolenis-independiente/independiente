import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

interface VersionInfo {
  id: 'V1' | 'V2';
  label: string;
  registros: {
    cabecera: { id: string; descripcion: string };
    movimiento: { id: string; descripcion: string };
    cxc: { id: string; descripcion: string };
    cxp: { id: string; descripcion: string };
  };
}

interface PreviewResp {
  version: 'V1' | 'V2';
  cabecera: Record<string, any>;
  totalMovimientos: number;
  totalCruces: number;
  movimientos: Record<string, any>[];
  cruces: Record<string, any>[];
  errores: string[];
}

@Component({
  selector: 'app-comprobantes-xml',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container-fluid py-4 px-4" style="max-width: 1100px;">

      <div class="page-header mb-4 d-flex align-items-center">
        <div class="flex-grow-1">
          <h2 class="mb-1"><i class="bi bi-journal-text me-2 text-primary"></i>Comprobantes Contables &mdash; SIESA UnoEE</h2>
          <p class="text-muted mb-0">Importa documentos contables (registros 350 / 351) en formato plano.</p>
        </div>
        <a routerLink="/siesa-xml" class="btn btn-outline-secondary btn-sm">
          <i class="bi bi-arrow-left me-1"></i>Terceros
        </a>
      </div>

      <div class="card border-0 shadow-sm">

        <!-- Selector de versión -->
        <div class="card-header bg-white border-bottom py-3">
          <div class="d-flex align-items-center gap-3 flex-wrap">
            <div class="fw-semibold"><i class="bi bi-tag me-1"></i>Versión del comprobante:</div>
            <div class="btn-group btn-group-sm" role="group">
              <ng-container *ngFor="let v of versiones()">
                <input type="radio" class="btn-check" name="ver" [id]="'ver-'+v.id"
                  [value]="v.id" [(ngModel)]="versionSel">
                <label class="btn btn-outline-dark" [for]="'ver-'+v.id">{{ v.label }}</label>
              </ng-container>
            </div>
            <small class="text-muted ms-2" *ngIf="versionInfo() as info">
              Registros: {{ info.registros.cabecera.id }}, {{ info.registros.movimiento.id }}, {{ info.registros.cxc.id }}, {{ info.registros.cxp.id }}
            </small>
          </div>
        </div>

        <div class="card-body">

          <!-- Paso 1: Plantilla -->
          <div class="d-flex align-items-center gap-3 p-3 bg-light rounded mb-3">
            <div class="step-badge">1</div>
            <div class="flex-grow-1">
              <h6 class="mb-1 fw-semibold">Descargar plantilla Excel</h6>
              <p class="mb-0 small text-muted">La plantilla incluye hojas Cabecera, Movimientos, CxC y CxP para la versión seleccionada.</p>
            </div>
            <button class="btn btn-success btn-sm" (click)="descargarPlantilla()" [disabled]="loadingPlantilla()">
              <span *ngIf="loadingPlantilla()" class="spinner-border spinner-border-sm me-1"></span>
              <i *ngIf="!loadingPlantilla()" class="bi bi-file-earmark-excel me-1"></i>Plantilla {{ versionSel }}
            </button>
          </div>

          <!-- Paso 2: Upload -->
          <div class="upload-zone mb-3"
            (dragover)="$event.preventDefault()"
            (drop)="onDrop($event)"
            (click)="fileInput.click()"
            [class.has-file]="archivo()">
            <input #fileInput type="file" accept=".xlsx,.xls" (change)="onFileSelect($event)" hidden>
            <div *ngIf="!archivo()" class="text-center py-4">
              <i class="bi bi-cloud-arrow-up display-4 text-muted"></i>
              <p class="mt-2 mb-1 fw-semibold">Arrastra el Excel aquí o haz clic</p>
              <small class="text-muted">.xlsx / .xls &mdash; máx 10MB</small>
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

          <!-- Configuración de envío -->
          <div *ngIf="archivo()" class="row g-2 mb-2">
            <div class="col-md-3">
              <label class="form-label small text-muted mb-1">Conexión</label>
              <input type="text" class="form-control form-control-sm" [(ngModel)]="conexion" placeholder="SQL-NEO">
            </div>
            <div class="col-md-2">
              <label class="form-label small text-muted mb-1">ID Cía.</label>
              <input type="text" class="form-control form-control-sm" [(ngModel)]="idCia" placeholder="1">
            </div>
            <div class="col-md-3">
              <label class="form-label small text-muted mb-1">Usuario</label>
              <input type="text" class="form-control form-control-sm" [(ngModel)]="usuario">
            </div>
            <div class="col-md-2">
              <label class="form-label small text-muted mb-1">Clave</label>
              <input type="password" class="form-control form-control-sm" [(ngModel)]="clave">
            </div>
          </div>

          <!-- URL API SIESA -->
          <div *ngIf="archivo()" class="row g-2 mb-3">
            <div class="col-md-12">
              <label class="form-label small text-muted mb-1">URL API SIESA UnoEE (para enviar XML)</label>
              <input type="text" class="form-control form-control-sm" [(ngModel)]="urlApi" placeholder="http://servidor-siesa/.../UnoEEService">
            </div>
          </div>

          <!-- Acciones -->
          <div *ngIf="archivo()" class="d-flex gap-2 mb-3 flex-wrap">
            <button class="btn btn-outline-secondary btn-sm" (click)="previsualizar()" [disabled]="loadingPreview()">
              <span *ngIf="loadingPreview()" class="spinner-border spinner-border-sm me-1"></span>
              <i *ngIf="!loadingPreview()" class="bi bi-eye me-1"></i>Previsualizar
            </button>
            <button class="btn btn-primary btn-sm" (click)="generarXml()" [disabled]="loadingXml()">
              <span *ngIf="loadingXml()" class="spinner-border spinner-border-sm me-1"></span>
              <i *ngIf="!loadingXml()" class="bi bi-file-earmark-code me-1"></i>Descargar XML
            </button>
            <button class="btn btn-warning btn-sm" (click)="enviarApi()" [disabled]="loadingApi() || !urlApi">
              <span *ngIf="loadingApi()" class="spinner-border spinner-border-sm me-1"></span>
              <i *ngIf="!loadingApi()" class="bi bi-cloud-upload me-1"></i>Enviar al API SIESA
            </button>
          </div>

          <!-- Resultados de envío API -->
          <div *ngIf="resApi() as r" class="alert" [class.alert-success]="r.ok" [class.alert-danger]="!r.ok">
            <strong><i class="bi" [class.bi-check-circle]="r.ok" [class.bi-x-circle]="!r.ok"></i>
              API SIESA — HTTP {{ r.status }}</strong>
            <pre class="mb-0 mt-2 small" style="white-space: pre-wrap; max-height: 300px; overflow:auto;">{{ r.respuesta }}</pre>
          </div>

          <!-- Errores -->
          <div *ngIf="errores().length > 0" class="alert alert-warning py-2">
            <strong><i class="bi bi-exclamation-triangle me-1"></i>Avisos / errores ({{ errores().length }}):</strong>
            <ul class="mb-0 mt-1">
              <li *ngFor="let e of errores()" class="small">{{ e }}</li>
            </ul>
          </div>

          <!-- Preview -->
          <ng-container *ngIf="preview() as p">
            <hr>
            <h6 class="fw-semibold mb-2"><i class="bi bi-file-earmark-text me-1"></i>Cabecera</h6>
            <div class="table-responsive mb-3">
              <table class="table table-sm table-bordered">
                <tbody>
                  <tr *ngFor="let k of objectKeys(p.cabecera)">
                    <th class="bg-light" style="width: 220px;">{{ k }}</th>
                    <td>{{ p.cabecera[k] }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h6 class="fw-semibold mb-2">
              <i class="bi bi-list-ol me-1"></i>Movimientos ({{ p.totalMovimientos }})
            </h6>
            <div class="table-responsive mb-3" *ngIf="p.movimientos.length > 0; else noMov">
              <table class="table table-sm table-striped table-bordered small">
                <thead class="table-dark">
                  <tr>
                    <th *ngFor="let c of movColumns(p.movimientos)">{{ c }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let row of p.movimientos">
                    <td *ngFor="let c of movColumns(p.movimientos)">{{ row[c] }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ng-template #noMov><p class="text-muted small fst-italic">Sin movimientos.</p></ng-template>

            <ng-container *ngIf="p.totalCruces > 0">
              <h6 class="fw-semibold mb-2"><i class="bi bi-arrow-left-right me-1"></i>Cruces ({{ p.totalCruces }})</h6>
              <div class="table-responsive mb-3">
                <table class="table table-sm table-striped table-bordered small">
                  <thead class="table-dark">
                    <tr>
                      <th *ngFor="let c of movColumns(p.cruces)">{{ c }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let row of p.cruces">
                      <td *ngFor="let c of movColumns(p.cruces)">{{ row[c] }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </ng-container>
          </ng-container>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .step-badge {
      width: 32px; height: 32px; border-radius: 50%;
      background: #0d6efd; color: white; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .upload-zone {
      border: 2px dashed #cbd5e1; border-radius: .5rem;
      cursor: pointer; transition: all .15s;
      background: #fafbfc;
    }
    .upload-zone:hover { border-color: #0d6efd; background: #f1f7ff; }
    .upload-zone.has-file { border-style: solid; border-color: #198754; background: #f0fdf4; }
  `]
})
export class ComprobantesXmlComponent {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/siesa-xml/comprobantes';

  versiones = signal<VersionInfo[]>([]);
  versionSel: 'V1' | 'V2' = 'V2';
  versionInfo = computed(() => this.versiones().find(v => v.id === this.versionSel));

  archivo = signal<File | null>(null);
  conexion = 'SQL-NEO';
  idCia = '1';
  usuario = '';
  clave = '';
  urlApi = '';

  preview = signal<PreviewResp | null>(null);
  errores = signal<string[]>([]);
  resApi = signal<{ ok: boolean; status: number; respuesta: string } | null>(null);
  loadingPlantilla = signal(false);
  loadingPreview = signal(false);
  loadingXml = signal(false);
  loadingApi = signal(false);

  ngOnInit() {
    this.http.get<VersionInfo[]>(`${this.apiUrl}/versiones`).subscribe({
      next: (v) => this.versiones.set(v),
      error: () => this.errores.set(['No se pudieron cargar las versiones disponibles.']),
    });
  }

  onFileSelect(ev: Event) {
    const input = ev.target as HTMLInputElement;
    if (input.files?.[0]) this.setArchivo(input.files[0]);
  }
  onDrop(ev: DragEvent) {
    ev.preventDefault();
    const f = ev.dataTransfer?.files?.[0];
    if (f) this.setArchivo(f);
  }
  private setArchivo(f: File) {
    this.archivo.set(f);
    this.preview.set(null);
    this.errores.set([]);
    this.resApi.set(null);
  }
  limpiar() {
    this.archivo.set(null);
    this.preview.set(null);
    this.errores.set([]);
    this.resApi.set(null);
  }

  descargarPlantilla() {
    this.loadingPlantilla.set(true);
    this.http.get(`${this.apiUrl}/plantilla?version=${this.versionSel}`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.loadingPlantilla.set(false);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `Plantilla_Comprobantes_${this.versionSel}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.loadingPlantilla.set(false);
        this.errores.set([`Error descargando plantilla: ${err.message || err}`]);
      },
    });
  }

  previsualizar() {
    if (!this.archivo()) return;
    this.loadingPreview.set(true);
    this.errores.set([]);
    const fd = new FormData();
    fd.append('file', this.archivo()!);
    this.http.post<PreviewResp>(`${this.apiUrl}/preview?version=${this.versionSel}`, fd).subscribe({
      next: (resp) => {
        this.loadingPreview.set(false);
        this.preview.set(resp);
        this.errores.set(resp.errores || []);
      },
      error: (err: HttpErrorResponse) => {
        this.loadingPreview.set(false);
        this.errores.set([err.error?.message || err.message || 'Error en preview']);
      },
    });
  }

  generarXml() {
    if (!this.archivo()) return;
    this.loadingXml.set(true);
    this.errores.set([]);
    const fd = new FormData();
    fd.append('file', this.archivo()!);
    const params = new URLSearchParams({
      version: this.versionSel,
      conexion: this.conexion || 'SQL-NEO',
      idCia: this.idCia || '1',
      usuario: this.usuario || '',
      clave: this.clave || '',
    });
    this.http.post(`${this.apiUrl}/generar?${params.toString()}`, fd, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.loadingXml.set(false);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `Importar_Comprobante_${this.versionSel}.xml`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: async (err: HttpErrorResponse) => {
        this.loadingXml.set(false);
        let msg = err.message;
        let errores: string[] = [];
        if (err.error instanceof Blob) {
          try {
            const text = await err.error.text();
            const parsed = JSON.parse(text);
            msg = parsed.message || msg;
            errores = parsed.errores || [];
          } catch { /* ignore */ }
        } else if (err.error) {
          msg = err.error.message || msg;
          errores = err.error.errores || [];
        }
        this.errores.set([msg, ...errores]);
      },
    });
  }

  enviarApi() {
    if (!this.archivo() || !this.urlApi) return;
    this.loadingApi.set(true);
    this.resApi.set(null);
    this.errores.set([]);
    const fd = new FormData();
    fd.append('file', this.archivo()!);
    const params = new URLSearchParams({
      version: this.versionSel,
      url: this.urlApi,
      conexion: this.conexion || 'SQL-NEO',
      idCia: this.idCia || '1',
      usuario: this.usuario || '',
      clave: this.clave || '',
    });
    this.http.post<any>(`${this.apiUrl}/enviar-xml?${params.toString()}`, fd).subscribe({
      next: (r) => {
        this.loadingApi.set(false);
        this.resApi.set({ ok: r.ok, status: r.status, respuesta: r.respuesta });
        this.errores.set(r.errores || []);
      },
      error: (err: HttpErrorResponse) => {
        this.loadingApi.set(false);
        this.errores.set([err.error?.message || err.message || 'Error enviando al API']);
      },
    });
  }

  objectKeys = (o: any) => Object.keys(o || {});
  movColumns = (rows: Record<string, any>[]) => {
    const set = new Set<string>();
    rows.forEach((r) => Object.keys(r).forEach((k) => { if (!k.startsWith('__')) set.add(k); }));
    return [...set];
  };
}
