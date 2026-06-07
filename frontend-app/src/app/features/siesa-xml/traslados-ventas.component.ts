import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, debounceTime, switchMap, of } from 'rxjs';
import { SIESA_CONEXION_KEY } from '../../components/siesa-xml/siesa-xml.component';

interface CuentaSugerida { id: string; nombre: string; inversa: string; totalCr?: number; }

interface Distribucion {
  co: string;
  nombre: string;
  porcentaje: number;
  monto: number;
}

interface TrasladoPreview {
  nit: string;
  nombre: string;
  coOrigen: string;
  ventasNetas: number;
  distribuciones: Distribucion[];
  totalDistribuido: number;
}

interface PreviewResp {
  total: number;
  previews: TrasladoPreview[];
}

const LS_KEY = 'traslados-ventas-params';

@Component({
  selector: 'app-traslados-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CurrencyPipe],
  template: `
    <div class="container-fluid py-4 px-4" style="max-width: 1200px;">

      <!-- Encabezado -->
      <div class="page-header mb-4 d-flex align-items-center gap-3">
        <div class="flex-grow-1">
          <h2 class="mb-1"><i class="bi bi-arrow-left-right me-2 text-primary"></i>Traslados de Ventas — SIESA UnoEE</h2>
          <p class="text-muted mb-0">Distribuye ventas por vendedor entre Centros de Operación (CO) e importa el comprobante contable.</p>
        </div>
        <a routerLink="/siesa-xml" class="btn btn-outline-secondary btn-sm">
          <i class="bi bi-arrow-left me-1"></i>Volver
        </a>
      </div>

      <div class="card border-0 shadow-sm">
        <div class="card-body p-4">

          <!-- PASO 1: Cargar Excel -->
          <div class="step-row mb-4">
            <div class="step-badge">1</div>
            <div class="flex-grow-1">
              <h6 class="fw-semibold mb-2">Cargar Excel TB_CO</h6>
              <div class="upload-zone"
                (dragover)="$event.preventDefault()"
                (drop)="onDrop($event)"
                (click)="fileInput.click()"
                [class.has-file]="archivo()">
                <input #fileInput type="file" accept=".xlsx,.xls" (change)="onFileSelect($event)" hidden>
                <div *ngIf="!archivo()" class="text-center py-3">
                  <i class="bi bi-file-earmark-spreadsheet display-5 text-muted"></i>
                  <p class="mt-2 mb-0 fw-semibold">Arrastra el Excel aquí o haz clic</p>
                  <small class="text-muted">Hoja TB_CO con columnas TERCERO, CO, %CO1..%CO20 &mdash; máx 10MB</small>
                </div>
                <div *ngIf="archivo()" class="d-flex align-items-center gap-3 py-2 px-3">
                  <i class="bi bi-file-earmark-excel text-success" style="font-size: 2rem;"></i>
                  <div>
                    <p class="mb-0 fw-semibold">{{ archivo()!.name }}</p>
                    <small class="text-muted">{{ (archivo()!.size / 1024).toFixed(1) }} KB</small>
                  </div>
                  <button class="btn btn-sm btn-outline-secondary ms-auto"
                    (click)="$event.stopPropagation(); limpiar()">
                    <i class="bi bi-x-lg"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- PASO 2: Periodo -->
          <div class="step-row mb-4" *ngIf="archivo()">
            <div class="step-badge">2</div>
            <div class="flex-grow-1">
              <h6 class="fw-semibold mb-2">Seleccionar periodo</h6>
              <div class="row g-2 align-items-end">
                <div class="col-sm-3">
                  <label class="form-label small text-muted mb-1">Periodo (YYYYMM)</label>
                  <input type="text" class="form-control form-control-sm"
                    [(ngModel)]="periodo"
                    placeholder="202604"
                    maxlength="6"
                    pattern="[0-9]{6}">
                  <div class="form-text">Ejemplo: 202604 = Abril 2026</div>
                </div>
                <div class="col-auto">
                  <button class="btn btn-outline-primary btn-sm"
                    (click)="previsualizar()"
                    [disabled]="!periodo || periodo.length !== 6 || loadingPreview()">
                    <span *ngIf="loadingPreview()" class="spinner-border spinner-border-sm me-1"></span>
                    <i *ngIf="!loadingPreview()" class="bi bi-eye me-1"></i>Previsualizar ventas
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- PASO 3: Parámetros del comprobante -->
          <div class="step-row mb-4" *ngIf="archivo()">
            <div class="step-badge">3</div>
            <div class="flex-grow-1">
              <h6 class="fw-semibold mb-2">Parámetros del comprobante contable</h6>
              <div class="row g-2">
                <div class="col-md-3">
                  <label class="form-label small text-muted mb-1">Cuenta contable ventas *</label>
                  <div class="position-relative">
                    <div class="input-group input-group-sm">
                      <input type="text" class="form-control form-control-sm"
                        [(ngModel)]="cuentaQuery"
                        placeholder="Código o nombre de cuenta..."
                        autocomplete="off"
                        (ngModelChange)="onCuentaQuery($event)"
                        (blur)="onCuentaBlur()">
                      <button class="btn btn-outline-secondary btn-sm"
                        type="button"
                        [disabled]="!periodo || periodo.length !== 6 || !preview() || loadingDetectar()"
                        (click)="detectarCuenta()"
                        title="Detectar cuenta desde movimientos reales del periodo">
                        <span *ngIf="loadingDetectar()" class="spinner-border spinner-border-sm"></span>
                        <i *ngIf="!loadingDetectar()" class="bi bi-search"></i>
                      </button>
                    </div>
                    <div *ngIf="cuentaSugeridas().length > 0"
                      class="position-absolute w-100 border rounded shadow-sm bg-white small"
                      style="z-index:1000; max-height:220px; overflow-y:auto; top:100%;">
                      <button *ngFor="let c of cuentaSugeridas()"
                        type="button"
                        class="d-block w-100 text-start px-2 py-1 border-0 bg-transparent"
                        style="cursor:pointer;"
                        (mousedown)="seleccionarCuenta(c)">
                        <span class="font-monospace fw-semibold">{{ c.id }}</span>
                        <span class="text-muted ms-2">{{ c.nombre }}</span>
                        <span *ngIf="c.inversa" class="ms-2 badge bg-light text-secondary border" style="font-size:.7em;">↔ {{ c.inversa }}</span>
                        <span *ngIf="c.totalCr" class="ms-auto text-muted small float-end">{{ c.totalCr | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
                      </button>
                    </div>
                  </div>
                  <div *ngIf="params.cuenta" class="form-text text-success">
                    <i class="bi bi-check-circle me-1"></i>{{ params.cuenta }}
                  </div>
                </div>
                <div class="col-md-2">
                  <label class="form-label small text-muted mb-1">Tipo documento *</label>
                  <input type="text" class="form-control form-control-sm"
                    [(ngModel)]="params.tipoDocto"
                    placeholder="TRV"
                    maxlength="3"
                    style="text-transform: uppercase;"
                    (ngModelChange)="guardarParams()">
                </div>
                <div class="col-md-2">
                  <label class="form-label small text-muted mb-1">Fecha documento *</label>
                  <input type="date" class="form-control form-control-sm"
                    [(ngModel)]="fechaDisplay"
                    (ngModelChange)="onFechaChange($event); guardarParams()">
                </div>
                <div class="col-md-2">
                  <label class="form-label small text-muted mb-1">Consec. inicial</label>
                  <input type="number" class="form-control form-control-sm"
                    [(ngModel)]="params.consec"
                    min="1"
                    (ngModelChange)="guardarParams()">
                </div>
                <div class="col-md-3">
                  <label class="form-label small text-muted mb-1">ID Cía.</label>
                  <input type="text" class="form-control form-control-sm"
                    [(ngModel)]="params.idCia"
                    placeholder="1"
                    (ngModelChange)="guardarParams()">
                </div>
                <div class="col-md-3">
                  <label class="form-label small text-muted mb-1">Conexión SIESA</label>
                  <input type="text" class="form-control form-control-sm"
                    [(ngModel)]="params.conexion"
                    placeholder="SQL-NEO"
                    (ngModelChange)="guardarParams()">
                </div>
                <div class="col-md-3">
                  <label class="form-label small text-muted mb-1">Usuario SIESA</label>
                  <input type="text" class="form-control form-control-sm"
                    [(ngModel)]="params.usuario"
                    (ngModelChange)="guardarParams()">
                </div>
                <div class="col-md-2">
                  <label class="form-label small text-muted mb-1">Clave</label>
                  <input type="password" class="form-control form-control-sm"
                    [(ngModel)]="params.clave"
                    (ngModelChange)="guardarParams()">
                </div>
                <div class="col-md-12">
                  <label class="form-label small text-muted mb-1">URL API SIESA (para enviar)</label>
                  <input type="text" class="form-control form-control-sm"
                    [(ngModel)]="params.urlApi"
                    placeholder="http://servidor-siesa/.../UnoEEService"
                    (ngModelChange)="guardarParams()">
                </div>
              </div>
              <small class="text-muted fst-italic mt-1 d-block">Los parámetros se guardan automáticamente en el navegador.</small>

              <!-- Validación cuenta vs periodo -->
              <div *ngIf="params.cuenta && preview()" class="mt-3">
                <div class="d-flex align-items-center gap-2 mb-1">
                  <span class="small fw-semibold text-muted">Validación cuenta <span class="font-monospace text-dark">{{ params.cuenta }}</span> vs BD periodo {{ periodo }}</span>
                  <button class="btn btn-outline-secondary btn-sm py-0 px-2"
                    style="font-size:.75rem;"
                    [disabled]="loadingValidar()"
                    (click)="validarCuenta()">
                    <span *ngIf="loadingValidar()" class="spinner-border spinner-border-sm"></span>
                    <i *ngIf="!loadingValidar()" class="bi bi-shield-check"></i>
                    Validar
                  </button>
                </div>
                <div *ngIf="validacion().length > 0" class="table-responsive">
                  <table class="table table-sm table-bordered small mb-0" style="max-width:680px;">
                    <thead class="table-secondary">
                      <tr>
                        <th>CO</th>
                        <th>Tipo Docto</th>
                        <th class="text-center">Docs</th>
                        <th class="text-end">CR en BD</th>
                        <th class="text-end">Ventas Excel</th>
                        <th class="text-end">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let v of validacion()"
                        [class.table-success]="ventasExcelPorCo(v.co) > 0 && difValidacion(v) === 0"
                        [class.table-warning]="difValidacion(v) !== 0">
                        <td class="fw-semibold">{{ v.co }}</td>
                        <td class="font-monospace">{{ v.tipoDocto }}</td>
                        <td class="text-center">{{ v.documentos }}</td>
                        <td class="text-end">{{ v.totalCr | currency:'COP':'symbol-narrow':'1.0-0' }}</td>
                        <td class="text-end">{{ ventasExcelPorCo(v.co) | currency:'COP':'symbol-narrow':'1.0-0' }}</td>
                        <td class="text-end fw-semibold"
                          [class.text-success]="difValidacion(v) === 0"
                          [class.text-warning]="difValidacion(v) !== 0">
                          {{ difValidacion(v) === 0 ? '✓' : (difValidacion(v) | currency:'COP':'symbol-narrow':'1.0-0') }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div *ngIf="validacion().length === 0 && !loadingValidar()" class="form-text text-muted">
                  Haz clic en "Validar" para comparar la cuenta contra los movimientos reales de la BD.
                </div>
              </div>
            </div>
          </div>

          <!-- PASO 4: Preview tabla -->
          <div class="step-row mb-4" *ngIf="preview()">
            <div class="step-badge">4</div>
            <div class="flex-grow-1">
              <h6 class="fw-semibold mb-2">
                Distribución de ventas — {{ preview()!.total }} vendedor(es)
              </h6>

              <div class="table-responsive">
                <table class="table table-sm table-bordered table-hover small">
                  <thead class="table-dark">
                    <tr>
                      <th></th>
                      <th>NIT</th>
                      <th>Nombre</th>
                      <th>CO Origen</th>
                      <th class="text-end">Ventas Netas</th>
                      <th>Distribución por CO</th>
                      <th class="text-end">Total Distrib.</th>
                    </tr>
                  </thead>
                  <tbody>
                    <ng-container *ngFor="let p of preview()!.previews">
                      <tr [class.table-warning]="p.ventasNetas === 0">
                        <td class="text-center" style="width:32px;">
                          <button *ngIf="p.ventasNetas > 0"
                            class="btn btn-sm btn-link p-0 text-secondary"
                            (click)="toggleAsiento(p.nit)"
                            [title]="isExpanded(p.nit) ? 'Ocultar asiento' : 'Ver asiento contable'">
                            <i class="bi" [class.bi-journal-text]="!isExpanded(p.nit)" [class.bi-journal-x]="isExpanded(p.nit)"></i>
                          </button>
                        </td>
                        <td class="font-monospace">{{ p.nit }}</td>
                        <td>{{ p.nombre }}</td>
                        <td class="text-center fw-semibold">{{ p.coOrigen }}</td>
                        <td class="text-end fw-semibold">
                          {{ p.ventasNetas | currency:'COP':'symbol-narrow':'1.0-0' }}
                        </td>
                        <td>
                          <div *ngFor="let d of p.distribuciones" class="d-flex gap-2 align-items-center">
                            <span class="badge bg-secondary">CO {{ d.co }}</span>
                            <span class="text-muted" style="min-width: 40px;">{{ (d.porcentaje * 100).toFixed(0) }}%</span>
                            <span class="fw-semibold">{{ d.monto | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
                            <span class="text-muted small">— {{ d.nombre }}</span>
                          </div>
                          <div *ngIf="p.distribuciones.length === 0" class="text-muted fst-italic">Sin distribución</div>
                        </td>
                        <td class="text-end">
                          {{ p.totalDistribuido | currency:'COP':'symbol-narrow':'1.0-0' }}
                        </td>
                      </tr>
                      <!-- Asiento contable expandible -->
                      <tr *ngIf="isExpanded(p.nit)" class="bg-light">
                        <td colspan="7" class="py-2 px-3">
                          <div class="fw-semibold small mb-2 text-primary">
                            <i class="bi bi-journal-text me-1"></i>
                            Asiento contable — {{ p.nombre }}
                            <span *ngIf="params.tipoDocto" class="ms-2 badge bg-primary">{{ params.tipoDocto }}</span>
                            <span *ngIf="!params.tipoDocto" class="ms-2 text-muted">(configure tipo docto en Paso 4)</span>
                          </div>
                          <div *ngIf="!params.cuenta" class="alert alert-warning py-1 px-2 mb-2 small">
                            <i class="bi bi-info-circle me-1"></i>
                            Ingresa la <strong>cuenta contable</strong> en el Paso 4 para verla reflejada aquí.
                          </div>
                          <table class="table table-sm table-bordered mb-0 small" style="max-width:700px;">
                            <thead class="table-secondary">
                              <tr>
                                <th>Tipo</th>
                                <th>Cuenta</th>
                                <th>CO Movimiento</th>
                                <th class="text-end">Débito</th>
                                <th class="text-end">Crédito</th>
                                <th>Nota</th>
                              </tr>
                            </thead>
                            <tbody>
                              <!-- CR en CO origen -->
                              <tr class="table-danger">
                                <td><span class="badge bg-danger">CR</span></td>
                                <td class="font-monospace small" style="max-width:220px; word-break:break-all;">
                                  <span *ngIf="!cuentasCo()[(p.coOrigen + '').trim()]" class="spinner-border spinner-border-sm text-secondary"></span>
                                  <span *ngIf="cuentasCo()[(p.coOrigen + '').trim()]">{{ cuentasVentasParaCo(p.coOrigen) || '[sin cuenta]' }}</span>
                                </td>
                                <td class="fw-semibold">{{ p.coOrigen }}</td>
                                <td class="text-end">—</td>
                                <td class="text-end fw-semibold">{{ p.ventasNetas | currency:'COP':'symbol-narrow':'1.0-0' }}</td>
                                <td class="text-muted">CR CO{{ p.coOrigen }} ventas {{ p.nombre }}</td>
                              </tr>
                              <!-- DB en cada CO destino -->
                              <tr *ngFor="let d of p.distribuciones" class="table-success">
                                <td><span class="badge bg-success">DB</span></td>
                                <td class="font-monospace small" style="max-width:220px; word-break:break-all;">
                                  <span *ngIf="!cuentasCo()[(p.coOrigen + '').trim()]" class="spinner-border spinner-border-sm text-secondary"></span>
                                  <span *ngIf="cuentasCo()[(p.coOrigen + '').trim()]">{{ cuentasVentasParaCo(p.coOrigen) || '[sin cuenta]' }}</span>
                                </td>
                                <td class="fw-semibold">{{ d.co }}</td>
                                <td class="text-end fw-semibold">{{ d.monto | currency:'COP':'symbol-narrow':'1.0-0' }}</td>
                                <td class="text-end">—</td>
                                <td class="text-muted">DB CO{{ d.co }} {{ d.nombre }} ({{ (d.porcentaje * 100).toFixed(0) }}%)</td>
                              </tr>
                              <!-- Totales -->
                              <tr class="fw-bold table-light">
                                <td colspan="3" class="text-end">Total</td>
                                <td class="text-end">{{ p.totalDistribuido | currency:'COP':'symbol-narrow':'1.0-0' }}</td>
                                <td class="text-end">{{ p.ventasNetas | currency:'COP':'symbol-narrow':'1.0-0' }}</td>
                                <td [class.text-danger]="p.totalDistribuido !== p.ventasNetas" [class.text-success]="p.totalDistribuido === p.ventasNetas">
                                  {{ p.totalDistribuido === p.ventasNetas ? '✓ Cuadrado' : '⚠ Diferencia: ' + (p.totalDistribuido - p.ventasNetas | currency:'COP':'symbol-narrow':'1.0-0') }}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </ng-container>
                  </tbody>
                </table>
              </div>

              <div *ngIf="conVentas() === 0" class="alert alert-warning py-2 mb-0">
                <i class="bi bi-exclamation-triangle me-1"></i>
                Ningún vendedor tiene ventas en el periodo {{ periodo }}. Verifique el periodo o la fuente de datos.
              </div>
              <div *ngIf="conVentas() > 0" class="alert alert-success py-2 mb-0">
                <i class="bi bi-check-circle me-1"></i>
                {{ conVentas() }} de {{ preview()!.total }} vendedor(es) tienen ventas que serán trasladadas.
              </div>
            </div>
          </div>

          <!-- PASO 5: Acciones -->
          <div class="step-row mb-3" *ngIf="preview() && conVentas() > 0">
            <div class="step-badge">5</div>
            <div class="flex-grow-1">
              <h6 class="fw-semibold mb-2">Generar y enviar</h6>

              <!-- Resumen de parámetros que se enviarán -->
              <div class="border rounded p-2 mb-3 bg-light small">
                <div class="fw-semibold mb-1 text-muted">Parámetros a enviar:</div>
                <div class="row g-1">
                  <div class="col-auto">
                    <span class="text-muted">Cuenta:</span>
                    <span class="ms-1 fw-semibold font-monospace"
                      [class.text-danger]="!params.cuenta"
                      [class.text-success]="!!params.cuenta">
                      {{ params.cuenta || '⚠ VACÍA' }}
                    </span>
                  </div>
                  <div class="col-auto">
                    <span class="text-muted ms-2">Tipo:</span>
                    <span class="ms-1 fw-semibold font-monospace"
                      [class.text-danger]="!params.tipoDocto"
                      [class.text-success]="!!params.tipoDocto">
                      {{ params.tipoDocto || '⚠ VACÍO' }}
                    </span>
                  </div>
                  <div class="col-auto">
                    <span class="text-muted ms-2">Periodo:</span>
                    <span class="ms-1 fw-semibold font-monospace">{{ periodo }}</span>
                  </div>
                  <div class="col-auto">
                    <span class="text-muted ms-2">Fecha:</span>
                    <span class="ms-1 fw-semibold font-monospace"
                      [class.text-danger]="fechaBackend.length !== 8"
                      [class.text-success]="fechaBackend.length === 8">
                      {{ fechaBackend || '⚠ VACÍA' }}
                    </span>
                  </div>
                  <div class="col-auto">
                    <span class="text-muted ms-2">Conexión:</span>
                    <span class="ms-1 fw-semibold">{{ params.conexion }}</span>
                  </div>
                  <div class="col-auto">
                    <span class="text-muted ms-2">Usuario:</span>
                    <span class="ms-1 fw-semibold">{{ params.usuario }}</span>
                  </div>
                  <div class="col-12 mt-1">
                    <span class="text-muted">URL:</span>
                    <span class="ms-1 font-monospace" style="word-break:break-all;"
                      [class.text-danger]="!params.urlApi"
                      [class.text-success]="!!params.urlApi">
                      {{ params.urlApi || '⚠ VACÍA' }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="d-flex gap-2 flex-wrap">
                <button class="btn btn-primary btn-sm"
                  (click)="descargarXml()"
                  [disabled]="!paramsValidos() || loadingXml()">
                  <span *ngIf="loadingXml()" class="spinner-border spinner-border-sm me-1"></span>
                  <i *ngIf="!loadingXml()" class="bi bi-file-earmark-code me-1"></i>Descargar XML
                </button>
                <button class="btn btn-warning btn-sm"
                  (click)="enviarApi()"
                  [disabled]="!paramsValidos() || !params.urlApi || loadingApi()">
                  <span *ngIf="loadingApi()" class="spinner-border spinner-border-sm me-1"></span>
                  <i *ngIf="!loadingApi()" class="bi bi-cloud-upload me-1"></i>Enviar al API SIESA
                </button>
              </div>
              <div *ngIf="!paramsValidos()" class="alert alert-warning py-2 mt-2 mb-0">
                <div class="fw-semibold mb-1"><i class="bi bi-exclamation-triangle me-1"></i>Faltan campos obligatorios en el Paso 3:</div>
                <ul class="mb-0 small">
                  <li *ngIf="!params.cuenta">
                    <strong>Cuenta contable ventas</strong> — cuenta del PUC que acumula las ventas a trasladar
                    (ej. <code>41359501</code> = Ventas gravadas 19%)
                  </li>
                  <li *ngIf="!params.tipoDocto">
                    <strong>Tipo documento</strong> — código del tipo de comprobante en SIESA UnoEE (3 letras)
                    (ej. <code>TRV</code>, <code>CDJ</code> o el que uses para traslados contables)
                  </li>
                  <li *ngIf="!fechaBackend || fechaBackend.length !== 8">
                    <strong>Fecha del documento</strong> — fecha contable con la que se registrarán los documentos
                    (usa el selector de fecha del Paso 4)
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Resultado API -->
          <div *ngIf="resApi() as r" class="mt-3">

            <!-- Estado principal -->
            <div class="alert mb-2"
              [class.alert-success]="r.printTipoError === 0"
              [class.alert-danger]="r.printTipoError !== 0">
              <div class="d-flex align-items-center gap-2">
                <i class="bi fs-5" [class.bi-check-circle-fill]="r.printTipoError === 0" [class.bi-x-circle-fill]="r.printTipoError !== 0"></i>
                <div>
                  <strong>{{ r.printTipoError === 0 ? 'Importación exitosa' : 'Error en la importación' }}</strong>
                  <span class="ms-2 badge" [class.bg-success]="r.printTipoError === 0" [class.bg-danger]="r.printTipoError !== 0">printTipoError={{ r.printTipoError }}</span>
                  <span class="ms-2 text-muted small">HTTP {{ r.status }} · {{ r.totalTraslados }} traslado(s)</span>
                </div>
              </div>
              <div *ngIf="r.printTipoError !== 0" class="mt-2 small">
                <strong>Causa probable según código:</strong>
                <span *ngIf="r.printTipoError === 1"> Error de validación en datos (ver detalle XML).</span>
                <span *ngIf="r.printTipoError === 2"> Error de autenticación (usuario/clave/conexión incorrectos).</span>
                <span *ngIf="r.printTipoError === 3"> Error de estructura del XML o cuenta/periodo inválido.</span>
                <span *ngIf="r.printTipoError > 3"> Error interno SIESA.</span>
              </div>
            </div>

            <!-- Aprobaciones -->
            <div *ngIf="r.aprobaciones.length > 0" class="alert alert-info py-2 mb-2">
              <strong><i class="bi bi-check2-all me-1"></i>Documentos aprobados automáticamente:</strong>
              <ul class="mb-0 mt-1 small">
                <li *ngFor="let a of r.aprobaciones"
                  [class.text-success]="a.error === 0"
                  [class.text-danger]="a.error !== 0">
                  FAF-{{ a.consec }} (rowid={{ a.rowid }}) — {{ a.descripcion }}
                  <span *ngIf="a.error !== 0" class="text-danger"> ✗ error={{ a.error }}</span>
                </li>
              </ul>
            </div>

            <!-- XML enviado (expandible) -->
            <div *ngIf="r.xmlEnviado" class="mb-2">
              <button class="btn btn-outline-secondary btn-sm" (click)="showXmlEnviado.set(!showXmlEnviado())">
                <i class="bi bi-code-slash me-1"></i>{{ showXmlEnviado() ? 'Ocultar' : 'Ver' }} XML enviado a SIESA
              </button>
              <pre *ngIf="showXmlEnviado()" class="mt-2 small border rounded p-2 bg-light" style="max-height:250px;overflow:auto;white-space:pre-wrap;">{{ r.xmlEnviado }}</pre>
            </div>

            <!-- Respuesta cruda (expandible) -->
            <div>
              <button class="btn btn-outline-secondary btn-sm" (click)="showRespuestaRaw.set(!showRespuestaRaw())">
                <i class="bi bi-chevron-expand me-1"></i>{{ showRespuestaRaw() ? 'Ocultar' : 'Ver' }} respuesta SOAP completa
              </button>
              <pre *ngIf="showRespuestaRaw()" class="mt-2 small border rounded p-2 bg-light" style="max-height:250px;overflow:auto;white-space:pre-wrap;">{{ r.respuesta }}</pre>
            </div>

          </div>

          <!-- Errores -->
          <div *ngIf="errores().length > 0" class="alert alert-danger py-2 mt-3">
            <strong><i class="bi bi-x-circle me-1"></i>Error:</strong>
            <ul class="mb-0 mt-1">
              <li *ngFor="let e of errores()" class="small">{{ e }}</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .step-row {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }
    .step-badge {
      flex-shrink: 0;
      width: 32px; height: 32px; border-radius: 50%;
      background: #0d6efd; color: white; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      margin-top: 2px;
    }
    .upload-zone {
      border: 2px dashed #cbd5e1; border-radius: .5rem;
      cursor: pointer; transition: all .15s;
      background: #fafbfc;
    }
    .upload-zone:hover { border-color: #0d6efd; background: #f1f7ff; }
    .upload-zone.has-file { border-style: solid; border-color: #198754; background: #f0fdf4; }
  `],
})
export class TrasladosVentasComponent {
  private http = inject(HttpClient);
  private readonly apiBase = 'http://localhost:3000/api/siesa-xml/traslados';

  archivo = signal<File | null>(null);
  periodo = '';

  preview = signal<PreviewResp | null>(null);
  errores = signal<string[]>([]);
  resApi = signal<{ ok: boolean; status: number; respuesta: string; printTipoError: number; aprobaciones: any[]; totalTraslados: number; xmlEnviado?: string } | null>(null);
  showXmlEnviado = signal(false);
  showRespuestaRaw = signal(false);

  loadingPreview = signal(false);
  loadingXml = signal(false);
  loadingApi = signal(false);

  // Fecha en formato date input (YYYY-MM-DD) y convertida a YYYYMMDD para el backend
  fechaDisplay = '';
  get fechaBackend(): string {
    return this.fechaDisplay.replace(/-/g, '');
  }

  onFechaChange(val: string) {
    this.fechaDisplay = val;
  }

  params = this.cargarParams();

  // ── Búsqueda de cuenta contable ─────────────────────────────────────────
  cuentaQuery = this.params.cuenta ?? '';
  cuentaSugeridas = signal<CuentaSugerida[]>([]);
  private cuentaSearch$ = new Subject<string>();

  constructor() {
    this.cuentaSearch$.pipe(
      debounceTime(300),
      switchMap(q => q.length >= 2
        ? this.http.get<CuentaSugerida[]>(`http://localhost:3000/api/siesa-xml/cuentas/buscar?q=${encodeURIComponent(q)}`)
        : of([])
      ),
    ).subscribe(res => this.cuentaSugeridas.set(res));
  }

  loadingDetectar = signal(false);
  loadingValidar = signal(false);
  validacion = signal<Array<{ co: string; tipoDocto: string; documentos: number; totalDb: number; totalCr: number }>>([]);

  /** Suma de ventasNetas del Excel para un CO origen dado */
  ventasExcelPorCo(co: string): number {
    const p = this.preview();
    if (!p) return 0;
    return p.previews
      .filter(x => x.coOrigen === co)
      .reduce((acc, x) => acc + x.ventasNetas, 0);
  }

  difValidacion(v: { co: string; totalCr: number }): number {
    return v.totalCr - this.ventasExcelPorCo(v.co);
  }

  validarCuenta() {
    const p = this.preview();
    if (!p || !this.params.cuenta || !this.periodo) return;
    const coOrigen = p.previews.find(x => x.ventasNetas > 0)?.coOrigen;
    if (!coOrigen) return;

    this.loadingValidar.set(true);
    this.validacion.set([]);
    this.http.get<Array<{ co: string; tipoDocto: string; documentos: number; totalDb: number; totalCr: number }>>(
      `http://localhost:3000/api/siesa-xml/cuentas/validar?co=${encodeURIComponent(coOrigen)}&periodo=${this.periodo}&cuenta=${encodeURIComponent(this.params.cuenta)}`
    ).subscribe({
      next: (res) => { this.loadingValidar.set(false); this.validacion.set(res); },
      error: () => this.loadingValidar.set(false),
    });
  }

  detectarCuenta() {
    const p = this.preview();
    if (!p || !this.periodo) return;
    // Tomar el primer CO origen de los previews con ventas
    const coOrigen = p.previews.find(x => x.ventasNetas > 0)?.coOrigen;
    if (!coOrigen) return;

    this.loadingDetectar.set(true);
    this.cuentaSugeridas.set([]);
    this.http.get<Array<{cuenta: string; descripcion: string; totalCr: number}>>(
      `http://localhost:3000/api/siesa-xml/cuentas/ventas-periodo?co=${encodeURIComponent(coOrigen)}&periodo=${this.periodo}`
    ).subscribe({
      next: (res) => {
        this.loadingDetectar.set(false);
        if (!res.length) return;
        // Auto-seleccionar la primera (mayor volumen) y mostrar las demás como sugerencias
        const mapped: CuentaSugerida[] = res.map(r => ({ id: r.cuenta, nombre: r.descripcion, inversa: '', totalCr: r.totalCr }));
        if (mapped.length === 1) {
          this.seleccionarCuenta(mapped[0]);
        } else {
          this.cuentaSugeridas.set(mapped);
        }
      },
      error: () => this.loadingDetectar.set(false),
    });
  }

  onCuentaQuery(val: string) {
    this.cuentaQuery = val;
    if (!val) { this.params.cuenta = ''; this.guardarParams(); }
    this.cuentaSearch$.next(val);
  }

  seleccionarCuenta(c: CuentaSugerida) {
    this.params.cuenta = c.id;
    this.cuentaQuery = c.id;
    this.cuentaSugeridas.set([]);
    this.guardarParams();
  }

  onCuentaBlur() {
    setTimeout(() => this.cuentaSugeridas.set([]), 200);
  }

  expandedNits = signal<Set<string>>(new Set());

  /** Mapa CO → { ventas: 'cta1, cta2', cr: 'todas las CR', db: 'todas las DB' } cargado lazy al expandir */
  cuentasCo = signal<Record<string, { ventas: string; cr: string; db: string }>>({});

  /** Devuelve las cuentas de ventas (4xxx) para mostrar en el asiento.
   *  Si el CO origen no tiene documentos propios, usa el CO con mayor volumen del preview. */
  cuentasVentasParaCo(coOrigen: string): string {
    const m = this.cuentasCo();
    const coKey = String(coOrigen ?? '').trim();
    // Intentar CO directo
    if (m[coKey]?.ventas) return m[coKey].ventas;
    // Intentar cualquier CO cargado que tenga ventas (fallback al CO principal)
    const coConVentas = Object.values(m).find(v => v.ventas);
    if (coConVentas) return coConVentas.ventas;
    // Fallback a params.cuenta si está configurado
    return this.params.cuenta || '';
  }

  private cargarCuentasCo(co: string) {
    const coKey = String(co ?? '').trim();
    if (!coKey) return;
    if (this.cuentasCo()[coKey]) return;
    this.http
      .get<Array<{ cuenta: string; tipoDocto: string; totalDb: number; totalCr: number }>>(
        `http://localhost:3000/api/siesa-xml/cuentas/por-tipo-docto?co=${encodeURIComponent(coKey)}&periodo=${encodeURIComponent(this.periodo)}`,
      )
      .subscribe({
        next: (res) => {
          const ventas = [...new Set(res.filter(r => r.totalCr > 0 && r.cuenta.startsWith('4')).map(r => r.cuenta))].join(', ');
          const cr = [...new Set(res.filter(r => r.totalCr > 0).map(r => r.cuenta))].join(', ');
          const db = [...new Set(res.filter(r => r.totalDb > 0).map(r => r.cuenta))].join(', ');
          this.cuentasCo.update(m => ({ ...m, [coKey]: { ventas, cr, db } }));
          // Si no hay ventas propias en este CO, cargar también el CO con mayor volumen del preview
          if (!ventas) {
            const cosPrincipales = (this.preview()?.previews ?? [])
              .filter(p => String(p.coOrigen ?? '').trim() !== coKey && p.ventasNetas > 0)
              .sort((a, b) => b.ventasNetas - a.ventasNetas);
            if (cosPrincipales.length) this.cargarCuentasCo(cosPrincipales[0].coOrigen);
          }
        },
        error: () => { this.cuentasCo.update(m => ({ ...m, [coKey]: { ventas: '', cr: '', db: '' } })); },
      });
  }

  toggleAsiento(nit: string) {
    const s = new Set(this.expandedNits());
    if (s.has(nit)) {
      s.delete(nit);
    } else {
      s.add(nit);
      const p = this.preview()?.previews.find(x => x.nit === nit);
      if (p) this.cargarCuentasCo(String(p.coOrigen ?? '').trim());
    }
    this.expandedNits.set(s);
  }

  isExpanded(nit: string): boolean {
    return this.expandedNits().has(nit);
  }

  conVentas = computed(() =>
    (this.preview()?.previews ?? []).filter((p) => p.ventasNetas > 0).length,
  );

  paramsValidos() {
    return !!(this.params.cuenta && this.params.tipoDocto && this.fechaBackend.length === 8);
  }

  // ── Archivo ──────────────────────────────────────────────────────────────

  onFileSelect(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (f) this.setArchivo(f);
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
    this.periodo = '';
  }

  // ── Preview ───────────────────────────────────────────────────────────────

  previsualizar() {
    const file = this.archivo();
    if (!file || !this.periodo) return;

    this.loadingPreview.set(true);
    this.errores.set([]);
    this.preview.set(null);
    this.resApi.set(null);

    const fd = new FormData();
    fd.append('file', file);

    this.http.post<PreviewResp>(`${this.apiBase}/preview?periodo=${this.periodo}`, fd).subscribe({
      next: (res) => {
        this.preview.set(res);
        this.loadingPreview.set(false);
      },
      error: (err) => {
        this.loadingPreview.set(false);
        this.errores.set([this.extractError(err)]);
      },
    });
  }

  // ── Descargar XML ─────────────────────────────────────────────────────────

  descargarXml() {
    const file = this.archivo();
    if (!file) return;

    this.loadingXml.set(true);
    this.errores.set([]);

    const fd = new FormData();
    fd.append('file', file);

    const qs = this.buildQueryString({ includeUrl: false });
    this.http.post(`${this.apiBase}/generar?${qs}`, fd, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.loadingXml.set(false);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Traslados_Ventas_${this.periodo}.xml`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.loadingXml.set(false);
        this.errores.set([this.extractError(err)]);
      },
    });
  }

  // ── Enviar al API SIESA ───────────────────────────────────────────────────

  enviarApi() {
    const file = this.archivo();
    if (!file) return;

    this.loadingApi.set(true);
    this.errores.set([]);
    this.resApi.set(null);

    const fd = new FormData();
    fd.append('file', file);

    const qs = this.buildQueryString({ includeUrl: true });
    this.http.post<any>(`${this.apiBase}/enviar?${qs}`, fd).subscribe({
      next: (res) => {
        this.loadingApi.set(false);
        const m = (res.respuesta as string)?.match(/printTipoError>(\d+)</);
        const printTipoError = m ? parseInt(m[1], 10) : -1;
        this.showXmlEnviado.set(false);
        this.showRespuestaRaw.set(false);
        this.resApi.set({
          ok: printTipoError === 0,
          status: res.status,
          respuesta: res.respuesta,
          printTipoError,
          aprobaciones: res.aprobaciones ?? [],
          totalTraslados: res.totalTraslados ?? 0,
          xmlEnviado: res.xmlEnviado,
        });
      },
      error: (err) => {
        this.loadingApi.set(false);
        this.errores.set([this.extractError(err)]);
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private buildQueryString(opts: { includeUrl: boolean }): string {
    const p = this.params;
    const parts: string[] = [
      `periodo=${encodeURIComponent(this.periodo)}`,
      `cuenta=${encodeURIComponent(p.cuenta)}`,
      `tipoDocto=${encodeURIComponent(p.tipoDocto)}`,
      `fecha=${encodeURIComponent(this.fechaBackend)}`,
      `idCia=${encodeURIComponent(p.idCia || '1')}`,
      `conexion=${encodeURIComponent(p.conexion || 'SQL-NEO')}`,
      `usuario=${encodeURIComponent(p.usuario || '')}`,
      `clave=${encodeURIComponent(p.clave || '')}`,
      `consec=${encodeURIComponent(String(p.consec || 1))}`,
    ];
    if (opts.includeUrl && p.urlApi) {
      parts.push(`url=${encodeURIComponent(p.urlApi)}`);
    }
    return parts.join('&');
  }

  private extractError(err: any): string {
    if (err?.error?.message) return err.error.message;
    if (err?.error) {
      try { return typeof err.error === 'string' ? err.error : JSON.stringify(err.error); }
      catch { return String(err.error); }
    }
    return err?.message || 'Error desconocido';
  }

  // ── Persistencia de parámetros ────────────────────────────────────────────

  private cargarParams() {
    const defaults = this.defaultParams();

    // Intentar cargar credenciales compartidas de SIESA (guardadas desde Terceros)
    try {
      const shared = localStorage.getItem(SIESA_CONEXION_KEY);
      if (shared) {
        const p = JSON.parse(shared);
        if (p.url)      defaults.urlApi    = p.url;
        if (p.conexion) defaults.conexion  = p.conexion;
        if (p.idCia)    defaults.idCia     = String(p.idCia);
        if (p.usuario)  defaults.usuario   = p.usuario;
        if (p.clave)    defaults.clave     = p.clave;
      }
    } catch { /* ignore */ }

    // Los params propios de traslados sobreescriben si ya existían
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) return { ...defaults, ...JSON.parse(saved) };
    } catch { /* ignore */ }

    return defaults;
  }

  private defaultParams() {
    // Mismos defaults que el componente de Terceros (siesa-xml.component.ts)
    return {
      cuenta: '',
      tipoDocto: 'FAF',
      idCia: '1',
      conexion: 'Pruebas',
      usuario: 'unoee',
      clave: 'unoee26',
      urlApi: 'http://192.168.1.70/WSUNOEE/WFPruebaImportar.aspx',
      consec: 1,
    };
  }

  guardarParams() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(this.params));
    } catch { /* ignore */ }
  }
}
