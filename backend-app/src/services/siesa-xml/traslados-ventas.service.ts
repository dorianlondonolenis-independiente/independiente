import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as XLSX from 'xlsx';
import { SPEC_350_V2, SPEC_351_00_V2, FieldSpec } from './comprobante-specs';

/* ── Tipos ─────────────────────────────────────────────────────────────────── */

export interface TbCoRow {
  llave: string;
  nit: string;
  nombre: string;
  co: string;
  nombreCo: string;
  sucursal: string;
  distribuciones: Array<{ co: string; nombre: string; porcentaje: number }>;
}

export interface TrasladoPreview {
  nit: string;
  nombre: string;
  coOrigen: string;
  ventasNetas: number;
  distribuciones: Array<{ co: string; nombre: string; porcentaje: number; monto: number }>;
  totalDistribuido: number;
}

export interface TrasladoOptions {
  cuentaVentas: string;
  tipoDocto: string;
  fecha: string;          // AAAAMMDD
  idCia: string;
  conexion: string;
  usuario: string;
  clave: string;
  consecutivoInicial?: number;
}

/* ── Servicio ───────────────────────────────────────────────────────────────── */

@Injectable()
export class TrasladosVentasService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}
  /* ── Todas las cuentas auxiliares de documentos de ventas ──────────── */

  async cuentasPorTipoDocto(
    co: string,
    periodo: string,
    tiposDocto: string[],
  ): Promise<Array<{ cuenta: string; descripcion: string; tipoDocto: string; documentos: number; totalDb: number; totalCr: number }>> {
    // Construir lista de tipos segura (solo letras y dígitos)
    const tiposLimpios = tiposDocto
      .map(t => t.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''))
      .filter(t => t.length > 0);
    if (!tiposLimpios.length) return [];

    const inClause = tiposLimpios.map(t => `'${t}'`).join(',');

    const rows = await this.dataSource.query(
      `SELECT
         a.f253_id             AS cuenta,
         a.f253_descripcion    AS descripcion,
         d.f350_id_tipo_docto  AS tipoDocto,
         COUNT(DISTINCT d.f350_rowid) AS documentos,
         SUM(m.f351_valor_db)  AS total_db,
         SUM(m.f351_valor_cr)  AS total_cr
       FROM t350_co_docto_contable d WITH(NOLOCK)
       INNER JOIN t351_co_mov_docto m WITH(NOLOCK) ON m.f351_rowid_docto = d.f350_rowid
       INNER JOIN t253_co_auxiliares a WITH(NOLOCK) ON a.f253_rowid = m.f351_rowid_auxiliar
       WHERE d.f350_id_periodo = @0
         AND d.f350_id_co = @1
         AND d.f350_id_tipo_docto IN (${inClause})
       GROUP BY a.f253_id, a.f253_descripcion, d.f350_id_tipo_docto
       ORDER BY a.f253_id, d.f350_id_tipo_docto`,
      [periodo, co],
    );
    return rows.map((r: any) => ({
      cuenta: String(r.cuenta).trim(),
      descripcion: String(r.descripcion ?? '').trim(),
      tipoDocto: String(r.tipoDocto).trim(),
      documentos: Number(r.documentos) || 0,
      totalDb: Number(r.total_db) || 0,
      totalCr: Number(r.total_cr) || 0,
    }));
  }

  /* ── Validar cuenta auxiliar vs total real del periodo ─────────────── */

  async validarCuentaPeriodo(
    co: string,
    periodo: string,
    cuenta: string,
  ): Promise<Array<{ co: string; tipoDocto: string; documentos: number; totalDb: number; totalCr: number }>> {
    const rows = await this.dataSource.query(
      `SELECT
         d.f350_id_co          AS co,
         d.f350_id_tipo_docto  AS tipoDocto,
         COUNT(DISTINCT d.f350_rowid) AS documentos,
         SUM(m.f351_valor_db)  AS total_db,
         SUM(m.f351_valor_cr)  AS total_cr
       FROM t350_co_docto_contable d WITH(NOLOCK)
       INNER JOIN t351_co_mov_docto m WITH(NOLOCK) ON m.f351_rowid_docto = d.f350_rowid
       INNER JOIN t253_co_auxiliares a WITH(NOLOCK) ON a.f253_rowid = m.f351_rowid_auxiliar
       WHERE d.f350_id_periodo = @0
         AND d.f350_id_co = @1
         AND a.f253_id = @2
       GROUP BY d.f350_id_co, d.f350_id_tipo_docto
       ORDER BY total_cr DESC`,
      [periodo, co, cuenta],
    );
    return rows.map((r: any) => ({
      co: String(r.co).trim(),
      tipoDocto: String(r.tipoDocto).trim(),
      documentos: Number(r.documentos) || 0,
      totalDb: Number(r.total_db) || 0,
      totalCr: Number(r.total_cr) || 0,
    }));
  }

  /* ── Detección de cuentas de ventas reales por CO y periodo ────────────── */

  async detectarCuentasVentas(co: string, periodo: string): Promise<Array<{ cuenta: string; descripcion: string; totalCr: number }>> {
    const rows = await this.dataSource.query(
      `SELECT TOP 10
         a.f253_id        AS cuenta,
         a.f253_descripcion AS descripcion,
         SUM(m.f351_valor_cr) AS total_cr
       FROM t350_co_docto_contable d WITH(NOLOCK)
       INNER JOIN t351_co_mov_docto m WITH(NOLOCK) ON m.f351_rowid_docto = d.f350_rowid
       INNER JOIN t253_co_auxiliares a WITH(NOLOCK) ON a.f253_rowid = m.f351_rowid_auxiliar
       WHERE d.f350_id_periodo = @0
         AND d.f350_id_co = @1
         AND d.f350_id_tipo_docto IN ('FDV','FEL','FVM','FVC')
         AND m.f351_valor_cr > 0
         AND a.f253_id LIKE '4%'
       GROUP BY a.f253_id, a.f253_descripcion
       ORDER BY total_cr DESC`,
      [periodo, co],
    );
    return rows.map((r: any) => ({
      cuenta: String(r.cuenta).trim(),
      descripcion: String(r.descripcion ?? '').trim(),
      totalCr: Number(r.total_cr) || 0,
    }));
  }
  /* ── Búsqueda de cuentas contables ───────────────────────────────────── */

  async buscarCuentas(q: string): Promise<Array<{ id: string; nombre: string; inversa: string }>> {
    const term = `%${q}%`;
    const rows = await this.dataSource.query(
      `SELECT TOP 20
         a.f253_id        AS id,
         a.f253_descripcion AS nombre,
         ISNULL(inv.f253_id, '') AS inversa
       FROM t253_co_auxiliares a
       LEFT JOIN t253_co_auxiliares inv ON inv.f253_rowid = a.f253_rowid_aux_inversa
       WHERE a.f253_id LIKE @0 OR a.f253_descripcion LIKE @1
       ORDER BY a.f253_id`,
      [term, term],
    );
    return rows.map((r: any) => ({
      id: String(r.id).trim(),
      nombre: String(r.nombre ?? '').trim(),
      inversa: String(r.inversa ?? '').trim(),
    }));
  }

  /* ── Parseo del Excel TB_CO ────────────────────────────────────────────── */

  parsearExcelTbCo(buffer: Buffer): TbCoRow[] {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets['TB_CO'] ?? wb.Sheets[wb.SheetNames[0]];
    if (!ws) throw new BadRequestException('El Excel no tiene hojas.');

    const aoa = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: null, raw: true });
    if (aoa.length < 2) throw new BadRequestException('El Excel no tiene datos.');

    const rawHeaders = aoa[0] as any[];
    const headers = rawHeaders.map((h) => String(h ?? '').trim());

    const get = (row: any[], colName: string): any => {
      const idx = headers.indexOf(colName);
      return idx >= 0 ? row[idx] : null;
    };

    const rows: TbCoRow[] = [];

    for (let i = 1; i < aoa.length; i++) {
      const row = aoa[i] as any[];
      if (!row || row.every((c) => c == null || c === '')) continue;

      const nit = String(get(row, 'TERCERO') ?? '').trim();
      if (!nit) continue;

      const coPrincipal = String(get(row, 'CO') ?? '').trim();

      const distribuciones: TbCoRow['distribuciones'] = [];

      // %CO1 → refers to the main CO (same as coPrincipal)
      const pct1 = Number(get(row, '%CO1') ?? 0);
      if (coPrincipal && pct1 > 0) {
        distribuciones.push({
          co: coPrincipal,
          nombre: String(get(row, 'NOMBRE CO') ?? coPrincipal),
          porcentaje: pct1,
        });
      }

      // CO2..CO20
      for (let n = 2; n <= 20; n++) {
        const co = String(get(row, `CO${n}`) ?? '').trim();
        const pct = Number(get(row, `%CO${n}`) ?? 0);
        if (!co || co === 'CODIGO' || pct === 0) continue;
        distribuciones.push({
          co,
          nombre: String(get(row, `NOMBRE CO${n}`) ?? co),
          porcentaje: pct,
        });
      }

      rows.push({
        llave: String(get(row, 'LLAVE') ?? ''),
        nit,
        nombre: String(get(row, 'NOMBRE') ?? ''),
        co: coPrincipal,
        nombreCo: String(get(row, 'NOMBRE CO') ?? coPrincipal),
        sucursal: String(get(row, 'SUCURSAL') ?? ''),
        distribuciones,
      });
    }

    if (rows.length === 0) {
      throw new BadRequestException('No se encontraron filas válidas. Verifique que el Excel tenga la columna TERCERO.');
    }
    return rows;
  }

  /* ── Consulta de ventas en BD ─────────────────────────────────────────── */

  async consultarVentas(rows: TbCoRow[], periodo: string): Promise<TrasladoPreview[]> {
    // periodo: YYYYMM (e.g. "202604")
    const periodoNum = parseInt(periodo, 10);
    if (isNaN(periodoNum) || periodo.length !== 6) {
      throw new BadRequestException('Periodo inválido. Use formato YYYYMM (ejemplo: 202604).');
    }

    const nits = [...new Set(rows.map((r) => r.nit))];
    // Safe parameterization: NITs come from the Excel (not user input), but we sanitize anyway
    const nitsSanitized = nits.map((n) => n.replace(/[^0-9\-]/g, ''));
    const nitsList = nitsSanitized.map((n) => `'${n}'`).join(',');

    const ventasMap = new Map<string, Map<string, number>>(); // nit → co → monto

    try {
      const query = `
        SELECT
          t.f200_nit      AS nit,
          v.f5461_id_co_docto AS co,
          SUM(v.f5461_vlr_bruto - ISNULL(v.f5461_vlr_dsctos, 0)) AS ventas_netas
        FROM t5461_acum_ventas_fact v
        INNER JOIN t200_mm_terceros t ON t.f200_rowid = v.f5461_rowid_tercero_vendedor
        WHERE v.f5461_ano_mes = ${periodoNum}
          AND t.f200_nit IN (${nitsList})
        GROUP BY t.f200_nit, v.f5461_id_co_docto
      `;

      const dbRows: Array<{ nit: string; co: string; ventas_netas: number }> =
        await this.dataSource.query(query);

      for (const r of dbRows) {
        const nit = String(r.nit).trim();
        const co = String(r.co).trim();
        if (!ventasMap.has(nit)) ventasMap.set(nit, new Map());
        ventasMap.get(nit)!.set(co, Number(r.ventas_netas) || 0);
      }
    } catch (err: any) {
      throw new BadRequestException(`Error al consultar ventas en BD: ${err.message}`);
    }

    return rows.map((row): TrasladoPreview => {
      const coMap = ventasMap.get(row.nit) ?? new Map<string, number>();
      const ventasNetas = coMap.get(row.co) ?? 0;

      const distribuciones = row.distribuciones.map((d) => ({
        co: d.co,
        nombre: d.nombre,
        porcentaje: d.porcentaje,
        monto: Math.round(ventasNetas * d.porcentaje * 100) / 100,
      }));

      return {
        nit: row.nit,
        nombre: row.nombre,
        coOrigen: row.co.trim(),
        ventasNetas,
        distribuciones,
        totalDistribuido: distribuciones.reduce((s, d) => s + d.monto, 0),
      };
    });
  }

  /* ── Generación del XML ───────────────────────────────────────────────── */

  generarXml(previews: TrasladoPreview[], options: TrasladoOptions): string {
    const { cuentaVentas, tipoDocto, fecha, idCia, conexion, usuario, clave } = options;
    const consecutivoInicial = options.consecutivoInicial ?? 1;

    const lineas: string[] = [];
    let nroReg = 1;
    let consec = consecutivoInicial;

    for (const p of previews) {
      if (p.ventasNetas === 0) continue;

      // ── Registro 350 (cabecera del documento) ──────────────────────────
      const cab350: Record<string, any> = {
        F_NUMERO_REG: nroReg++,
        F_CIA: idCia,
        F_CONSEC_AUTO_REG: 1,
        F350_ID_CO: p.coOrigen,
        F350_ID_TIPO_DOCTO: tipoDocto,
        F350_CONSEC_DOCTO: consec,
        F350_FECHA: fecha,
        F350_ID_TERCERO: p.nit,
        F350_ID_CLASE_DOCTO: '00030',
        F350_IND_ESTADO: 0,
        F350_IND_IMPRESION: 0,
        F350_NOTAS: `Traslado ventas ${p.nombre} periodo ${fecha.slice(0, 6)}`.slice(0, 255),
        F350_ID_MANDATO: '',
      };
      lineas.push(this.buildLinea(SPEC_350_V2.fields, cab350));

      // ── Registro 351 CR: crédito en CO origen (descarga la cuenta) ──────
      lineas.push(this.buildLinea(SPEC_351_00_V2.fields, {
        F_NUMERO_REG: nroReg++,
        F_CIA: idCia,
        F350_ID_CO: p.coOrigen,
        F350_ID_TIPO_DOCTO: tipoDocto,
        F350_CONSEC_DOCTO: consec,
        F351_ID_AUXILIAR: cuentaVentas,
        F351_ID_TERCERO: '',
        F351_ID_CO_MOV: p.coOrigen,
        F351_ID_UN: '',
        F351_ID_CCOSTO: '',
        F351_ID_FE: '',
        F351_VALOR_DB: 0,
        F351_VALOR_CR: p.ventasNetas,
        F351_VALOR_DB_ALT: 0,
        F351_VALOR_CR_ALT: 0,
        F351_BASE_GRAVABLE: 0,
        F351_DOCTO_BANCO: '',
        F351_NRO_DOCTO_BANCO: 0,
        F351_NOTAS: `CR CO${p.coOrigen} ventas ${p.nombre}`.slice(0, 255),
      }));

      // ── Registros 351 DB: débito en cada CO destino ──────────────────
      for (const d of p.distribuciones) {
        if (d.monto === 0) continue;
        lineas.push(this.buildLinea(SPEC_351_00_V2.fields, {
          F_NUMERO_REG: nroReg++,
          F_CIA: idCia,
          F350_ID_CO: p.coOrigen,
          F350_ID_TIPO_DOCTO: tipoDocto,
          F350_CONSEC_DOCTO: consec,
          F351_ID_AUXILIAR: cuentaVentas,
          F351_ID_TERCERO: '',
          F351_ID_CO_MOV: d.co,
          F351_ID_UN: '',
          F351_ID_CCOSTO: '',
          F351_ID_FE: '',
          F351_VALOR_DB: d.monto,
          F351_VALOR_CR: 0,
          F351_VALOR_DB_ALT: 0,
          F351_VALOR_CR_ALT: 0,
          F351_BASE_GRAVABLE: 0,
          F351_DOCTO_BANCO: '',
          F351_NRO_DOCTO_BANCO: 0,
          F351_NOTAS: `DB CO${d.co} ${d.nombre}`.slice(0, 255),
        }));
      }

      consec++;
    }

    if (lineas.length === 0) {
      throw new BadRequestException('No hay traslados con ventas para generar XML.');
    }

    const lineasXml = lineas.map((l) => `    <Linea>${this.escapeXml(l)}</Linea>`).join('\n');

    return (
      `<Importar>\n` +
      `  <NombreConexion>${this.escapeXml(conexion)}</NombreConexion>\n` +
      `  <IdCia>${this.escapeXml(idCia)}</IdCia>\n` +
      `  <Usuario>${this.escapeXml(usuario)}</Usuario>\n` +
      `  <Clave>${this.escapeXml(clave)}</Clave>\n` +
      `  <Version>V2</Version>\n` +
      `  <Datos>\n` +
      lineasXml + '\n' +
      `  </Datos>\n` +
      `</Importar>`
    );
  }

  /* ── Envío al API SIESA ───────────────────────────────────────────────── */

  async enviarAlApi(
    xml: string,
    url: string,
  ): Promise<{ status: number; ok: boolean; respuesta: string }> {
    if (!url) throw new BadRequestException('URL del API SIESA es obligatoria.');
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml; charset=utf-8' },
        body: xml,
      });
      const respuesta = await res.text().catch(() => '');
      return { status: res.status, ok: res.ok, respuesta };
    } catch (err: any) {
      return { status: 0, ok: false, respuesta: `Error de red: ${err.message || String(err)}` };
    }
  }

  /* ── Helpers de formato (espejo de los privados en comprobantes service) */

  private buildLinea(fields: FieldSpec[], row: Record<string, any>): string {
    return fields.map((f) => {
      const raw = f.fixed !== undefined ? f.fixed : (row[f.name] ?? '');
      return this.formatField(raw, f.type, f.size);
    }).join('');
  }

  private formatField(value: any, type: string, size: number): string {
    switch (type) {
      case 'N': {
        const n = Math.trunc(Number(value) || 0);
        return String(n < 0 ? 0 : n).padStart(size, '0').slice(-size);
      }
      case 'A':
        return String(value ?? '').padEnd(size, ' ').slice(0, size);
      case 'F': {
        const s = String(value ?? '').replace(/\D/g, '');
        return s.padStart(size, '0').slice(0, size);
      }
      case 'V': {
        const n = Number(value) || 0;
        const sign = n < 0 ? '-' : '+';
        const [intPart, decPart = ''] = Math.abs(n).toFixed(4).split('.');
        return sign + intPart.padStart(size - 6, '0') + '.' + decPart.padEnd(4, '0');
      }
      default:
        return String(value ?? '').slice(0, size);
    }
  }

  private escapeXml(s: string): string {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
