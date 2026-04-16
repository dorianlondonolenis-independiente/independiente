import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface ColumnInfo {
  name: string;
  type: string;
  max_length: number;
  is_nullable: boolean;
  is_identity: boolean;
  is_computed: boolean;
  default_value: string | null;
}

interface StepConfig {
  key: string;
  label: string;
  tableName: string;
  icon: string;
  description: string;
  required: boolean;
}

interface FieldMeta {
  label: string;
  placeholder: string;
  help?: string;
  group?: string;
  options?: { value: string; label: string }[];
  hidden?: boolean;
  wide?: boolean;
}

@Component({
  selector: 'app-producto-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container py-4" style="max-width: 960px;">
      <!-- Header -->
      <div class="d-flex align-items-center mb-4 gap-3">
        <button class="btn btn-outline-secondary" (click)="volver()">
          <i class="bi bi-arrow-left me-1"></i>Volver
        </button>
        <div>
          <h2 class="mb-0"><i class="bi bi-box-seam text-primary me-2"></i>Crear Producto</h2>
          <small class="text-muted">Complete los pasos para registrar un nuevo producto en el inventario</small>
        </div>
      </div>

      <!-- Steps Progress -->
      <div class="d-flex justify-content-between mb-4 position-relative">
        <div class="position-absolute" style="top: 20px; left: 12%; right: 12%; height: 3px; background: #dee2e6; z-index: 0;">
          <div class="h-100 bg-primary transition-all" [style.width.%]="progressPercent()"></div>
        </div>
        <div *ngFor="let step of steps; let i = index"
             class="text-center position-relative" style="z-index: 1; flex: 1;">
          <div class="rounded-circle d-inline-flex align-items-center justify-content-center mb-1"
               [class]="getStepCircleClass(i)"
               style="width: 40px; height: 40px; cursor: pointer;"
               (click)="goToStep(i)">
            <i *ngIf="currentStep() > i" class="bi bi-check-lg"></i>
            <span *ngIf="currentStep() <= i">{{ i + 1 }}</span>
          </div>
          <div class="small" [class.fw-bold]="currentStep() === i"
               [class.text-primary]="currentStep() === i"
               [class.text-muted]="currentStep() !== i">
            {{ step.label }}
          </div>
        </div>
      </div>

      <!-- Alerts -->
      <div *ngIf="successMsg()" class="alert alert-success alert-dismissible fade show">
        <i class="bi bi-check-circle me-2"></i>{{ successMsg() }}
        <button type="button" class="btn-close" (click)="successMsg.set('')"></button>
      </div>
      <div *ngIf="errorMsg()" class="alert alert-danger alert-dismissible fade show">
        <i class="bi bi-exclamation-triangle me-2"></i>{{ errorMsg() }}
        <button type="button" class="btn-close" (click)="errorMsg.set('')"></button>
      </div>

      <!-- Loading columns -->
      <div *ngIf="loadingColumns()" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="text-muted mt-2">Cargando estructura de {{ currentStepConfig().tableName }}...</p>
      </div>

      <!-- Step Content -->
      <div *ngIf="!loadingColumns()" class="card shadow-sm mb-4">
        <div class="card-header d-flex align-items-center gap-2" [class]="getStepHeaderClass()">
          <i [class]="currentStepConfig().icon"></i>
          <strong>{{ currentStepConfig().label }}</strong>
          <span class="ms-auto badge" [class]="currentStepConfig().required ? 'bg-danger' : 'bg-secondary'">
            {{ currentStepConfig().required ? 'Requerido' : 'Opcional' }}
          </span>
        </div>
        <div class="card-body">
          <!-- Step description -->
          <div class="alert alert-light border-start border-4 border-primary mb-4">
            <div class="d-flex align-items-start gap-2">
              <i class="bi bi-lightbulb text-primary fs-5 mt-1"></i>
              <div>
                <strong>{{ currentStepConfig().description }}</strong>
                <div class="text-muted small mt-1">
                  {{ stepTip() }}
                </div>
              </div>
            </div>
          </div>

          <!-- Skip optional step -->
          <div *ngIf="!currentStepConfig().required" class="mb-3">
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" id="skipStep"
                     [checked]="skipCurrentStep()" (change)="toggleSkip()">
              <label class="form-check-label" for="skipStep">
                <i class="bi bi-skip-forward me-1"></i>Omitir este paso (podrá completarse después)
              </label>
            </div>
          </div>

          <!-- GROUPED Form fields -->
          <div *ngIf="!skipCurrentStep()">
            <ng-container *ngFor="let group of fieldGroups()">
              <div *ngIf="group.label" class="field-group-header mt-3 mb-2">
                <i [class]="group.icon" class="me-1"></i>
                <span class="fw-semibold text-secondary">{{ group.label }}</span>
                <hr class="mt-1 mb-0">
              </div>
              <div class="row g-3 mb-2">
                <div *ngFor="let col of group.columns"
                     [class]="getFieldMeta(col.name).wide ? 'col-md-12' : 'col-md-6'">
                  <label class="form-label small fw-semibold mb-0">
                    {{ getFieldMeta(col.name).label }}
                    <span *ngIf="!col.is_nullable" class="text-danger">*</span>
                  </label>
                  <div *ngIf="getFieldMeta(col.name).help" class="form-text mt-0 mb-1" style="font-size:0.72rem; line-height:1.2;">
                    {{ getFieldMeta(col.name).help }}
                  </div>

                  <!-- Select options (for fields with predefined values) -->
                  <select *ngIf="getFieldMeta(col.name).options"
                          class="form-select form-select-sm"
                          [ngModel]="getFormValue(col.name)"
                          (ngModelChange)="setFormValue(col.name, $event)">
                    <option value="">{{ getFieldMeta(col.name).placeholder }}</option>
                    <option *ngFor="let opt of getFieldMeta(col.name).options" [value]="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>

                  <!-- Text/varchar -->
                  <input *ngIf="isTextType(col.type) && !getFieldMeta(col.name).options" type="text"
                         class="form-control form-control-sm"
                         [placeholder]="getFieldMeta(col.name).placeholder"
                         [attr.maxlength]="col.max_length > 0 ? col.max_length : null"
                         [ngModel]="getFormValue(col.name)"
                         (ngModelChange)="setFormValue(col.name, $event)">

                  <!-- Number -->
                  <input *ngIf="isNumberType(col.type) && !getFieldMeta(col.name).options" type="number"
                         class="form-control form-control-sm"
                         [placeholder]="getFieldMeta(col.name).placeholder"
                         [ngModel]="getFormValue(col.name)"
                         (ngModelChange)="setFormValue(col.name, $event)"
                         step="any">

                  <!-- Money -->
                  <div *ngIf="isMoneyType(col.type)" class="input-group input-group-sm">
                    <span class="input-group-text">$</span>
                    <input type="number" class="form-control"
                           [placeholder]="getFieldMeta(col.name).placeholder"
                           [ngModel]="getFormValue(col.name)"
                           (ngModelChange)="setFormValue(col.name, $event)"
                           step="0.01">
                  </div>

                  <!-- Datetime -->
                  <input *ngIf="isDateType(col.type)" type="datetime-local"
                         class="form-control form-control-sm"
                         [placeholder]="getFieldMeta(col.name).placeholder"
                         [ngModel]="getFormValue(col.name)"
                         (ngModelChange)="setFormValue(col.name, $event)">

                  <!-- Bit/boolean -->
                  <select *ngIf="col.type === 'bit'" class="form-select form-select-sm"
                          [ngModel]="getFormValue(col.name)"
                          (ngModelChange)="setFormValue(col.name, $event)">
                    <option value="">{{ getFieldMeta(col.name).placeholder }}</option>
                    <option value="1">Sí</option>
                    <option value="0">No</option>
                  </select>

                  <!-- Max length hint for text fields -->
                  <div *ngIf="isTextType(col.type) && col.max_length > 0 && col.max_length <= 100"
                       class="form-text mt-0" style="font-size:0.68rem;">
                    Máx. {{ col.max_length }} caracteres
                  </div>
                </div>
              </div>
            </ng-container>
          </div>

          <div *ngIf="editableColumns().length === 0 && !skipCurrentStep()" class="text-center text-muted py-4">
            <i class="bi bi-info-circle fs-3 d-block mb-2"></i>
            No se encontraron columnas editables para esta tabla.
          </div>
        </div>
      </div>

      <!-- Navigation buttons -->
      <div class="d-flex justify-content-between">
        <button class="btn btn-outline-secondary"
                [disabled]="currentStep() === 0"
                (click)="prevStep()">
          <i class="bi bi-arrow-left me-1"></i>Anterior
        </button>

        <div class="d-flex gap-2">
          <button *ngIf="currentStep() < steps.length - 1"
                  class="btn btn-primary"
                  (click)="nextStep()">
            Siguiente<i class="bi bi-arrow-right ms-1"></i>
          </button>

          <button *ngIf="currentStep() === steps.length - 1"
                  class="btn btn-success btn-lg"
                  [disabled]="isSaving()"
                  (click)="guardarProducto()">
            <span *ngIf="isSaving()" class="spinner-border spinner-border-sm me-2"></span>
            <i *ngIf="!isSaving()" class="bi bi-check-lg me-2"></i>
            {{ isSaving() ? 'Guardando...' : 'Crear Producto' }}
          </button>
        </div>
      </div>

      <!-- Summary panel -->
      <div *ngIf="currentStep() === steps.length - 1 && !isSaving()" class="card mt-4 border-info">
        <div class="card-header bg-info text-white">
          <i class="bi bi-clipboard-check me-2"></i>Resumen del producto a crear
        </div>
        <div class="card-body">
          <div *ngFor="let step of steps; let i = index" class="mb-3">
            <h6 class="d-flex align-items-center gap-2">
              <i [class]="step.icon"></i>{{ step.label }}
              <span *ngIf="skippedSteps[step.key]" class="badge bg-secondary">Omitido</span>
            </h6>
            <div *ngIf="!skippedSteps[step.key]">
              <div *ngFor="let entry of getFilledFields(step.key)" class="row mb-1">
                <div class="col-4 text-muted small">{{ getFieldMeta(entry[0]).label || entry[0] }}</div>
                <div class="col-8 small fw-semibold">{{ entry[1] }}</div>
              </div>
              <div *ngIf="getFilledFields(step.key).length === 0" class="text-muted small fst-italic">
                <i class="bi bi-dash-circle me-1"></i>Sin datos ingresados
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .transition-all { transition: width 0.3s ease; }
    .field-group-header { font-size: 0.85rem; }
    .field-group-header hr { border-color: #dee2e6; }
    .form-label { color: #495057; }
  `]
})
export class ProductoWizardComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);

  steps: StepConfig[] = [
    { key: 'item', label: 'Item', tableName: 't120_mc_items', icon: 'bi bi-box', description: 'Datos principales del producto: referencia, descripcion, unidades de medida y configuracion de compra/venta.', required: true },
    { key: 'extensiones', label: 'Extensiones', tableName: 't121_mc_items_extensiones', icon: 'bi bi-puzzle', description: 'Atributos extendidos: variantes como talla, color u otras propiedades del item.', required: false },
    { key: 'precio', label: 'Precio', tableName: 't126_mc_items_precios', icon: 'bi bi-currency-dollar', description: 'Configuracion de precios: precio base, minimo, maximo y sugerido por lista.', required: false },
    { key: 'existencia', label: 'Stock', tableName: 't400_cm_existencia', icon: 'bi bi-building', description: 'Existencia inicial: bodega, cantidades actuales y niveles de reorden.', required: false },
  ];

  /** Friendly metadata for known fields */
  private fieldMetaMap: Record<string, FieldMeta> = {
    // === t120_mc_items - ITEM ===
    // Identificacion
    f120_id_cia:              { label: 'Compania', placeholder: 'Ej: 1', help: 'ID numerico de la compania (generalmente 1 para empresa principal).', group: 'id' },
    f120_id:                  { label: 'ID del Item', placeholder: 'Ej: 1001', help: 'Codigo numerico unico interno del item. Se asigna automaticamente o puede definirlo.', group: 'id' },
    f120_referencia:          { label: 'Referencia', placeholder: 'Ej: TORNILLO-HEX-1/2', help: 'Codigo alfanumerico que identifica al producto (SKU). Hasta 50 caracteres.', group: 'id' },
    f120_descripcion:         { label: 'Descripcion', placeholder: 'Ej: Tornillo hexagonal 1/2 pulgada', help: 'Nombre completo del producto. Maximo 40 caracteres.', group: 'id' },
    f120_descripcion_corta:   { label: 'Descripcion corta', placeholder: 'Ej: Tornillo hex 1/2', help: 'Version abreviada del nombre (20 caracteres max). Se muestra en listados.', group: 'id' },
    f120_notas:               { label: 'Notas / Observaciones', placeholder: 'Ej: Producto importado, requiere inspeccion de calidad', help: 'Comentarios adicionales sobre el producto.', group: 'id', wide: true },

    // Clasificacion
    f120_id_grupo_impositivo: { label: 'Grupo Impositivo', placeholder: 'Ej: IVA1', help: 'Codigo del grupo de impuestos que aplica (IVA, excluido, exento, etc).', group: 'clasif' },
    f120_id_tipo_inv_serv:    { label: 'Tipo Inventario/Servicio', placeholder: 'Ej: INV o SERV', help: 'Clasifica si es producto de inventario o un servicio.', group: 'clasif' },
    f120_id_grupo_dscto:      { label: 'Grupo de Descuento', placeholder: 'Ej: DSC1', help: 'Grupo al que pertenece para aplicar descuentos automaticos.', group: 'clasif' },
    f120_ind_tipo_item:       { label: 'Tipo de Item', placeholder: '-- Seleccionar --', help: 'Define la naturaleza: producto terminado, materia prima, servicio, etc.', group: 'clasif',
                                options: [{ value: '1', label: '1 - Producto terminado' }, { value: '2', label: '2 - Materia prima' }, { value: '3', label: '3 - Servicio' }, { value: '4', label: '4 - Activo fijo' }] },

    // Flags compra/venta/manufactura
    f120_ind_compra:          { label: 'Se compra?', placeholder: '-- Seleccionar --', help: 'Indica si este item se puede adquirir a proveedores.', group: 'flags',
                                options: [{ value: '1', label: 'Si - Se compra' }, { value: '0', label: 'No - No se compra' }] },
    f120_ind_venta:           { label: 'Se vende?', placeholder: '-- Seleccionar --', help: 'Indica si este item se comercializa a clientes.', group: 'flags',
                                options: [{ value: '1', label: 'Si - Se vende' }, { value: '0', label: 'No - No se vende' }] },
    f120_ind_manufactura:     { label: 'Se manufactura?', placeholder: '-- Seleccionar --', help: 'Indica si el item se fabrica internamente.', group: 'flags',
                                options: [{ value: '1', label: 'Si - Se manufactura' }, { value: '0', label: 'No' }] },
    f120_ind_lote:            { label: 'Maneja lote?', placeholder: '-- Seleccionar --', help: 'Activar si el producto requiere trazabilidad por lote.', group: 'flags',
                                options: [{ value: '1', label: 'Si - Maneja lote' }, { value: '0', label: 'No' }] },
    f120_ind_serial:          { label: 'Maneja serial?', placeholder: '-- Seleccionar --', help: 'Activar si cada unidad requiere numero de serie.', group: 'flags',
                                options: [{ value: '1', label: 'Si - Maneja serial' }, { value: '0', label: 'No' }] },
    f120_ind_sobrecostos:     { label: 'Permite sobrecostos?', placeholder: '-- Seleccionar --', group: 'flags',
                                options: [{ value: '1', label: 'Si' }, { value: '0', label: 'No' }] },
    f120_ind_exento:          { label: 'Exento de impuestos?', placeholder: '-- Seleccionar --', group: 'flags',
                                options: [{ value: '1', label: 'Si - Exento' }, { value: '0', label: 'No' }] },
    f120_ind_paquete:         { label: 'Es paquete/kit?', placeholder: '-- Seleccionar --', help: 'Indica si es un conjunto de varios items.', group: 'flags',
                                options: [{ value: '1', label: 'Si - Es paquete' }, { value: '0', label: 'No' }] },
    f120_ind_lista_precios_ext: { label: 'Lista precios externa?', placeholder: '-- Seleccionar --', group: 'flags',
                                  options: [{ value: '1', label: 'Si' }, { value: '0', label: 'No' }] },
    f120_ind_lote_asignacion: { label: 'Asignacion auto lote?', placeholder: '-- Seleccionar --', group: 'flags',
                                options: [{ value: '1', label: 'Si' }, { value: '0', label: 'No' }] },
    f120_ind_venta_interno:   { label: 'Venta interna?', placeholder: '-- Seleccionar --', group: 'flags',
                                options: [{ value: '1', label: 'Si' }, { value: '0', label: 'No' }] },
    f120_ind_generico:        { label: 'Es generico?', placeholder: '-- Seleccionar --', group: 'flags',
                                options: [{ value: '1', label: 'Si' }, { value: '0', label: 'No' }] },
    f120_ind_controlado:      { label: 'Es controlado?', placeholder: '-- Seleccionar --', group: 'flags',
                                options: [{ value: '1', label: 'Si' }, { value: '0', label: 'No' }] },
    f120_ind_gum_unificado:   { label: 'GUM Unificado?', placeholder: '-- Seleccionar --', group: 'flags',
                                options: [{ value: '1', label: 'Si' }, { value: '0', label: 'No' }] },

    // Unidades de medida
    f120_id_unidad_inventario:{ label: 'Unidad de Inventario', placeholder: 'Ej: UND, KG, MT, LT', help: 'Unidad base para control de existencias (UND=unidad, KG=kilogramo, etc).', group: 'und' },
    f120_id_unidad_orden:     { label: 'Unidad de Orden(compra)', placeholder: 'Ej: CJ, BL, UND', help: 'Unidad en que se realiza la compra al proveedor (CJ=caja, BL=bulto).', group: 'und' },
    f120_id_unidad_adicional: { label: 'Unidad Adicional', placeholder: 'Ej: CJ', help: 'Segunda unidad de medida si el item se maneja en doble unidad.', group: 'und' },
    f120_id_unidad_empaque:   { label: 'Unidad de Empaque', placeholder: 'Ej: PK, CJ', help: 'Unidad en que se empaca el producto para despacho.', group: 'und' },
    f120_id_unidad_precio:    { label: 'Unidad de Precio', placeholder: 'Ej: UND', help: 'Unidad a la que se asocia el precio de venta.', group: 'und' },

    // Proveedor/cliente
    f120_rowid_tercero_prov:  { label: 'Proveedor principal (rowid)', placeholder: 'Ej: 100', help: 'RowID del tercero proveedor principal para este producto.', group: 'terceros' },
    f120_id_sucursal_prov:    { label: 'Sucursal proveedor', placeholder: 'Ej: 001', help: 'Codigo de sucursal del proveedor principal.', group: 'terceros' },
    f120_rowid_tercero_cli:   { label: 'Cliente asociado (rowid)', placeholder: 'Ej: 200', help: 'RowID del tercero cliente si aplica exclusividad.', group: 'terceros' },
    f120_id_sucursal_cli:     { label: 'Sucursal cliente', placeholder: 'Ej: 001', group: 'terceros' },

    // Otros
    f120_vida_util:           { label: 'Vida util (dias)', placeholder: 'Ej: 365', help: 'Dias de vida util del producto desde fabricacion. 0 = no aplica.', group: 'otros' },
    f120_id_descripcion_tecnica: { label: 'Descripcion tecnica', placeholder: 'Ej: DT1', help: 'Codigo de la ficha tecnica asociada.', group: 'otros' },
    f120_id_extension1:       { label: 'Extension 1', placeholder: 'Ej: TA (Talla)', help: 'Primera dimension de variante (talla, color, etc).', group: 'otros' },
    f120_id_extension2:       { label: 'Extension 2', placeholder: 'Ej: CO (Color)', help: 'Segunda dimension de variante.', group: 'otros' },
    f120_id_segmento_costo:   { label: 'Segmento de costo', placeholder: 'Ej: 1', help: 'Segmento para clasificacion de costos.', group: 'otros' },
    f120_id_cfg_serial:       { label: 'Config. serial', placeholder: 'Ej: SER001', help: 'Configuracion de generacion de seriales.', group: 'otros' },
    f120_ts:                  { label: 'Timestamp', placeholder: '', hidden: true, group: 'otros' },
    f120_rowid_foto:          { label: 'Foto (rowid)', placeholder: 'Ej: 0', group: 'otros' },
    f120_usuario_creacion:    { label: 'Usuario creacion', placeholder: 'Se asigna automaticamente', group: 'otros' },
    f120_usuario_actualizacion:{ label: 'Usuario actualizacion', placeholder: 'Se asigna automaticamente', group: 'otros' },
    f120_fecha_creacion:      { label: 'Fecha creacion', placeholder: '', group: 'otros' },
    f120_fecha_actualizacion: { label: 'Fecha actualizacion', placeholder: '', group: 'otros' },
    f120_rowid_movto_entidad: { label: 'Movimiento entidad (rowid)', placeholder: 'Ej: 0', group: 'otros' },

    // === t121_mc_items_extensiones ===
    f121_id_cia:              { label: 'Compania', placeholder: 'Ej: 1', help: 'Mismo ID de compania del item.', group: 'ext_id' },
    f121_rowid_item:          { label: 'Item (rowid)', placeholder: 'Ej: 1001', help: 'RowID del item padre al que pertenece esta extension.', group: 'ext_id' },
    f121_id_ext1_detalle:     { label: 'Detalle Extension 1', placeholder: 'Ej: M, L, XL (para talla)', help: 'Valor especifico de la primera extension: talla, sabor, etc.', group: 'ext_id' },
    f121_id_ext2_detalle:     { label: 'Detalle Extension 2', placeholder: 'Ej: ROJO, AZUL (para color)', help: 'Valor especifico de la segunda extension.', group: 'ext_id' },
    f121_id_extension1:       { label: 'Tipo Extension 1', placeholder: 'Ej: TA', help: 'Codigo de la dimension (debe coincidir con el item padre).', group: 'ext_id' },
    f121_id_extension2:       { label: 'Tipo Extension 2', placeholder: 'Ej: CO', group: 'ext_id' },
    f121_ind_estado:          { label: 'Estado', placeholder: '-- Seleccionar --', help: 'Estado de la extension: 1=Activo, 0=Inactivo.', group: 'ext_config',
                                options: [{ value: '1', label: '1 - Activo' }, { value: '0', label: '0 - Inactivo' }] },
    f121_notas:               { label: 'Notas', placeholder: 'Ej: Variante exclusiva para temporada verano', group: 'ext_config', wide: true },
    f121_id_barras_principal:  { label: 'Codigo de barras', placeholder: 'Ej: 7702004001234', help: 'EAN-13 o codigo de barras unico de esta variante.', group: 'ext_config' },
    f121_ts:                  { label: 'Timestamp', placeholder: '', hidden: true, group: 'ext_config' },
    f121_fecha_inactivacion:  { label: 'Fecha inactivacion', placeholder: '', group: 'ext_config' },
    f121_fecha_creacion:      { label: 'Fecha creacion', placeholder: '', group: 'ext_config' },
    f121_fecha_actualizacion: { label: 'Fecha actualizacion', placeholder: '', group: 'ext_config' },
    f121_rowid_foto:          { label: 'Foto (rowid)', placeholder: 'Ej: 0', group: 'ext_config' },
    f121_usuario_inactivacion:{ label: 'Usuario inactivacion', placeholder: 'Automatico', group: 'ext_config' },
    f121_usuario_creacion:    { label: 'Usuario creacion', placeholder: 'Automatico', group: 'ext_config' },
    f121_usuario_actualizacion:{ label: 'Usuario actualizacion', placeholder: 'Automatico', group: 'ext_config' },
    f121_rowid_movto_entidad: { label: 'Movimiento entidad', placeholder: 'Ej: 0', group: 'ext_config' },
    f121_porc_max_exceso_kit: { label: 'Exceso max kit (%)', placeholder: 'Ej: 10.00', help: 'Porcentaje maximo de exceso permitido en kits.', group: 'ext_config' },
    f121_porc_min_exceso_kit: { label: 'Exceso min kit (%)', placeholder: 'Ej: 0.00', group: 'ext_config' },
    f121_id_unidad_validacion_kit: { label: 'Unidad validacion kit', placeholder: 'Ej: UND', group: 'ext_config' },
    f121_id_plan_kit:         { label: 'Plan de kit', placeholder: 'Ej: PK1', group: 'ext_config' },
    f121_rowid_item_ext_gen:  { label: 'Extension generica (rowid)', placeholder: 'Ej: 0', group: 'ext_config' },

    // === t126_mc_items_precios ===
    f126_id_cia:              { label: 'Compania', placeholder: 'Ej: 1', group: 'precio_id' },
    f126_id_lista_precio:     { label: 'Lista de Precios', placeholder: 'Ej: LP1, VTA, PUB', help: 'Codigo de la lista a la que se asigna (LP1=lista 1, VTA=venta, PUB=publico).', group: 'precio_id' },
    f126_rowid_item:          { label: 'Item (rowid)', placeholder: 'Ej: 1001', help: 'RowID del item al que se le asigna precio.', group: 'precio_id' },
    f126_rowid_item_ext:      { label: 'Extension (rowid)', placeholder: 'Ej: 0', help: 'RowID de la extension especifica (0 si no aplica).', group: 'precio_id' },
    f126_id_unidad_medida:    { label: 'Unidad de medida', placeholder: 'Ej: UND, KG', help: 'Unidad en la que se expresa el precio.', group: 'precio_id' },
    f126_fecha_activacion:    { label: 'Fecha de activacion', placeholder: '', help: 'Desde cuando rige este precio.', group: 'precio_id' },
    f126_fecha_inactivacion:  { label: 'Fecha de inactivacion', placeholder: '', help: 'Hasta cuando rige (vacio = vigente indefinidamente).', group: 'precio_id' },
    f126_precio:              { label: 'Precio base', placeholder: 'Ej: 25000.00', help: 'Precio unitario estandar de venta.', group: 'precio_val' },
    f126_precio_minimo:       { label: 'Precio minimo', placeholder: 'Ej: 20000.00', help: 'Piso: no se puede vender por debajo de este valor.', group: 'precio_val' },
    f126_precio_maximo:       { label: 'Precio maximo', placeholder: 'Ej: 35000.00', help: 'Techo: limite superior del precio de venta.', group: 'precio_val' },
    f126_precio_sugerido:     { label: 'Precio sugerido', placeholder: 'Ej: 28000.00', help: 'Precio de referencia sugerido al publico.', group: 'precio_val' },
    f126_rowid_promo_dscto:   { label: 'Promo/Descuento (rowid)', placeholder: 'Ej: 0', help: 'Asociar a una promocion o esquema de descuento.', group: 'precio_val' },
    f126_puntos_fiel:         { label: 'Puntos fidelizacion', placeholder: 'Ej: 100', help: 'Puntos que se otorgan por compra de este item.', group: 'precio_val' },
    f126_ind_exclusivo_oferta:{ label: 'Exclusivo en oferta?', placeholder: '-- Seleccionar --', group: 'precio_val',
                                options: [{ value: '1', label: 'Si - Solo en oferta' }, { value: '0', label: 'No' }] },
    f126_notas:               { label: 'Notas de precio', placeholder: 'Ej: Precio negociado para cliente mayorista', group: 'precio_val', wide: true },
    f126_ts:                  { label: 'Timestamp', placeholder: '', hidden: true, group: 'precio_val' },
    f126_usuario_creacion:    { label: 'Usuario creacion', placeholder: 'Automatico', group: 'precio_val' },
    f126_usuario_actualizacion:{ label: 'Usuario actualizacion', placeholder: 'Automatico', group: 'precio_val' },
    f126_fecha_ts_creacion:   { label: 'Fecha creacion', placeholder: '', group: 'precio_val' },
    f126_fecha_ts_actualizacion:{ label: 'Fecha actualizacion', placeholder: '', group: 'precio_val' },

    // === t400_cm_existencia ===
    f400_id_cia:              { label: 'Compania', placeholder: 'Ej: 1', group: 'stock_id' },
    f400_rowid_item_ext:      { label: 'Item/Extension (rowid)', placeholder: 'Ej: 1001', help: 'RowID de la extension del item (t121).', group: 'stock_id' },
    f400_rowid_bodega:        { label: 'Bodega (rowid)', placeholder: 'Ej: 1', help: 'RowID de la bodega donde se almacena el producto.', group: 'stock_id' },
    f400_id_ubicacion_aux:    { label: 'Ubicacion auxiliar', placeholder: 'Ej: PAS-A3-EST2', help: 'Ubicacion fisica en bodega (pasillo-anaquelestante).', group: 'stock_id' },
    f400_id_instalacion:      { label: 'Instalacion', placeholder: 'Ej: BOG', help: 'Codigo de la planta o centro de distribucion.', group: 'stock_id' },
    f400_cant_existencia_1:   { label: 'Existencia actual (Und 1)', placeholder: 'Ej: 500', help: 'Cantidad disponible en la unidad de inventario principal.', group: 'stock_cant' },
    f400_cant_existencia_2:   { label: 'Existencia actual (Und 2)', placeholder: 'Ej: 0', help: 'Cantidad en la segunda unidad de medida (si aplica).', group: 'stock_cant' },
    f400_cant_comprometida_1: { label: 'Comprometida (Und 1)', placeholder: 'Ej: 50', help: 'Unidades reservadas para pedidos pendientes.', group: 'stock_cant' },
    f400_cant_comprometida_2: { label: 'Comprometida (Und 2)', placeholder: 'Ej: 0', group: 'stock_cant' },
    f400_cant_pendiente_entrar_1:{ label: 'Pendiente entrar (Und 1)', placeholder: 'Ej: 100', help: 'Unidades en ordenes de compra pendientes de recibir.', group: 'stock_cant' },
    f400_cant_pendiente_salir_1: { label: 'Pendiente salir (Und 1)', placeholder: 'Ej: 20', help: 'Unidades pendientes de despacho.', group: 'stock_cant' },
    f400_cant_salida_sin_conf_1: { label: 'Salida sin confirmar (Und 1)', placeholder: 'Ej: 0', group: 'stock_cant' },
    f400_cant_salida_sin_conf_2: { label: 'Salida sin confirmar (Und 2)', placeholder: 'Ej: 0', group: 'stock_cant' },
    f400_cant_pendiente_salir_2: { label: 'Pendiente salir (Und 2)', placeholder: 'Ej: 0', group: 'stock_cant' },
    f400_cant_nivel_min_1:    { label: 'Stock minimo', placeholder: 'Ej: 100', help: 'Cuando baje de este nivel se genera alerta de reorden.', group: 'stock_nivel' },
    f400_cant_nivel_max_1:    { label: 'Stock maximo', placeholder: 'Ej: 1000', help: 'Limite superior para no sobre-stockear.', group: 'stock_nivel' },
    f400_cant_nivel_pedido:   { label: 'Nivel de pedido', placeholder: 'Ej: 200', help: 'Cantidad sugerida a pedir cuando se alcanza el minimo.', group: 'stock_nivel' },
    f400_costo_prom_uni:      { label: 'Costo promedio unitario', placeholder: 'Ej: 15000.00', help: 'Costo promedio ponderado por unidad.', group: 'stock_costo' },
    f400_costo_prom_tot:      { label: 'Costo promedio total', placeholder: 'Ej: 7500000.00', help: 'Costo total = costo promedio x existencia.', group: 'stock_costo' },
    f400_consumo_promedio:    { label: 'Consumo promedio', placeholder: 'Ej: 50000.00', help: 'Valor monetario de consumo promedio mensual.', group: 'stock_costo' },
    f400_abc_rotacion_costo:  { label: 'ABC Rotacion (costo)', placeholder: 'Ej: A, B o C', help: 'Clasificacion ABC por costo: A=alto, B=medio, C=bajo.', group: 'stock_clasif' },
    f400_abc_rotacion_veces:  { label: 'ABC Rotacion (veces)', placeholder: 'Ej: A, B o C', help: 'Clasificacion ABC por frecuencia de movimiento.', group: 'stock_clasif' },
    f400_categoria_ciclo_conteo: { label: 'Ciclo de conteo', placeholder: 'Ej: MEN, TRI, SEM', help: 'Frecuencia de inventario fisico (MEN=mensual, TRI=trimestral).', group: 'stock_clasif' },
    f400_fecha_ult_conteo:    { label: 'Ultimo conteo', placeholder: '', help: 'Fecha del ultimo inventario fisico.', group: 'stock_fechas' },
    f400_fecha_ult_compra:    { label: 'Ultima compra', placeholder: '', help: 'Fecha de la ultima recepcion de compra.', group: 'stock_fechas' },
    f400_fecha_ult_venta:     { label: 'Ultima venta', placeholder: '', group: 'stock_fechas' },
    f400_fecha_ult_entrada:   { label: 'Ultima entrada', placeholder: '', group: 'stock_fechas' },
    f400_fecha_ult_salida:    { label: 'Ultima salida', placeholder: '', group: 'stock_fechas' },
    f400_fecha_ult_consumo_prom: { label: 'Ult. consumo promedio', placeholder: '', group: 'stock_fechas' },
    f400_cant_pos_1:          { label: 'Cantidad POS (Und 1)', placeholder: 'Ej: 0', group: 'stock_cant' },
    f400_cant_pos_2:          { label: 'Cantidad POS (Und 2)', placeholder: 'Ej: 0', group: 'stock_cant' },
  };

  /** Group definitions per step */
  private groupDefs: Record<string, { label: string; icon: string; groups: string[] }[]> = {
    item: [
      { label: 'Identificacion del Producto', icon: 'bi bi-tag', groups: ['id'] },
      { label: 'Clasificacion', icon: 'bi bi-diagram-3', groups: ['clasif'] },
      { label: 'Configuracion Compra / Venta / Estado', icon: 'bi bi-toggles', groups: ['flags'] },
      { label: 'Unidades de Medida', icon: 'bi bi-rulers', groups: ['und'] },
      { label: 'Proveedor / Cliente', icon: 'bi bi-people', groups: ['terceros'] },
      { label: 'Otros datos', icon: 'bi bi-gear', groups: ['otros'] },
    ],
    extensiones: [
      { label: 'Identificacion de la Extension', icon: 'bi bi-puzzle', groups: ['ext_id'] },
      { label: 'Configuracion y Datos', icon: 'bi bi-sliders', groups: ['ext_config'] },
    ],
    precio: [
      { label: 'Identificacion de Lista', icon: 'bi bi-list-columns', groups: ['precio_id'] },
      { label: 'Valores y Precios', icon: 'bi bi-cash-coin', groups: ['precio_val'] },
    ],
    existencia: [
      { label: 'Bodega y Ubicacion', icon: 'bi bi-geo-alt', groups: ['stock_id'] },
      { label: 'Cantidades', icon: 'bi bi-boxes', groups: ['stock_cant'] },
      { label: 'Niveles de Reorden', icon: 'bi bi-graph-up-arrow', groups: ['stock_nivel'] },
      { label: 'Costos', icon: 'bi bi-cash-stack', groups: ['stock_costo'] },
      { label: 'Clasificacion ABC', icon: 'bi bi-sort-alpha-down', groups: ['stock_clasif'] },
      { label: 'Fechas de Ultimo Movimiento', icon: 'bi bi-calendar-event', groups: ['stock_fechas'] },
    ],
  };

  /** Tips per step */
  private stepTips: Record<string, string> = {
    item: 'Los campos marcados con * son obligatorios. Como minimo complete la referencia, descripcion, unidad de inventario y los indicadores de compra/venta.',
    extensiones: 'Use extensiones para manejar variantes del producto (ej: talla M color Rojo). Si el producto no tiene variantes, puede omitir este paso.',
    precio: 'Defina al menos un precio base en una lista de precios. El precio minimo y maximo son opcionales pero ayudan a prevenir errores de digitacion.',
    existencia: 'Configure la bodega inicial y los niveles de stock. Los campos de cantidad se actualizan automaticamente con los movimientos del sistema.',
  };

  currentStep = signal(0);
  loadingColumns = signal(false);
  isSaving = signal(false);
  successMsg = signal('');
  errorMsg = signal('');

  columnsMap: Record<string, ColumnInfo[]> = {};
  columnsVersion = signal(0); // trigger recompute when columns are loaded

  formDataMap: Record<string, Record<string, any>> = {
    item: {},
    extensiones: {},
    precio: {},
    existencia: {},
  };

  skippedSteps: Record<string, boolean> = {
    item: false,
    extensiones: false,
    precio: false,
    existencia: false,
  };
  skippedVersion = signal(0);

  currentStepConfig = computed(() => this.steps[this.currentStep()]);

  progressPercent = computed(() => {
    return Math.round((this.currentStep() / (this.steps.length - 1)) * 100);
  });

  editableColumns = computed(() => {
    this.columnsVersion(); // reactive dependency
    const cols = this.columnsMap[this.currentStepConfig().key] || [];
    return cols.filter(c =>
      !c.is_identity &&
      !c.is_computed &&
      c.type !== 'timestamp' &&
      !this.getFieldMeta(c.name).hidden
    );
  });

  skipCurrentStep = computed(() => {
    this.skippedVersion();
    return this.skippedSteps[this.currentStepConfig().key];
  });

  private fieldMetaCache: Record<string, FieldMeta> = {};

  getFieldMeta(colName: string): FieldMeta {
    if (!this.fieldMetaCache[colName]) {
      this.fieldMetaCache[colName] = this.fieldMetaMap[colName] || {
        label: colName,
        placeholder: colName,
      };
    }
    return this.fieldMetaCache[colName];
  }

  stepTip = computed(() => {
    return this.stepTips[this.currentStepConfig().key] || '';
  });

  fieldGroups = computed(() => {
    const stepKey = this.currentStepConfig().key;
    const groupDef = this.groupDefs[stepKey];
    const cols = this.editableColumns();

    if (!groupDef) {
      return [{ label: '', icon: '', columns: cols }];
    }

    const assignedGroups = new Set<string>();
    groupDef.forEach(g => g.groups.forEach(gr => assignedGroups.add(gr)));

    const result: { label: string; icon: string; columns: ColumnInfo[] }[] = [];
    for (const gd of groupDef) {
      const groupCols = cols.filter(c => {
        const meta = this.fieldMetaMap[c.name];
        return meta && gd.groups.includes(meta.group || '');
      });
      if (groupCols.length > 0) {
        result.push({ label: gd.label, icon: gd.icon, columns: groupCols });
      }
    }

    // Ungrouped columns
    const ungrouped = cols.filter(c => {
      const meta = this.fieldMetaMap[c.name];
      return !meta || !meta.group || !assignedGroups.has(meta.group);
    });
    if (ungrouped.length > 0) {
      result.push({ label: 'Otros campos', icon: 'bi bi-three-dots', columns: ungrouped });
    }

    return result;
  });

  ngOnInit() {
    this.loadStepColumns();
  }

  loadStepColumns() {
    const step = this.currentStepConfig();
    if (this.columnsMap[step.key]) return; // already loaded

    this.loadingColumns.set(true);
    this.http.get<any>(`http://localhost:3000/api/maestras/structure/${step.tableName}`).subscribe({
      next: (res) => {
        this.columnsMap[step.key] = res.columns || [];
        this.columnsVersion.update(v => v + 1);
        this.loadingColumns.set(false);
      },
      error: (err) => {
        this.errorMsg.set(`Error cargando estructura de ${step.tableName}: ${err.error?.message || err.message}`);
        this.columnsMap[step.key] = [];
        this.columnsVersion.update(v => v + 1);
        this.loadingColumns.set(false);
      }
    });
  }

  getFormValue(colName: string): any {
    const key = this.currentStepConfig().key;
    return this.formDataMap[key][colName] ?? '';
  }

  setFormValue(colName: string, value: any) {
    const key = this.currentStepConfig().key;
    this.formDataMap[key][colName] = value;
  }

  toggleSkip() {
    const key = this.currentStepConfig().key;
    this.skippedSteps[key] = !this.skippedSteps[key];
    this.skippedVersion.update(v => v + 1);
  }

  nextStep() {
    if (this.currentStep() < this.steps.length - 1) {
      this.currentStep.update(s => s + 1);
      this.loadStepColumns();
    }
  }

  prevStep() {
    if (this.currentStep() > 0) {
      this.currentStep.update(s => s - 1);
    }
  }

  goToStep(index: number) {
    if (index <= this.currentStep()) {
      this.currentStep.set(index);
    }
  }

  getStepCircleClass(index: number): string {
    if (index < this.currentStep()) return 'bg-success text-white';
    if (index === this.currentStep()) return 'bg-primary text-white';
    return 'bg-light text-muted border';
  }

  getStepHeaderClass(): string {
    const step = this.currentStepConfig();
    if (step.key === 'item') return 'bg-primary text-white';
    if (step.key === 'extensiones') return 'bg-info text-white';
    if (step.key === 'precio') return 'bg-warning text-dark';
    if (step.key === 'existencia') return 'bg-success text-white';
    return 'bg-light';
  }

  isTextType(type: string): boolean {
    return ['char', 'varchar', 'nchar', 'nvarchar', 'text', 'ntext', 'uniqueidentifier'].includes(type);
  }

  isNumberType(type: string): boolean {
    return ['int', 'bigint', 'smallint', 'tinyint', 'float', 'real', 'decimal', 'numeric'].includes(type);
  }

  isMoneyType(type: string): boolean {
    return ['money', 'smallmoney'].includes(type);
  }

  isDateType(type: string): boolean {
    return ['datetime', 'datetime2', 'date', 'smalldatetime', 'datetimeoffset'].includes(type);
  }

  getFilledFields(stepKey: string): [string, any][] {
    const data = this.formDataMap[stepKey] || {};
    return Object.entries(data).filter(([, val]) => val !== '' && val !== null && val !== undefined);
  }

  guardarProducto() {
    this.isSaving.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');

    // Build payload, omit skipped/empty steps
    const payload: any = { item: this.cleanData(this.formDataMap['item']) };

    if (!this.skippedSteps['extensiones']) {
      const ext = this.cleanData(this.formDataMap['extensiones']);
      if (Object.keys(ext).length > 0) payload.extensiones = ext;
    }

    if (!this.skippedSteps['precio']) {
      const precio = this.cleanData(this.formDataMap['precio']);
      if (Object.keys(precio).length > 0) payload.precio = precio;
    }

    if (!this.skippedSteps['existencia']) {
      const exist = this.cleanData(this.formDataMap['existencia']);
      if (Object.keys(exist).length > 0) payload.existencia = exist;
    }

    if (Object.keys(payload.item).length === 0) {
      this.errorMsg.set('Debes llenar al menos los datos del ítem (Paso 1)');
      this.isSaving.set(false);
      return;
    }

    this.http.post<any>('http://localhost:3000/api/maestras/producto', payload).subscribe({
      next: (res) => {
        this.successMsg.set('Producto creado exitosamente');
        this.isSaving.set(false);
        // Reset form
        this.formDataMap = { item: {}, extensiones: {}, precio: {}, existencia: {} };
        this.currentStep.set(0);
      },
      error: (err) => {
        this.errorMsg.set(err.error?.message || 'Error al crear el producto');
        this.isSaving.set(false);
      }
    });
  }

  private cleanData(data: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== '' && val !== null && val !== undefined) {
        cleaned[key] = val;
      }
    }
    return cleaned;
  }

  volver() {
    this.router.navigate(['/maestras']);
  }
}
