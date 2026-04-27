/**
 * Especificaciones de los registros del archivo plano UnoEE
 * para Documentos Contables (registros 350) y Movimientos (registros 351)
 * Tomadas del archivo `Imp-UnoEE-Docto contable.xls` (SIESA HITECH).
 *
 * Cada FieldSpec describe un campo del registro de ancho fijo.
 *  - tipo 'N' = numérico, padded con ceros a la izquierda.
 *  - tipo 'A' = alfanumérico, padded con espacios a la derecha.
 *  - tipo 'V' = valor monetario (signo + 15 enteros + '.' + 4 decimales = 21 chars).
 *  - tipo 'F' = fecha AAAAMMDD (8 chars).
 */

export type FieldType = 'N' | 'A' | 'V' | 'F';

export interface FieldSpec {
  name: string;
  type: FieldType;
  size: number;
  /** Valor fijo (constante). Si está, se ignora el valor del row. */
  fixed?: string;
  /** Si es obligatorio (true) o dependiente (false). */
  required?: boolean;
  description?: string;
}

export interface RegistroSpec {
  /** Identificador legible: '350-00-V1', '351-01-V2', etc. */
  id: string;
  /** Tipo de registro (350, 351). */
  tipoReg: string;
  /** Subtipo (00 = doc / mov contable, 01 = CxC, 02 = CxP). */
  subtipoReg: string;
  /** Versión (01, 02). */
  versionReg: string;
  /** Descripción humana. */
  description: string;
  /** Lista de campos en orden. */
  fields: FieldSpec[];
}

/* ── Campos comunes a TODOS los registros (cabecera del registro) ────────── */
const HEADER_REG = (tipoReg: string, subtipoReg: string, versionReg: string): FieldSpec[] => [
  { name: 'F_NUMERO_REG',  type: 'N', size: 7, required: true, description: 'Numero consecutivo del registro' },
  { name: 'F_TIPO_REG',    type: 'N', size: 4, required: true, fixed: tipoReg,    description: 'Tipo de registro' },
  { name: 'F_SUBTIPO_REG', type: 'N', size: 2, required: true, fixed: subtipoReg, description: 'Subtipo de registro' },
  { name: 'F_VERSION_REG', type: 'N', size: 2, required: true, fixed: versionReg, description: 'Versión del tipo de registro' },
  { name: 'F_CIA',         type: 'N', size: 3, required: true, description: 'Compañía' },
];

/* ── Documento contable V1 (registro 350-00 V1) ──────────────────────────── */
export const SPEC_350_V1: RegistroSpec = {
  id: '350-00-V1',
  tipoReg: '0350',
  subtipoReg: '00',
  versionReg: '01',
  description: 'Documento contable V1',
  fields: [
    ...HEADER_REG('0350', '00', '01'),
    { name: 'F_CONSEC_AUTO_REG',   type: 'N', size: 1,  required: true,  description: '0=Manual, 1=Automático' },
    { name: 'F350_ID_CO',          type: 'A', size: 3,  required: true,  description: 'Centro de operación' },
    { name: 'F350_ID_TIPO_DOCTO',  type: 'A', size: 3,  required: true,  description: 'Tipo de documento' },
    { name: 'F350_CONSEC_DOCTO',   type: 'N', size: 8,  required: true,  description: 'Numero de documento' },
    { name: 'F350_FECHA',          type: 'F', size: 8,  required: true,  description: 'Fecha (AAAAMMDD)' },
    { name: 'F350_ID_TERCERO',     type: 'A', size: 15, required: false, description: 'Tercero del documento' },
    { name: 'F350_ID_CLASE_DOCTO', type: 'N', size: 5,  required: true,  fixed: '00030', description: 'Siempre 30' },
    { name: 'F350_IND_ESTADO',     type: 'N', size: 1,  required: true,  description: '0=Elaboración, 1=Aprobado, 2=Anulado' },
    { name: 'F350_IND_IMPRESION',  type: 'N', size: 1,  required: true,  description: '0=No Impreso, 1=Impreso' },
    { name: 'F350_NOTAS',          type: 'A', size: 255, required: false, description: 'Observaciones' },
  ],
};

/* ── Documento contable V2 (registro 350-00 V2) — agrega F350_ID_MANDATO ─── */
export const SPEC_350_V2: RegistroSpec = {
  id: '350-00-V2',
  tipoReg: '0350',
  subtipoReg: '00',
  versionReg: '02',
  description: 'Documento contable V2',
  fields: [
    ...SPEC_350_V1.fields.map((f) =>
      f.name === 'F_VERSION_REG' ? { ...f, fixed: '02' } : f,
    ),
    { name: 'F350_ID_MANDATO', type: 'A', size: 15, required: false, description: 'Mandato (si aplica)' },
  ],
};

/* ── Movimiento contable V1 (registro 351-00 V1) ─────────────────────────── */
export const SPEC_351_00_V1: RegistroSpec = {
  id: '351-00-V1',
  tipoReg: '0351',
  subtipoReg: '00',
  versionReg: '01',
  description: 'Movimiento contable V1',
  fields: [
    ...HEADER_REG('0351', '00', '01'),
    { name: 'F350_ID_CO',         type: 'A', size: 3,  required: true,  description: 'CO del documento' },
    { name: 'F350_ID_TIPO_DOCTO', type: 'A', size: 3,  required: true,  description: 'Tipo de documento' },
    { name: 'F350_CONSEC_DOCTO',  type: 'N', size: 8,  required: true,  description: 'Numero de documento' },
    { name: 'F351_ID_AUXILIAR',   type: 'A', size: 20, required: true,  description: 'Auxiliar de cuenta contable' },
    { name: 'F351_ID_TERCERO',    type: 'A', size: 15, required: false, description: 'Tercero (si la auxiliar lo exige)' },
    { name: 'F351_ID_CO_MOV',     type: 'A', size: 3,  required: false, description: 'CO del movimiento' },
    { name: 'F351_ID_UN',         type: 'A', size: 2,  required: false, description: 'Unidad de negocio' },
    { name: 'F351_ID_CCOSTO',     type: 'A', size: 15, required: false, description: 'Centro de costos' },
    { name: 'F351_ID_FE',         type: 'A', size: 10, required: false, description: 'Concepto flujo de efectivo' },
    { name: 'F351_VALOR_DB',      type: 'V', size: 21, required: false, description: 'Valor débito' },
    { name: 'F351_VALOR_CR',      type: 'V', size: 21, required: false, description: 'Valor crédito' },
    { name: 'F351_VALOR_DB_ALT',  type: 'V', size: 21, required: false, description: 'Valor débito alterno' },
    { name: 'F351_VALOR_CR_ALT',  type: 'V', size: 21, required: false, description: 'Valor crédito alterno' },
    { name: 'F351_BASE_GRAVABLE', type: 'V', size: 21, required: false, description: 'Base gravable' },
    { name: 'F351_DOCTO_BANCO',   type: 'A', size: 2,  required: false, description: 'CH/CG/ND/NC (cuenta de bancos)' },
    { name: 'F351_NRO_DOCTO_BANCO', type: 'N', size: 8, required: false, description: 'Nro documento de banco' },
    { name: 'F351_NOTAS',         type: 'A', size: 255, required: false, description: 'Observaciones' },
  ],
};

/* ── Movimiento contable V2 (registro 351-00 V2) — UN pasa de 2 a 20 ─────── */
export const SPEC_351_00_V2: RegistroSpec = {
  id: '351-00-V2',
  tipoReg: '0351',
  subtipoReg: '00',
  versionReg: '02',
  description: 'Movimiento contable V2',
  fields: SPEC_351_00_V1.fields.map((f) => {
    if (f.name === 'F_VERSION_REG') return { ...f, fixed: '02' };
    if (f.name === 'F351_ID_UN') return { ...f, size: 20 };
    return f;
  }),
};

/* ── Movimiento CxC V1 (registro 351-01 V1) ──────────────────────────────── */
export const SPEC_351_01_V1: RegistroSpec = {
  id: '351-01-V1',
  tipoReg: '0351',
  subtipoReg: '01',
  versionReg: '01',
  description: 'Movimiento CxC V1',
  fields: [
    ...HEADER_REG('0351', '01', '01'),
    { name: 'F350_ID_CO',         type: 'A', size: 3,  required: true },
    { name: 'F350_ID_TIPO_DOCTO', type: 'A', size: 3,  required: true },
    { name: 'F350_CONSEC_DOCTO',  type: 'N', size: 8,  required: true },
    { name: 'F351_ID_AUXILIAR',   type: 'A', size: 20, required: true },
    { name: 'F351_ID_TERCERO',    type: 'A', size: 15, required: false },
    { name: 'F351_ID_CO_MOV',     type: 'A', size: 3,  required: false },
    { name: 'F351_ID_UN',         type: 'A', size: 2,  required: false },
    { name: 'F351_ID_CCOSTO',     type: 'A', size: 15, required: false },
    { name: 'F351_VALOR_DB',      type: 'V', size: 21, required: false },
    { name: 'F351_VALOR_CR',      type: 'V', size: 21, required: false },
    { name: 'F351_VALOR_DB_ALT',  type: 'V', size: 21, required: false },
    { name: 'F351_VALOR_CR_ALT',  type: 'V', size: 21, required: false },
    { name: 'F351_NOTAS',         type: 'A', size: 255, required: false },
    { name: 'F353_ID_SUCURSAL',          type: 'A', size: 3,  required: true },
    { name: 'F353_ID_TIPO_DOCTO_CRUCE',  type: 'A', size: 3,  required: true },
    { name: 'F353_CONSEC_DOCTO_CRUCE',   type: 'N', size: 8,  required: true },
    { name: 'F353_NRO_CUOTA_CRUCE',      type: 'N', size: 3,  required: true },
    { name: 'F353_FECHA_VCTO',           type: 'F', size: 8,  required: true },
    { name: 'F353_FECHA_DSCTO_PP',       type: 'F', size: 8,  required: true },
    { name: 'F353_VLR_DSCTO_PP',         type: 'V', size: 21, required: false },
    { name: 'F354_VALOR_APLICADO_PP',    type: 'V', size: 21, required: false },
    { name: 'F354_VALOR_APLICADO_PP_ALT',type: 'V', size: 21, required: false },
    { name: 'F354_VALOR_APROVECHA',      type: 'V', size: 21, required: false },
    { name: 'F354_VALOR_APROVECHA_ALT',  type: 'V', size: 21, required: false },
    { name: 'F354_VALOR_RETENCION',      type: 'V', size: 21, required: false },
    { name: 'F354_VALOR_RETENCION_ALT',  type: 'V', size: 21, required: false },
    { name: 'F354_TERCERO_VEND',         type: 'A', size: 15, required: true },
    { name: 'F354_NOTAS',                type: 'A', size: 255, required: true },
  ],
};

/* ── Movimiento CxC V2 (registro 351-01 V2) — UN pasa de 2 a 20 ──────────── */
export const SPEC_351_01_V2: RegistroSpec = {
  id: '351-01-V2',
  tipoReg: '0351',
  subtipoReg: '01',
  versionReg: '02',
  description: 'Movimiento CxC V2',
  fields: SPEC_351_01_V1.fields.map((f) => {
    if (f.name === 'F_VERSION_REG') return { ...f, fixed: '02' };
    if (f.name === 'F351_ID_UN') return { ...f, size: 20 };
    return f;
  }),
};

/* ── Movimiento CxP V1 (registro 351-02 V1) ──────────────────────────────── */
export const SPEC_351_02_V1: RegistroSpec = {
  id: '351-02-V1',
  tipoReg: '0351',
  subtipoReg: '02',
  versionReg: '01',
  description: 'Movimiento CxP V1',
  fields: SPEC_351_01_V1.fields.map((f) => {
    if (f.name === 'F_SUBTIPO_REG') return { ...f, fixed: '02' };
    return f;
  }),
};

/* ── Movimiento CxP V2 (registro 351-02 V2) ──────────────────────────────── */
export const SPEC_351_02_V2: RegistroSpec = {
  id: '351-02-V2',
  tipoReg: '0351',
  subtipoReg: '02',
  versionReg: '02',
  description: 'Movimiento CxP V2',
  fields: SPEC_351_01_V2.fields.map((f) => {
    if (f.name === 'F_SUBTIPO_REG') return { ...f, fixed: '02' };
    return f;
  }),
};

export const COMPROBANTE_VERSIONS = {
  V1: {
    id: 'V1',
    label: 'Versión 1',
    cabecera: SPEC_350_V1,
    movimiento: SPEC_351_00_V1,
    cxc: SPEC_351_01_V1,
    cxp: SPEC_351_02_V1,
  },
  V2: {
    id: 'V2',
    label: 'Versión 2',
    cabecera: SPEC_350_V2,
    movimiento: SPEC_351_00_V2,
    cxc: SPEC_351_01_V2,
    cxp: SPEC_351_02_V2,
  },
} as const;

export type VersionId = keyof typeof COMPROBANTE_VERSIONS;
