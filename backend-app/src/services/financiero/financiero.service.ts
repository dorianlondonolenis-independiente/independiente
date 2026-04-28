import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as XLSX from 'xlsx';

export interface FilaArchivo {
  fila: number;
  nit: string;
  documento: string;
  tipo_docto?: string | null;
  fecha?: string | null;
  valor_neto?: number | null;
}

export interface ResultadoConciliacion {
  totalArchivo: number;
  totalCoincidencias: number;
  totalNoEncontradas: number;
  totalDiscrepancias: number;
  noEncontradas: FilaArchivo[];
  discrepancias: Array<FilaArchivo & {
    valor_db: number;
    diferencia: number;
  }>;
  coincidencias: Array<FilaArchivo & {
    rowid: number;
    cliente_db: string;
    valor_db: number;
  }>;
}

@Injectable()
export class FinancieroService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async conciliarVentas(buffer: Buffer): Promise<ResultadoConciliacion> {
    const filas = this.parsearArchivo(buffer, 'ventas');
    if (!filas.length) {
      throw new BadRequestException('El archivo no contiene filas de datos.');
    }

    // Construir lista de pares (nit, documento) para una sola consulta
    const nitsSet = new Set(filas.map((f) => f.nit));
    const docsSet = new Set(filas.map((f) => String(f.documento)));

    if (nitsSet.size === 0 || docsSet.size === 0) {
      throw new BadRequestException('No se detectaron NITs o documentos válidos.');
    }

    // Buscar facturas + remisiones de venta que coincidan con cualquier nit/documento del archivo
    const nits = Array.from(nitsSet);
    const docs = Array.from(docsSet);

    const nitParams = nits.map((_, i) => `@${i}`).join(',');
    const docOffset = nits.length;
    const docParams = docs.map((_, i) => `@${i + docOffset}`).join(',');

    const sql = `
      SELECT
        f.f461_rowid_docto as rowid,
        d.f350_id_tipo_docto as tipo_docto,
        CAST(d.f350_consec_docto AS VARCHAR) as documento,
        REPLACE(REPLACE(t.f200_nit, '-', ''), '.', '') as nit,
        t.f200_razon_social as cliente,
        f.f461_id_fecha as fecha,
        f.f461_vlr_neto as valor_neto
      FROM t461_cm_docto_factura_venta f
      INNER JOIN t200_mm_terceros t ON f.f461_rowid_tercero_fact = t.f200_rowid
      INNER JOIN t350_co_docto_contable d ON f.f461_rowid_docto = d.f350_rowid
      WHERE f.f461_id_fecha >= DATEADD(day, -60, GETDATE())
        AND REPLACE(REPLACE(t.f200_nit, '-', ''), '.', '') IN (${nitParams})
        AND CAST(d.f350_consec_docto AS VARCHAR) IN (${docParams})
      UNION ALL
      SELECT
        r.f460_rowid_docto as rowid,
        d.f350_id_tipo_docto as tipo_docto,
        CAST(d.f350_consec_docto AS VARCHAR) as documento,
        REPLACE(REPLACE(t.f200_nit, '-', ''), '.', '') as nit,
        t.f200_razon_social as cliente,
        r.f460_id_fecha as fecha,
        r.f460_vlr_neto as valor_neto
      FROM t460_cm_docto_remision_venta r
      INNER JOIN t200_mm_terceros t ON r.f460_rowid_tercero_fact = t.f200_rowid
      INNER JOIN t350_co_docto_contable d ON r.f460_rowid_docto = d.f350_rowid
      WHERE r.f460_id_fecha >= DATEADD(day, -60, GETDATE())
        AND REPLACE(REPLACE(t.f200_nit, '-', ''), '.', '') IN (${nitParams})
        AND CAST(d.f350_consec_docto AS VARCHAR) IN (${docParams})
    `;
    const params = [...nits, ...docs, ...nits, ...docs];
    const docsBd: any[] = await this.dataSource.query(sql, params);

    // Indexar por nit|documento
    const indice = new Map<string, any>();
    for (const r of docsBd) {
      const key = `${r.nit}|${r.documento}`.toLowerCase();
      indice.set(key, r);
    }

    const noEncontradas: FilaArchivo[] = [];
    const discrepancias: ResultadoConciliacion['discrepancias'] = [];
    const coincidencias: ResultadoConciliacion['coincidencias'] = [];

    for (const f of filas) {
      const key = `${f.nit}|${f.documento}`.toLowerCase();
      const match = indice.get(key);
      if (!match) {
        noEncontradas.push(f);
        continue;
      }
      const valorDb = Number(match.valor_neto) || 0;
      coincidencias.push({
        ...f,
        rowid: match.rowid,
        cliente_db: match.cliente,
        valor_db: valorDb,
      });
      if (f.valor_neto != null && Math.abs(valorDb - f.valor_neto) > 0.5) {
        discrepancias.push({
          ...f,
          valor_db: valorDb,
          diferencia: valorDb - f.valor_neto,
        });
      }
    }

    return {
      totalArchivo: filas.length,
      totalCoincidencias: coincidencias.length,
      totalNoEncontradas: noEncontradas.length,
      totalDiscrepancias: discrepancias.length,
      noEncontradas,
      discrepancias,
      coincidencias,
    };
  }

  /**
   * Conciliar facturas del PROVEEDOR contra t451_cm_docto_compras.
   * Verifica si las facturas que envía el proveedor están "causadas" en el sistema.
   * `documento` en el archivo se compara con `f451_num_docto_referencia` (n° fact. del proveedor).
   */
  async conciliarCompras(buffer: Buffer): Promise<ResultadoConciliacion> {
    const filas = this.parsearArchivo(buffer, 'compras');
    if (!filas.length) {
      throw new BadRequestException('El archivo no contiene filas de datos.');
    }

    const nitsSet = new Set(filas.map((f) => f.nit));
    const docsSet = new Set(filas.map((f) => String(f.documento).trim()));
    if (nitsSet.size === 0 || docsSet.size === 0) {
      throw new BadRequestException('No se detectaron NITs o documentos válidos.');
    }

    const nits = Array.from(nitsSet);
    const docs = Array.from(docsSet);
    const nitParams = nits.map((_, i) => `@${i}`).join(',');
    const docOffset = nits.length;
    const docParams = docs.map((_, i) => `@${i + docOffset}`).join(',');

    const sql = `
      SELECT
        c.f451_rowid_docto as rowid,
        REPLACE(REPLACE(t.f200_nit, '-', ''), '.', '') as nit,
        t.f200_razon_social as proveedor,
        LTRIM(RTRIM(c.f451_num_docto_referencia)) as documento,
        c.f451_id_fecha as fecha,
        c.f451_vlr_neto as valor_neto,
        c.f451_ind_estado_cm as estado
      FROM t451_cm_docto_compras c
      INNER JOIN t200_mm_terceros t ON c.f451_rowid_tercero_prov = t.f200_rowid
      WHERE c.f451_id_fecha >= DATEADD(day, -60, GETDATE())
        AND REPLACE(REPLACE(t.f200_nit, '-', ''), '.', '') IN (${nitParams})
        AND LTRIM(RTRIM(c.f451_num_docto_referencia)) IN (${docParams})
    `;
    const params = [...nits, ...docs];
    const docsBd: any[] = await this.dataSource.query(sql, params);

    const indice = new Map<string, any>();
    for (const r of docsBd) {
      const key = `${r.nit}|${String(r.documento).trim()}`.toLowerCase();
      indice.set(key, r);
    }

    const noEncontradas: FilaArchivo[] = [];
    const discrepancias: ResultadoConciliacion['discrepancias'] = [];
    const coincidencias: ResultadoConciliacion['coincidencias'] = [];

    for (const f of filas) {
      const key = `${f.nit}|${String(f.documento).trim()}`.toLowerCase();
      const match = indice.get(key);
      if (!match) {
        noEncontradas.push(f);
        continue;
      }
      const valorDb = Number(match.valor_neto) || 0;
      coincidencias.push({
        ...f,
        rowid: match.rowid,
        cliente_db: match.proveedor,
        valor_db: valorDb,
      });
      if (f.valor_neto != null && Math.abs(valorDb - f.valor_neto) > 0.5) {
        discrepancias.push({
          ...f,
          valor_db: valorDb,
          diferencia: valorDb - f.valor_neto,
        });
      }
    }

    return {
      totalArchivo: filas.length,
      totalCoincidencias: coincidencias.length,
      totalNoEncontradas: noEncontradas.length,
      totalDiscrepancias: discrepancias.length,
      noEncontradas,
      discrepancias,
      coincidencias,
    };
  }

  /**
   * Parsea el archivo Excel/CSV detectando columnas por NOMBRE (no por posición).
   * Acepta tanto el archivo descargado del portal DIAN como la plantilla del sistema.
   *
   * Aliases reconocidos:
   *  - NIT (ventas)   -> 'NIT Receptor', 'NitReceptor', 'nit'
   *  - NIT (compras)  -> 'NIT Emisor', 'NitEmisor', 'nit'
   *  - Documento      -> 'Folio' (+ 'Prefijo' si existe), 'documento', 'consec'
   *  - Fecha          -> 'Fecha Emisión', 'Fecha Recepcion', 'fecha'
   *  - Valor          -> 'Total', 'valor_neto', 'valor', 'neto'
   *  - Tipo doc.      -> 'Tipo de documento', 'tipo_docto', 'tipo'
   */
  private parsearArchivo(buffer: Buffer, modo: 'ventas' | 'compras' = 'ventas'): FilaArchivo[] {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    } catch {
      throw new BadRequestException('No se pudo leer el archivo. Use .xlsx, .xls o .csv');
    }

    // Buscar la primera hoja que contenga datos válidos (ignora "Columnas clave" / "Instrucciones")
    const hojasIgnorar = ['columnasclave', 'instrucciones', 'instructions', 'leeme', 'readme'];
    const norm = (s: string) => String(s ?? '').toLowerCase().trim().replace(/[\s_.\-/()]+/g, '');
    let sheetName = workbook.SheetNames.find((n) => !hojasIgnorar.includes(norm(n)));
    if (!sheetName) sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new BadRequestException('El archivo no tiene hojas.');

    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false });
    if (!rows.length) return [];

    // Mapeo de columnas reales -> claves internas
    const headers = Object.keys(rows[0]);
    const colMap: Record<string, string> = {};

    for (const h of headers) {
      const n = norm(h);
      // NIT del cliente (ventas) o proveedor (compras)
      if (modo === 'ventas') {
        if (n === 'nitreceptor' || n.includes('nitreceptor')) colMap['nit'] = h;
        else if (!colMap['nit'] && (n === 'nit' || n.includes('niteccliente') || n.includes('nitcliente'))) colMap['nit'] = h;
      } else {
        if (n === 'nitemisor' || n.includes('nitemisor')) colMap['nit'] = h;
        else if (!colMap['nit'] && (n === 'nit' || n.includes('nitproveedor'))) colMap['nit'] = h;
      }

      // Documento / Folio
      if (n === 'folio') colMap['documento'] = h;
      else if (!colMap['documento'] && (n === 'documento' || n.includes('numerodocumento') || n.includes('numdocumento') || n.includes('consecdocto') || n === 'consec' || n === 'doc')) colMap['documento'] = h;

      // Prefijo (se concatena al folio si aplica)
      if (n === 'prefijo') colMap['prefijo'] = h;

      // Fecha
      if (n === 'fechaemision' || n === 'fechaemisión') colMap['fecha'] = h;
      else if (!colMap['fecha'] && n.includes('fecha')) colMap['fecha'] = h;

      // Valor / Total
      if (n === 'total') colMap['valor_neto'] = h;
      else if (!colMap['valor_neto'] && (n.includes('valorneto') || n === 'valor' || n === 'neto')) colMap['valor_neto'] = h;

      // Tipo de documento
      if (n === 'tipodedocumento' || n === 'tipodocumento' || n === 'tipodocto') colMap['tipo_docto'] = h;
      else if (!colMap['tipo_docto'] && n === 'tipo') colMap['tipo_docto'] = h;
    }

    if (!colMap['nit']) {
      const esperada = modo === 'ventas' ? '"NIT Receptor"' : '"NIT Emisor"';
      throw new BadRequestException(
        `No se encontró la columna del NIT (${esperada} o "nit"). Hojas: ${workbook.SheetNames.join(', ')}.`,
      );
    }
    if (!colMap['documento']) {
      throw new BadRequestException(
        'No se encontró la columna del documento ("Folio" o "documento").',
      );
    }

    const out: FilaArchivo[] = [];
    rows.forEach((r, idx) => {
      const nitRaw = r[colMap['nit']];
      const docRaw = r[colMap['documento']];
      if (nitRaw == null || docRaw == null) return;
      const nit = String(nitRaw).replace(/[^0-9]/g, '');
      const folio = String(docRaw).trim();
      if (!nit || !folio) return;

      // Documento = Prefijo + Folio cuando prefijo viene aparte y no está ya incluido
      let documento = folio;
      if (colMap['prefijo']) {
        const pref = String(r[colMap['prefijo']] ?? '').trim();
        if (pref && !folio.toUpperCase().startsWith(pref.toUpperCase())) {
          documento = pref + folio;
        }
      }

      const valorRaw = colMap['valor_neto'] ? r[colMap['valor_neto']] : null;
      out.push({
        fila: idx + 2,
        nit,
        documento,
        tipo_docto: colMap['tipo_docto'] ? r[colMap['tipo_docto']] : null,
        fecha: colMap['fecha'] ? String(r[colMap['fecha']] ?? '') || null : null,
        valor_neto:
          valorRaw == null || valorRaw === ''
            ? null
            : Number(String(valorRaw).replace(/[^0-9.\-]/g, '')),
      });
    });
    return out;
  }

  /**
   * Encabezados oficiales del archivo descargado del portal DIAN.
   * El orden importa para mantener la equivalencia 1:1 con el archivo del cliente.
   */
  private static readonly DIAN_HEADERS = [
    'Tipo de documento', 'CUFE/CUDE', 'Folio', 'Prefijo', 'Divisa',
    'Forma de Pago', 'Medio de Pago', 'Fecha Emisión', 'Fecha Recepción',
    'NIT Emisor', 'Nombre Emisor', 'NIT Receptor', 'Nombre Receptor',
    'IVA', 'ICA', 'IC', 'INC', 'Timbre', 'INC Bolsas', 'IN Carbono',
    'IN Combustibles', 'IC Datos', 'ICL', 'INPP', 'IBUA', 'ICUI',
    'Rete IVA', 'Rete Renta', 'Rete ICA', 'Total', 'Estado', 'Grupo',
  ];

  /** Construye la hoja "Columnas clave" indicando qué columnas usa el sistema. */
  private buildHojaColumnasClave(modo: 'ventas' | 'compras'): XLSX.WorkSheet {
    const nitCol = modo === 'ventas' ? 'NIT Receptor' : 'NIT Emisor';
    const filas: any[][] = [
      ['CAMPO INTERNO', 'COLUMNA REQUERIDA EN EL ARCHIVO', 'OBLIGATORIA', 'DESCRIPCIÓN'],
      ['nit', nitCol, 'SÍ', modo === 'ventas'
        ? 'NIT del cliente al que se le emitió la factura.'
        : 'NIT del proveedor que emitió la factura de compra.'],
      ['documento', 'Folio  (+ Prefijo si existe)', 'SÍ',
        'Número del documento. Si la columna "Prefijo" tiene valor (ej. "FS") se concatena al inicio del Folio antes de cruzar.'],
      ['fecha', 'Fecha Emisión', 'NO', 'Fecha en que el documento fue emitido. Solo informativa.'],
      ['valor_neto', 'Total', 'NO',
        'Valor total del documento. Se compara contra el valor en BD para detectar discrepancias (>$0.50).'],
      ['tipo_docto', 'Tipo de documento', 'NO', 'Tipo del documento (Factura, Documento soporte, etc.).'],
      [],
      ['NOTAS:'],
      ['1. El sistema detecta las columnas POR NOMBRE, no por posición. Puede reordenarlas.'],
      ['2. También se aceptan los nombres alternativos: "nit", "documento", "fecha", "valor_neto", "tipo_docto".'],
      ['3. Las hojas "Columnas clave" / "Instrucciones" se ignoran al procesar.'],
      ['4. Cada fila representa un documento. Filas sin NIT o sin Folio se omiten.'],
      [`5. Modo: ${modo.toUpperCase()} — el cruce se hace contra ${modo === 'ventas'
        ? 't461_cm_docto_factura_venta + t460_cm_docto_remision_venta'
        : 't451_cm_docto_compras (campo f451_num_docto_referencia)'}.`],
    ];
    const ws = XLSX.utils.aoa_to_sheet(filas);
    ws['!cols'] = [{ wch: 18 }, { wch: 32 }, { wch: 12 }, { wch: 80 }];
    return ws;
  }

  async generarPlantilla(): Promise<Buffer> {
    // Filas reales (que sí deberían coincidir) tomadas de BD
    let realesFV: any[] = [];
    let realesRV: any[] = [];
    try {
      realesFV = await this.dataSource.query(`
        SELECT TOP 3
          REPLACE(REPLACE(t.f200_nit, '-', ''), '.', '') as nit,
          t.f200_razon_social as nombre,
          CAST(d.f350_consec_docto AS VARCHAR) as documento,
          CONVERT(VARCHAR(10), f.f461_id_fecha, 23) as fecha,
          f.f461_vlr_neto as valor_neto
        FROM t461_cm_docto_factura_venta f
        INNER JOIN t200_mm_terceros t ON f.f461_rowid_tercero_fact = t.f200_rowid
        INNER JOIN t350_co_docto_contable d ON f.f461_rowid_docto = d.f350_rowid
        WHERE t.f200_nit IS NOT NULL AND f.f461_vlr_neto > 0
        ORDER BY f.f461_id_fecha DESC
      `);
    } catch {
      realesFV = [];
    }
    try {
      realesRV = await this.dataSource.query(`
        SELECT TOP 2
          REPLACE(REPLACE(t.f200_nit, '-', ''), '.', '') as nit,
          t.f200_razon_social as nombre,
          CAST(d.f350_consec_docto AS VARCHAR) as documento,
          CONVERT(VARCHAR(10), r.f460_id_fecha, 23) as fecha,
          r.f460_vlr_neto as valor_neto
        FROM t460_cm_docto_remision_venta r
        INNER JOIN t200_mm_terceros t ON r.f460_rowid_tercero_fact = t.f200_rowid
        INNER JOIN t350_co_docto_contable d ON r.f460_rowid_docto = d.f350_rowid
        WHERE t.f200_nit IS NOT NULL AND r.f460_vlr_neto > 0
          AND r.f460_rowid_docto_fact_base IS NOT NULL
        ORDER BY r.f460_id_fecha DESC
      `);
    } catch {
      realesRV = [];
    }

    const reales = [...realesFV, ...realesRV];
    const ejemplos = [
      { nit: '900999888', nombre: 'EJEMPLO QUE NO COINCIDE 1', documento: 'NO-EXISTE-1', fecha: '2026-04-22', valor_neto: 100000 },
      { nit: '800111222', nombre: 'EJEMPLO QUE NO COINCIDE 2', documento: 'NO-EXISTE-2', fecha: '2026-04-23', valor_neto: 250000 },
    ];

    // En ventas: NIT Emisor = nuestra empresa, NIT Receptor = cliente
    const NIT_EMISOR_EMPRESA = '800213511';
    const NOMBRE_EMISOR_EMPRESA = 'ESPECIALIDADES OFTALMOLOGICAS S.A';

    const aoa: any[][] = [FinancieroService.DIAN_HEADERS];
    [...reales, ...ejemplos].forEach((r) => {
      const fila = new Array(FinancieroService.DIAN_HEADERS.length).fill('');
      fila[0] = 'Factura electrónica de Venta'; // Tipo de documento
      fila[1] = ''; // CUFE/CUDE
      fila[2] = r.documento; // Folio
      fila[3] = ''; // Prefijo (vacío porque el folio ya trae el prefijo concatenado en BD)
      fila[4] = 'COP'; // Divisa
      fila[7] = r.fecha; // Fecha Emisión
      fila[8] = r.fecha; // Fecha Recepción
      fila[9] = NIT_EMISOR_EMPRESA;
      fila[10] = NOMBRE_EMISOR_EMPRESA;
      fila[11] = r.nit; // NIT Receptor (cliente)
      fila[12] = r.nombre || '';
      fila[29] = Number(r.valor_neto) || 0; // Total
      fila[30] = 'Aprobado';
      fila[31] = 'Emitido';
      aoa.push(fila);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = FinancieroService.DIAN_HEADERS.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Hoja1');
    XLSX.utils.book_append_sheet(wb, this.buildHojaColumnasClave('ventas'), 'Columnas clave');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  async generarPlantillaCompras(): Promise<Buffer> {
    let reales: any[] = [];
    try {
      reales = await this.dataSource.query(`
        SELECT TOP 5
          REPLACE(REPLACE(t.f200_nit, '-', ''), '.', '') as nit,
          t.f200_razon_social as nombre,
          LTRIM(RTRIM(c.f451_num_docto_referencia)) as documento,
          CONVERT(VARCHAR(10), c.f451_id_fecha, 23) as fecha,
          c.f451_vlr_neto as valor_neto
        FROM t451_cm_docto_compras c
        INNER JOIN t200_mm_terceros t ON c.f451_rowid_tercero_prov = t.f200_rowid
        WHERE t.f200_nit IS NOT NULL
          AND c.f451_num_docto_referencia IS NOT NULL
          AND LTRIM(RTRIM(c.f451_num_docto_referencia)) <> ''
          AND c.f451_vlr_neto > 0
        ORDER BY c.f451_id_fecha DESC
      `);
    } catch {
      reales = [];
    }

    const ejemplos = [
      { nit: '900999888', nombre: 'PROVEEDOR EJEMPLO 1', documento: 'FAC-NO-EXISTE', fecha: '2026-04-22', valor_neto: 100000 },
      { nit: '800111222', nombre: 'PROVEEDOR EJEMPLO 2', documento: 'INV-2026-X', fecha: '2026-04-23', valor_neto: 250000 },
    ];

    // En compras: NIT Emisor = proveedor, NIT Receptor = nuestra empresa
    const NIT_RECEPTOR_EMPRESA = '800213511';
    const NOMBRE_RECEPTOR_EMPRESA = 'ESPECIALIDADES OFTALMOLOGICAS S.A';

    const aoa: any[][] = [FinancieroService.DIAN_HEADERS];
    [...reales, ...ejemplos].forEach((r) => {
      const fila = new Array(FinancieroService.DIAN_HEADERS.length).fill('');
      fila[0] = 'Factura electrónica de Venta';
      fila[2] = r.documento; // Folio
      fila[3] = ''; // Prefijo
      fila[4] = 'COP';
      fila[7] = r.fecha;
      fila[8] = r.fecha;
      fila[9] = r.nit; // NIT Emisor (proveedor)
      fila[10] = r.nombre || '';
      fila[11] = NIT_RECEPTOR_EMPRESA;
      fila[12] = NOMBRE_RECEPTOR_EMPRESA;
      fila[29] = Number(r.valor_neto) || 0;
      fila[30] = 'Aprobado';
      fila[31] = 'Recibido';
      aoa.push(fila);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = FinancieroService.DIAN_HEADERS.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Hoja1');
    XLSX.utils.book_append_sheet(wb, this.buildHojaColumnasClave('compras'), 'Columnas clave');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
