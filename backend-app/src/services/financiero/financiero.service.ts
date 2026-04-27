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
    const filas = this.parsearArchivo(buffer);
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
    const filas = this.parsearArchivo(buffer);
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

  private parsearArchivo(buffer: Buffer): FilaArchivo[] {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    } catch {
      throw new BadRequestException('No se pudo leer el archivo. Use .xlsx, .xls o .csv');
    }
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new BadRequestException('El archivo no tiene hojas.');

    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false });

    const norm = (s: string) => s.toLowerCase().trim().replace(/[\s_.-]+/g, '');
    const colMap: Record<string, string> = {};
    if (rows.length) {
      for (const k of Object.keys(rows[0])) {
        const n = norm(k);
        if (n.includes('nit')) colMap['nit'] = k;
        else if (n.includes('tipodocto') || n === 'tipo' || n.includes('tipodocumento')) colMap['tipo_docto'] = k;
        else if (n.includes('documento') || n.includes('consec') || n === 'doc') colMap['documento'] = k;
        else if (n.includes('fecha')) colMap['fecha'] = k;
        else if (n.includes('valor') || n.includes('neto') || n.includes('total')) colMap['valor_neto'] = k;
      }
    }

    if (!colMap['nit'] || !colMap['documento']) {
      throw new BadRequestException(
        'El archivo debe tener al menos las columnas "nit" y "documento".',
      );
    }

    const out: FilaArchivo[] = [];
    rows.forEach((r, idx) => {
      const nitRaw = r[colMap['nit']];
      const docRaw = r[colMap['documento']];
      if (nitRaw == null || docRaw == null) return;
      const nit = String(nitRaw).replace(/[^0-9]/g, '');
      const documento = String(docRaw).trim();
      if (!nit || !documento) return;
      const valorRaw = colMap['valor_neto'] ? r[colMap['valor_neto']] : null;
      out.push({
        fila: idx + 2, // +2 = encabezado en fila 1
        nit,
        documento,
        tipo_docto: colMap['tipo_docto'] ? r[colMap['tipo_docto']] : null,
        fecha: colMap['fecha'] ? String(r[colMap['fecha']] ?? '') || null : null,
        valor_neto:
          valorRaw == null || valorRaw === ''
            ? null
            : Number(String(valorRaw).replace(/[^0-9.-]/g, '')),
      });
    });
    return out;
  }

  async generarPlantilla(): Promise<Buffer> {
    // Filas reales (que sí deberían coincidir) tomadas de BD
    let realesFV: any[] = [];
    let realesRV: any[] = [];
    try {
      realesFV = await this.dataSource.query(`
        SELECT TOP 3
          REPLACE(REPLACE(t.f200_nit, '-', ''), '.', '') as nit,
          CAST(d.f350_consec_docto AS VARCHAR) as documento,
          'FV' as tipo_docto,
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
          CAST(d.f350_consec_docto AS VARCHAR) as documento,
          'RV' as tipo_docto,
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

    const data: any[] = [
      ...realesFV.map((r) => ({
        nit: r.nit,
        documento: r.documento,
        tipo_docto: r.tipo_docto,
        fecha: r.fecha,
        valor_neto: Number(r.valor_neto) || 0,
      })),
      ...realesRV.map((r) => ({
        nit: r.nit,
        documento: r.documento,
        tipo_docto: r.tipo_docto,
        fecha: r.fecha,
        valor_neto: Number(r.valor_neto) || 0,
      })),
      // Filas "de prueba" que NO coincidirán (para ver la sección de no encontradas)
      { nit: '900999888', documento: 'NO-EXISTE-1', tipo_docto: 'FV', fecha: '2026-04-22', valor_neto: 100000 },
      { nit: '800111222', documento: 'NO-EXISTE-2', tipo_docto: 'RV', fecha: '2026-04-23', valor_neto: 250000 },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, 'conciliacion');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  async generarPlantillaCompras(): Promise<Buffer> {
    let reales: any[] = [];
    try {
      reales = await this.dataSource.query(`
        SELECT TOP 5
          REPLACE(REPLACE(t.f200_nit, '-', ''), '.', '') as nit,
          LTRIM(RTRIM(c.f451_num_docto_referencia)) as documento,
          'FC' as tipo_docto,
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

    const data: any[] = [
      ...reales.map((r) => ({
        nit: r.nit,
        documento: r.documento,
        tipo_docto: r.tipo_docto,
        fecha: r.fecha,
        valor_neto: Number(r.valor_neto) || 0,
      })),
      { nit: '900999888', documento: 'FAC-NO-EXISTE', tipo_docto: 'FC', fecha: '2026-04-22', valor_neto: 100000 },
      { nit: '800111222', documento: 'INV-2026-X', tipo_docto: 'FC', fecha: '2026-04-23', valor_neto: 250000 },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 16 }, { wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, 'conciliacion-compras');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
