import { BadRequestException, Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import {
  COMPROBANTE_VERSIONS,
  FieldSpec,
  RegistroSpec,
  VersionId,
} from './comprobante-specs';

interface CabeceraInput {
  [key: string]: any;
}
interface MovimientoInput {
  [key: string]: any;
}

export interface ComprobanteParsed {
  cabecera: Record<string, any>;
  movimientos: Record<string, any>[];
  cruces: Record<string, any>[];
  errores: string[];
}

@Injectable()
export class SiesaComprobantesService {
  /** Lista de versiones disponibles para el frontend. */
  listarVersiones() {
    return Object.values(COMPROBANTE_VERSIONS).map((v) => ({
      id: v.id,
      label: v.label,
      registros: {
        cabecera: { id: v.cabecera.id, descripcion: v.cabecera.description },
        movimiento: { id: v.movimiento.id, descripcion: v.movimiento.description },
        cxc: { id: v.cxc.id, descripcion: v.cxc.description },
        cxp: { id: v.cxp.id, descripcion: v.cxp.description },
      },
    }));
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // FORMATEO DE CAMPOS DE ANCHO FIJO
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private padNum(value: any, size: number): string {
    const v = String(value ?? '').replace(/[^\d]/g, '');
    return v.padStart(size, '0').slice(-size);
  }
  private padAlpha(value: any, size: number): string {
    return String(value ?? '').padEnd(size, ' ').slice(0, size);
  }
  private padFecha(value: any, size: number): string {
    const v = String(value ?? '').replace(/\D/g, '');
    return v.padStart(size, '0').slice(0, size);
  }
  /** Valor monetario: signo(1) + 15 enteros + '.' + 4 decimales = 21 chars. */
  private padValor(value: any, size: number): string {
    const n = Number(value ?? 0) || 0;
    const sign = n < 0 ? '-' : '+';
    const [int, dec = ''] = Math.abs(n).toFixed(4).split('.');
    const out = sign + int.padStart(15, '0') + '.' + dec.padEnd(4, '0');
    return out.padEnd(size, ' ').slice(0, size);
  }

  private formatField(field: FieldSpec, value: any): string {
    if (field.fixed != null) {
      // El campo es constante: aplicar relleno segÃºn tipo.
      if (field.type === 'N') return this.padNum(field.fixed, field.size);
      return this.padAlpha(field.fixed, field.size);
    }
    switch (field.type) {
      case 'N': return this.padNum(value, field.size);
      case 'A': return this.padAlpha(value, field.size);
      case 'F': return this.padFecha(value, field.size);
      case 'V': return this.padValor(value, field.size);
    }
  }

  /** Construye una lÃ­nea de ancho fijo a partir de la spec y el row. */
  private buildLinea(spec: RegistroSpec, row: Record<string, any>): string {
    return spec.fields.map((f) => this.formatField(f, row[f.name])).join('');
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // PLANTILLA EXCEL
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  /**
   * Genera plantilla Excel para una versiÃ³n especÃ­fica.
   * Incluye: hoja Instrucciones, Cabecera, Movimientos, CxC, CxP.
   */
  generarPlantillaExcel(versionId: VersionId = 'V2'): Buffer {
    const ver = COMPROBANTE_VERSIONS[versionId];
    if (!ver) throw new BadRequestException(`VersiÃ³n invÃ¡lida: ${versionId}`);

    const wb = XLSX.utils.book_new();

    // Hoja 1: Instrucciones
    const instrucciones = [
      ['SIESA UnoEE â€” Comprobantes Contables â€” ' + ver.label],
      [],
      ['INSTRUCCIONES'],
      ['1) Llene la hoja "Cabecera" con UNA sola fila (un comprobante por archivo).'],
      ['2) Llene la hoja "Movimientos" con N filas; la suma de dÃ©bitos debe ser igual a la suma de crÃ©ditos.'],
      ['3) Si va a generar cruces de cartera (CxC) o pago a proveedores (CxP), use las hojas correspondientes.'],
      ['4) Campos numÃ©ricos sin valor â†’ 0. Campos de texto sin valor â†’ vacÃ­o.'],
      ['5) Fechas formato AAAAMMDD (ej. 20260426).'],
      ['6) Valores monetarios admiten negativos. El sistema agrega signo y rellena con ceros.'],
      [],
      ['REGISTROS USADOS'],
      [`Cabecera (${ver.cabecera.id}): ${ver.cabecera.description}`],
      [`Movimiento (${ver.movimiento.id}): ${ver.movimiento.description}`],
      [`Cruce CxC (${ver.cxc.id}): ${ver.cxc.description}`],
      [`Cruce CxP (${ver.cxp.id}): ${ver.cxp.description}`],
    ];
    const wsIns = XLSX.utils.aoa_to_sheet(instrucciones);
    wsIns['!cols'] = [{ wch: 110 }];
    XLSX.utils.book_append_sheet(wb, wsIns, 'Instrucciones');

    // Crea hoja con encabezados de la spec (omitiendo los campos fixed cabecera del registro).
    const sheetFromSpec = (spec: RegistroSpec, sample?: Record<string, any>) => {
      const visibleFields = spec.fields.filter((f) => !f.fixed);
      const headers = visibleFields.map((f) => f.name);
      const descRow = visibleFields.map((f) => f.description ?? '');
      const oblRow  = visibleFields.map((f) => (f.required ? 'SÃ­' : 'No'));
      const tipoRow = visibleFields.map((f) => `${f.type}(${f.size})`);
      const dataRow = visibleFields.map((f) => sample?.[f.name] ?? '');
      const aoa = [headers, descRow, oblRow, tipoRow, dataRow];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = headers.map(() => ({ wch: 18 }));
      return ws;
    };

    const sampleCab = {
      F_NUMERO_REG: 1,
      F_CIA: 1,
      F_CONSEC_AUTO_REG: 0,
      F350_ID_CO: '001',
      F350_ID_TIPO_DOCTO: 'CMP',
      F350_CONSEC_DOCTO: 1,
      F350_FECHA: '20260426',
      F350_ID_TERCERO: '900123456',
      F350_IND_ESTADO: 0,
      F350_IND_IMPRESION: 0,
      F350_NOTAS: 'Comprobante de prueba',
    };
    const sampleMov = {
      F_NUMERO_REG: 2,
      F_CIA: 1,
      F350_ID_CO: '001',
      F350_ID_TIPO_DOCTO: 'CMP',
      F350_CONSEC_DOCTO: 1,
      F351_ID_AUXILIAR: '11050501',
      F351_ID_TERCERO: '900123456',
      F351_VALOR_DB: 100000,
      F351_VALOR_CR: 0,
    };

    XLSX.utils.book_append_sheet(wb, sheetFromSpec(ver.cabecera, sampleCab), 'Cabecera');
    XLSX.utils.book_append_sheet(wb, sheetFromSpec(ver.movimiento, sampleMov), 'Movimientos');
    XLSX.utils.book_append_sheet(wb, sheetFromSpec(ver.cxc), 'CxC');
    XLSX.utils.book_append_sheet(wb, sheetFromSpec(ver.cxp), 'CxP');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // PARSEO DEL EXCEL CARGADO POR EL USUARIO
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  /**
   * En las plantillas que generamos, las primeras 4 filas son metadatos
   * (header / descripciÃ³n / obligatorio / tipo), y los datos empiezan en la 5ta.
   * Tomamos la primera fila como nombres de columna y todo lo que viene desde
   * la fila 5 (Ã­ndice 4) como datos. Esto admite que el usuario haya borrado
   * las filas 2-4 si asÃ­ lo prefiere â€” en ese caso usamos sheet_to_json estÃ¡ndar.
   */
  private leerHoja(ws: XLSX.WorkSheet): Record<string, any>[] {
    if (!ws) return [];
    const aoa = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '', raw: true });
    if (aoa.length === 0) return [];
    const headers = (aoa[0] || []).map((h: any) => String(h || '').trim()).filter(Boolean);

    // Detectar dÃ³nde empiezan los datos: si filas 2-4 contienen palabras de metadatos, saltarlas.
    let startRow = 1;
    const isMeta = (row: any[]) => {
      const cell0 = String(row?.[0] ?? '').toLowerCase();
      return /(numero consecutivo|num.{0,3}consecutivo|obligatorio|^s[iÃ­]$|^no$|^[navf]\(\d+\)$|valor fijo|tipo de registro|valida en maestro)/i.test(cell0);
    };
    while (startRow < aoa.length && startRow <= 4 && isMeta(aoa[startRow])) startRow++;

    const rows: Record<string, any>[] = [];
    for (let i = startRow; i < aoa.length; i++) {
      const r = aoa[i];
      if (!r || r.every((c: any) => c === '' || c == null)) continue;
      const obj: Record<string, any> = {};
      headers.forEach((h, idx) => { obj[h] = r[idx] ?? ''; });
      rows.push(obj);
    }
    return rows;
  }

  parsearExcel(buffer: Buffer, versionId: VersionId): ComprobanteParsed {
    const ver = COMPROBANTE_VERSIONS[versionId];
    if (!ver) throw new BadRequestException(`VersiÃ³n invÃ¡lida: ${versionId}`);

    const wb = XLSX.read(buffer, { type: 'buffer' });
    const cabRows = this.leerHoja(wb.Sheets['Cabecera']);
    const movRows = this.leerHoja(wb.Sheets['Movimientos']);
    const cxcRows = this.leerHoja(wb.Sheets['CxC']);
    const cxpRows = this.leerHoja(wb.Sheets['CxP']);

    const errores: string[] = [];
    if (cabRows.length === 0) {
      errores.push('La hoja "Cabecera" estÃ¡ vacÃ­a. Debe contener exactamente una fila.');
    } else if (cabRows.length > 1) {
      errores.push('La hoja "Cabecera" tiene mÃ¡s de una fila; sÃ³lo se usarÃ¡ la primera.');
    }
    if (movRows.length === 0 && cxcRows.length === 0 && cxpRows.length === 0) {
      errores.push('No hay lÃ­neas de movimiento ni de cruces. Debe haber al menos una.');
    }

    // Validar cuadre dÃ©bitos vs crÃ©ditos (movimientos contables 351-00).
    const sumDB = movRows.reduce((a, r) => a + (Number(r.F351_VALOR_DB) || 0), 0);
    const sumCR = movRows.reduce((a, r) => a + (Number(r.F351_VALOR_CR) || 0), 0);
    if (movRows.length > 0 && Math.abs(sumDB - sumCR) > 0.01) {
      errores.push(`El comprobante no cuadra: dÃ©bitos=${sumDB.toFixed(2)} crÃ©ditos=${sumCR.toFixed(2)} diferencia=${(sumDB - sumCR).toFixed(2)}`);
    }

    const cabecera = cabRows[0] || {};
    const movimientos = movRows;
    const cruces = [...cxcRows.map((r) => ({ ...r, __subtipo: '01' })), ...cxpRows.map((r) => ({ ...r, __subtipo: '02' }))];

    return { cabecera, movimientos, cruces, errores };
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // GENERACIÃ“N DEL XML SIESA
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  generarXml(
    parsed: ComprobanteParsed,
    versionId: VersionId,
    options: { conexion?: string; idCia?: string; usuario?: string; clave?: string } = {},
  ): string {
    const ver = COMPROBANTE_VERSIONS[versionId];
    if (!ver) throw new BadRequestException(`VersiÃ³n invÃ¡lida: ${versionId}`);

    const conexion = options.conexion || 'SQL-NEO';
    const idCia    = options.idCia    || String(parsed.cabecera.F_CIA || '1');
    const usuario  = options.usuario  || '';
    const clave    = options.clave    || '';

    // Asegurar que el F_CIA del registro 350/351 use el idCia consolidado.
    const cab: Record<string, any> = { ...parsed.cabecera, F_CIA: idCia, F_NUMERO_REG: 1 };

    const lineas: string[] = [];
    lineas.push(this.buildLinea(ver.cabecera, cab));

    let seq = 2;
    for (const m of parsed.movimientos) {
      lineas.push(this.buildLinea(ver.movimiento, {
        ...m,
        F_NUMERO_REG: seq++,
        F_CIA: idCia,
        F350_ID_CO: m.F350_ID_CO ?? cab.F350_ID_CO,
        F350_ID_TIPO_DOCTO: m.F350_ID_TIPO_DOCTO ?? cab.F350_ID_TIPO_DOCTO,
        F350_CONSEC_DOCTO: m.F350_CONSEC_DOCTO ?? cab.F350_CONSEC_DOCTO,
      }));
    }
    for (const c of parsed.cruces) {
      const spec = c.__subtipo === '02' ? ver.cxp : ver.cxc;
      lineas.push(this.buildLinea(spec, {
        ...c,
        F_NUMERO_REG: seq++,
        F_CIA: idCia,
        F350_ID_CO: c.F350_ID_CO ?? cab.F350_ID_CO,
        F350_ID_TIPO_DOCTO: c.F350_ID_TIPO_DOCTO ?? cab.F350_ID_TIPO_DOCTO,
        F350_CONSEC_DOCTO: c.F350_CONSEC_DOCTO ?? cab.F350_CONSEC_DOCTO,
      }));
    }

    const lineasXml = lineas.map((l) => `    <Linea>${this.escapeXml(l)}</Linea>`).join('\n');

    return (
      `<Importar>\n` +
      `  <NombreConexion>${this.escapeXml(conexion)}</NombreConexion>\n` +
      `  <IdCia>${this.escapeXml(idCia)}</IdCia>\n` +
      `  <Usuario>${this.escapeXml(usuario)}</Usuario>\n` +
      `  <Clave>${this.escapeXml(clave)}</Clave>\n` +
      `  <Version>${ver.id}</Version>\n` +
      `  <Datos>\n` +
      lineasXml + '\n' +
      `  </Datos>\n` +
      `</Importar>`
    );
  }

  private escapeXml(s: string): string {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // ENVÃO DEL XML AL API SIESA UnoEE
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async enviarAlApiSiesa(
    parsed: ComprobanteParsed,
    versionId: VersionId,
    options: { url: string; conexion?: string; idCia?: string; usuario?: string; clave?: string },
  ): Promise<{ status: number; ok: boolean; respuesta: string; xmlEnviado: string }> {
    if (!options?.url) throw new BadRequestException('URL del API SIESA es obligatoria');
    const xml = this.generarXml(parsed, versionId, options);
    try {
      const res = await fetch(options.url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml; charset=utf-8' },
        body: xml,
      });
      const respuesta = await res.text().catch(() => '');
      return { status: res.status, ok: res.ok, respuesta, xmlEnviado: xml };
    } catch (err: any) {
      return {
        status: 0,
        ok: false,
        respuesta: `Error de red: ${err.message || String(err)}`,
        xmlEnviado: xml,
      };
    }
  }
}
