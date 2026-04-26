import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as XLSX from 'xlsx';

export interface TerceroRow {
  NIT: string;
  DV?: string;
  TIPO_IDENT?: string;       // NIT | CC | CE | TI | EXT | OTRO
  TIPO_PERSONA?: string;     // J=Jurídico | N=Natural | E=Extranjero
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

@Injectable()
export class SiesaXmlService {

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // PLANTILLA EXCEL TERCEROS
  // ─────────────────────────────────────────────────────────────────────────────
  generateTercerosExcelTemplate(): Buffer {
    const wb = XLSX.utils.book_new();

    const fields = [
      { col: 'NIT',                    desc: 'NIT sin dígito de verificación',                    ejemplo: '900123456',       req: true  },
      { col: 'DV',                     desc: 'Dígito de verificación (0-9)',                       ejemplo: '7',               req: false },
      { col: 'TIPO_IDENT',             desc: 'NIT | CC | CE | TI | EXT | OTRO',                   ejemplo: 'NIT',             req: true  },
      { col: 'TIPO_PERSONA',           desc: 'J=Jurídico  N=Natural  E=Extranjero',                ejemplo: 'J',               req: true  },
      { col: 'RAZON_SOCIAL',           desc: 'Razón social o nombre completo (*) máx 50',          ejemplo: 'EMPRESA S.A.S',   req: true  },
      { col: 'APELLIDO1',              desc: 'Primer apellido (personas naturales)',                ejemplo: 'GARCIA',          req: false },
      { col: 'APELLIDO2',              desc: 'Segundo apellido (personas naturales)',               ejemplo: 'LOPEZ',           req: false },
      { col: 'NOMBRES',                desc: 'Nombres (personas naturales)',                       ejemplo: 'JUAN PABLO',      req: false },
      { col: 'NOMBRE_COMERCIAL',       desc: 'Nombre comercial o de fantasía (máx 50)',             ejemplo: 'MI EMPRESA',      req: false },
      { col: 'NOMBRE_ESTABLECIMIENTO', desc: 'Nombre del establecimiento (máx 50)',                 ejemplo: 'SEDE PRINCIPAL',  req: false },
      { col: 'DIRECCION',              desc: 'Dirección principal (máx 80)',                       ejemplo: 'CRA 15 # 80-20',  req: false },
      { col: 'COD_CIUDAD',             desc: '11001=Bogotá 76001=Cali 05001=Medellín',             ejemplo: '76001',           req: false },
      { col: 'TELEFONO',               desc: 'Teléfono fijo o celular',                           ejemplo: '3001234567',      req: false },
      { col: 'EMAIL',                  desc: 'Correo electrónico',                                ejemplo: 'info@empresa.co', req: false },
      { col: 'ES_CLIENTE',             desc: '1=Sí  0=No',                                       ejemplo: '1',               req: false },
      { col: 'ES_PROVEEDOR',           desc: '1=Sí  0=No',                                       ejemplo: '0',               req: false },
      { col: 'ES_EMPLEADO',            desc: '1=Sí  0=No',                                       ejemplo: '0',               req: false },
    ];

    const headers     = fields.map(f => f.col);
    const descriptions = fields.map(f => (f.req ? '(*) ' : '') + f.desc);
    const ejemplos    = fields.map(f => f.ejemplo);

    const wsData = [
      headers,
      descriptions,
      // 3 filas de ejemplo (una por caso típico)
      ['900123456', '7',  'NIT', 'J', 'EMPRESA S.A.S',          '',          '',         '',        'MI EMPRESA', 'SEDE PRINCIPAL', 'CRA 15 # 80-20', '76001', '3001234567', 'info@empresa.co', '1', '1', '0'],
      ['80432100',  '0',  'CC',  'N', 'GARCIA LOPEZ JUAN PABLO', 'GARCIA',    'LOPEZ',    'JUAN PABLO', '',        '',              'CRA 10 #20-30',  '11001', '3109876543', 'juan@mail.com',   '0', '0', '1'],
      ['919788902', '0',  'CE',  'E', 'EMPRESA EXTRANJERA S.A',  '',          '',         '',        'EXTCORP',    '',              'CLL 5 #10-20',   '76001', '3205556677', 'ext@corp.com',    '1', '0', '0'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = fields.map(() => ({ wch: 30 }));

    // Instrucciones sheet
    const instrucciones = [
      ['INSTRUCCIONES DE USO'],
      [''],
      ['1. Complete la hoja "Terceros" a partir de la fila 4 (filas 1-3 son encabezado, descripción y ejemplo).'],
      ['2. Campos marcados con (*) son OBLIGATORIOS.'],
      ['3. TIPO_IDENT: tipo de documento. Valores válidos:'],
      ['   NIT = Número de Identificación Tributaria'],
      ['   CC  = Cédula de Ciudadanía'],
      ['   CE  = Cédula de Extranjería'],
      ['   TI  = Tarjeta de Identidad'],
      ['   EXT = Pasaporte/Exterior'],
      ['   OTRO= Otros'],
      ['4. TIPO_PERSONA: tipo de persona. J=Jurídico  N=Natural  E=Extranjero'],
      ['5. COD_CIUDAD: código interno de Siesa (tabla t013_mm_ciudades).'],
      ['   11001=Bogotá  76001=Cali  05001=Medellín  08001=Barranquilla'],
      ['6. ES_CLIENTE / ES_PROVEEDOR / ES_EMPLEADO: 1=Sí, 0=No. Por defecto 0.'],
      ['7. NIT: sin puntos ni guiones.'],
      ['8. Guarde el archivo como .xlsx antes de subir.'],
      [''],
      ['MAPEO AL FORMATO XML SIESA (tipo registro 200):'],
      ['  NIT          → posición 19-33  (15 chars)'],
      ['  TIPO         → posición 49     (1 char)'],
      ['  RAZON_SOCIAL → posición 51-100 (50 chars)'],
      ['  APELLIDO1    → posición 101-115 (15 chars)'],
      ['  APELLIDO2    → posición 116-130 (15 chars)'],
      ['  NOMBRES      → posición 131-150 (20 chars)'],
    ];
    const wsInst = XLSX.utils.aoa_to_sheet(instrucciones);
    wsInst['!cols'] = [{ wch: 90 }];

    XLSX.utils.book_append_sheet(wb, ws, 'Terceros');
    XLSX.utils.book_append_sheet(wb, wsInst, 'Instrucciones');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PARSEAR EXCEL → FILAS DE TERCEROS
  // ─────────────────────────────────────────────────────────────────────────────
  parseTercerosExcel(buffer: Buffer, fileName: string): { rows: TerceroRow[]; errors: string[] } {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('tercero')) || workbook.SheetNames[0];
    const ws = workbook.Sheets[sheetName];
    const all: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];

    if (all.length < 4) {
      return { rows: [], errors: ['El archivo no tiene datos (se esperan al menos 4 filas).'] };
    }

    // Row 0 = headers, row 1 = descriptions, row 2 = example → data starts at row 3 (index 3)
    const headers: string[] = (all[0] as string[]).map(h => String(h).trim().toUpperCase());
    const dataRows = all.slice(3).filter(r => r.some(c => String(c).trim() !== ''));

    const errors: string[] = [];
    const rows: TerceroRow[] = dataRows.map((raw, idx) => {
      const lineNum = idx + 4;
      const get = (field: string) => {
        const colIdx = headers.indexOf(field);
        return colIdx >= 0 ? String(raw[colIdx] ?? '').trim() : '';
      };

      const nit = get('NIT');
      if (!nit) errors.push(`Fila ${lineNum}: NIT es obligatorio`);

      const tipoIdent   = get('TIPO_IDENT').toUpperCase() || 'NIT';
      const tipoPersona = get('TIPO_PERSONA').toUpperCase() || 'J';
      const validIdent   = ['NIT','CC','CE','TI','EXT','OTRO'];
      const validPersona = ['J','N','E'];
      if (!validIdent.includes(tipoIdent))   errors.push(`Fila ${lineNum}: TIPO_IDENT inválido "${tipoIdent}" (NIT|CC|CE|TI|EXT|OTRO)`);
      if (!validPersona.includes(tipoPersona)) errors.push(`Fila ${lineNum}: TIPO_PERSONA inválido "${tipoPersona}" (J|N|E)`);

      return {
        NIT: nit,
        DV: get('DV'),
        TIPO_IDENT: tipoIdent,
        TIPO_PERSONA: tipoPersona,
        RAZON_SOCIAL: get('RAZON_SOCIAL'),
        APELLIDO1: get('APELLIDO1'),
        APELLIDO2: get('APELLIDO2'),
        NOMBRES: get('NOMBRES'),
        NOMBRE_COMERCIAL: get('NOMBRE_COMERCIAL'),
        NOMBRE_ESTABLECIMIENTO: get('NOMBRE_ESTABLECIMIENTO'),
        DIRECCION: get('DIRECCION'),
        COD_CIUDAD: get('COD_CIUDAD'),
        TELEFONO: get('TELEFONO'),
        EMAIL: get('EMAIL'),
        ES_CLIENTE: get('ES_CLIENTE') || '0',
        ES_PROVEEDOR: get('ES_PROVEEDOR') || '0',
        ES_EMPLEADO: get('ES_EMPLEADO') || '0',
      };
    });

    return { rows, errors };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GENERAR XML SIESA TERCEROS
  // Formato tipo registro 200: ancho fijo según especificación Siesa
  // ─────────────────────────────────────────────────────────────────────────────
  generateTercerosXml(
    rows: TerceroRow[],
    options: { conexion?: string; idCia?: string; usuario?: string; clave?: string } = {},
  ): string {
    const conexion = options.conexion || 'SQL-NEO';
    const idCia    = options.idCia    || '1';
    const usuario  = options.usuario  || '';
    const clave    = options.clave    || '';

    const pad  = (s: string, len: number) => String(s ?? '').substring(0, len).padEnd(len, ' ');
    const padL = (s: string, len: number) => String(s ?? '').substring(0, len).padStart(len, '0');

    const lineas: string[] = [];

    // Línea de apertura (tipo 001)
    lineas.push(`000000100000001${padL(idCia, 3)}`);

    rows.forEach((r, idx) => {
      const seq = padL(String((idx + 2) * 10 - 10 + 2), 6); // 000002, 000012, ...
      // seq line: posición 1-6=secuencia, 7-9=tipo(200), 10-11=subtipo(02), 12-13=campo, 14-16=cia
      // Formato tipo 200: tercero
      const seqStr = padL(String(idx + 2), 6);
      // TIPO_IDENT + TIPO_PERSONA → código Siesa 2 chars para el XML
      const tipoIdentMapXml: Record<string, string> = { NIT: 'N', CC: 'C', CE: 'E', TI: 'T', EXT: 'X', OTRO: 'O' };
      const tipoPersonaMapXml: Record<string, string> = { J: '0', N: '1', E: '2' };
      const tipoSiesa = tipoIdentMapXml[(r.TIPO_IDENT || 'NIT').toUpperCase()] ?? 'N';
      const indTipoChr = tipoPersonaMapXml[(r.TIPO_PERSONA || 'J').toUpperCase()] ?? '0';
      const indTipo = tipoSiesa + indTipoChr; // ej. N0, C1, E2
      const nitPad   = pad(r.NIT || '', 15);
      const dvPad    = pad(r.DV || '', 1);
      const razon    = pad(r.RAZON_SOCIAL || '', 50);
      const ape1     = pad(r.APELLIDO1 || '', 15);
      const ape2     = pad(r.APELLIDO2 || '', 15);
      const nombres  = pad(r.NOMBRES || '', 20);
      const nomComercial = pad(r.NOMBRE_COMERCIAL || (r.RAZON_SOCIAL || ''), 50);
      const nomEstab = pad(r.NOMBRE_ESTABLECIMIENTO || '', 50);
      const codCiud  = pad(r.COD_CIUDAD || '', 6);
      const tel      = pad(r.TELEFONO || '', 20);
      const email    = pad(r.EMAIL || '', 50);
      const dir      = pad(r.DIRECCION || '', 80);

      // Construir línea tipo 200 con posiciones fijas según muestra Siesa
      // Basado en reverse-engineering del archivo Importar Terceros.xml
      // Pos 1-6: secuencia | 7-9: "200" | 10-11: "02" | 12-13: "00" | 14-16: cia+rowid | 17-18: tipo+subtipo
      // 19-33: NIT(15) | 34: DV(1) | 35-48: NIT(14 again, replica) | 49: tipo(1) | 50: ind(1)
      // 51-100: razon social(50) | 101-115: ape1(15) | 116-130: ape2(15) | 131-150: nombres(20)
      // 151-200: nom comercial(50) | 201-250: nombre estab(50) | 251-256: cod ciudad(6)
      // 257-276: telefono(20) | 277-326: email(50)
      const lineData =
        seqStr +
        '200' +
        '02' +
        '000' +
        padL(idCia, 3) +
        '1' +
        nitPad +
        dvPad +
        nitPad.substring(0, 14) +
        tipoSiesa +
        indTipo +
        razon +
        ape1 +
        ape2 +
        nombres +
        nomComercial +
        dir +
        codCiud +
        tel +
        email;

      lineas.push(lineData);
    });

    // Línea de cierre (tipo 9999)
    lineas.push(`${padL(String(rows.length + 2), 6)}99990${padL(idCia, 2)}1${padL(idCia, 3)}`);

    const lineasXml = lineas.map(l => `    <Linea>${l}</Linea>`).join('\n');

    return `<Importar>  \n` +
      `  <NombreConexion>${conexion}</NombreConexion>  \n` +
      `  <IdCia>${idCia}</IdCia> \n` +
      `  <Usuario>${usuario}</Usuario> \n` +
      `  <Clave>${clave}</Clave> \n` +
      `  <Datos>\n` +
      lineasXml + '\n' +
      `  </Datos> \n` +
      `</Importar>`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // INSERTAR TERCEROS DIRECTAMENTE EN SQL SERVER (t015 + t200)
  // ─────────────────────────────────────────────────────────────────────────────
  async insertTercerosToDb(
    rows: TerceroRow[],
    idCia: number,
  ): Promise<{ inserted: number; skipped: number; errors: { nit: string; message: string }[] }> {
    const errors: { nit: string; message: string }[] = [];
    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const nit = (row.NIT || '').trim();
      if (!nit) continue;

      try {
        // ── Check duplicado por NIT en la compañía ──────────────────────────
        const f200Id = nit.padEnd(15, ' ');
        const existing = await this.dataSource.query(
          `SELECT f200_rowid FROM t200_mm_terceros WHERE f200_id_cia = @0 AND RTRIM(f200_id) = @1`,
          [idCia, nit],
        );
        if (existing.length > 0) {
          skipped++;
          errors.push({ nit, message: 'Ya existe en la base de datos (omitido)' });
          continue;
        }

        // ── Buscar ciudad en BD a partir de '76001' → depto='76' ciudad='001' ──
        const codCiudad = (row.COD_CIUDAD || '').trim();
        let idPais: string | null = null;
        let idDepto: string | null = null;
        let idCiudad: string | null = null;

        if (codCiudad.length >= 5) {
          const depto  = codCiudad.substring(0, 2);
          const ciudad = codCiudad.substring(2, 5);
          const ciudadRow = await this.dataSource.query(
            `SELECT TOP 1 f013_id_pais, f013_id_depto, f013_id
             FROM t013_mm_ciudades
             WHERE f013_id_depto = @0 AND f013_id = @1`,
            [depto, ciudad],
          );
          if (ciudadRow.length > 0) {
            idPais   = ciudadRow[0].f013_id_pais;
            idDepto  = ciudadRow[0].f013_id_depto;
            idCiudad = ciudadRow[0].f013_id;
          }
        }

        const contactName = (
          row.RAZON_SOCIAL ||
          [row.NOMBRES, row.APELLIDO1, row.APELLIDO2].filter(Boolean).join(' ') ||
          nit
        ).substring(0, 50);

        // ── INSERT t015_mm_contactos (usando tabla temp por triggers) ──────
        const insertContact: any[] = await this.dataSource.query(
          `DECLARE @ids TABLE (rowid INT);
          INSERT INTO t015_mm_contactos (
            f015_ts, f015_id_cia, f015_contacto,
            f015_direccion1, f015_direccion2, f015_direccion3,
            f015_id_pais, f015_id_depto, f015_id_ciudad, f015_id_barrio,
            f015_telefono, f015_fax, f015_cod_postal, f015_email,
            f015_valor_et1,  f015_valor_et2,  f015_valor_et3,  f015_valor_et4,  f015_valor_et5,
            f015_valor_et6,  f015_valor_et7,  f015_valor_et8,  f015_valor_et9,  f015_valor_et10,
            f015_valor_et11, f015_valor_et12, f015_valor_et13, f015_valor_et14, f015_valor_et15,
            f015_valor_et16, f015_valor_et17, f015_valor_et18, f015_valor_et19, f015_valor_et20
          )
          OUTPUT INSERTED.f015_rowid INTO @ids(rowid)
          VALUES (
            GETDATE(), @0, @1,
            @2, '', '',
            @3, @4, @5, NULL,
            @6, '', '', @7,
            '','','','','','','','','','',
            '','','','','','','','','',''
          );
          SELECT rowid AS f015_rowid FROM @ids;`,
          [
            idCia,
            contactName,
            (row.DIRECCION || '').substring(0, 40),
            idPais,
            idDepto,
            idCiudad,
            (row.TELEFONO || '').substring(0, 20),
            (row.EMAIL || '').substring(0, 255),
          ],
        );

        const f015Rowid: number = insertContact[0]?.f015_rowid;
        if (!f015Rowid) throw new Error('No se obtuvo rowid del contacto');

        // ── Tipo identificación y tipo persona ──────────────────────────────
        const tipoIdentMap: Record<string, string> = {
          NIT: 'N', CC: 'C', CE: 'E', TI: 'T', EXT: 'X', OTRO: 'O',
        };
        const tipoPersonaMap: Record<string, number> = { J: 0, N: 1, E: 2 };

        const tipoIdentKey   = (row.TIPO_IDENT   || 'NIT').toUpperCase();
        const tipoPersonaKey = (row.TIPO_PERSONA || 'J').toUpperCase();
        const idTipoIdent = tipoIdentMap[tipoIdentKey]  ?? 'N';
        const indTipo     = tipoPersonaMap[tipoPersonaKey] ?? 0;

        const razonSocial = (
          row.RAZON_SOCIAL ||
          [row.NOMBRES, row.APELLIDO1, row.APELLIDO2].filter(Boolean).join(' ') ||
          nit
        ).substring(0, 100);

        // ── INSERT t200_mm_terceros ─────────────────────────────────────────
        await this.dataSource.query(
          `INSERT INTO t200_mm_terceros (
            f200_ts, f200_id_cia, f200_id,
            f200_nit, f200_dv_nit, f200_id_tipo_ident,
            f200_ind_tipo_tercero, f200_razon_social,
            f200_apellido1, f200_apellido2, f200_nombres,
            f200_rowid_contacto,
            f200_ind_cliente, f200_ind_proveedor, f200_ind_empleado,
            f200_ind_accionista, f200_ind_otros, f200_ind_interno,
            f200_nombre_est, f200_fecha_nacimiento,
            f200_ind_estado, f200_ind_no_domiciliado,
            f200_ind_gum_unificado, f200_ind_unificado
          )
          VALUES (
            GETDATE(), @0, @1,
            @2, @3, @4,
            @5, @6,
            @7, @8, @9,
            @10,
            @11, @12, @13,
            0, 0, 0,
            @14, '19000101',
            1, 0, 0, 0
          )`,
          [
            idCia,                                              // @0 f200_id_cia
            f200Id,                                             // @1 f200_id (NIT padded 15)
            nit,                                                // @2 f200_nit
            (row.DV || '').substring(0, 3),                    // @3 f200_dv_nit
            idTipoIdent,                                        // @4 f200_id_tipo_ident
            indTipo,                                            // @5 f200_ind_tipo_tercero
            razonSocial,                                        // @6 f200_razon_social
            (row.APELLIDO1 || '').substring(0, 30),             // @7 f200_apellido1
            (row.APELLIDO2 || '').substring(0, 30),             // @8 f200_apellido2
            (row.NOMBRES || '').substring(0, 40),               // @9 f200_nombres
            f015Rowid,                                          // @10 f200_rowid_contacto
            row.ES_CLIENTE === '1' ? 1 : 0,                    // @11 f200_ind_cliente
            row.ES_PROVEEDOR === '1' ? 1 : 0,                  // @12 f200_ind_proveedor
            row.ES_EMPLEADO === '1' ? 1 : 0,                   // @13 f200_ind_empleado
            (row.NOMBRE_ESTABLECIMIENTO || razonSocial).substring(0, 100), // @14 f200_nombre_est
          ],
        );

        inserted++;
      } catch (err: any) {
        errors.push({ nit, message: err.message || String(err) });
      }
    }

    return { inserted, skipped, errors };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ENVIAR TERCEROS ROW-BY-ROW VÍA HTTP AL API SIESA
  // ─────────────────────────────────────────────────────────────────────────────
  async enviarXmlToSiesa(
    rows: TerceroRow[],
    options: { conexion: string; idCia: string; usuario: string; clave: string; url: string },
  ): Promise<{ enviados: number; errores: Array<{ nit: string; status?: number; message: string }> }> {
    let enviados = 0;
    const errores: Array<{ nit: string; status?: number; message: string }> = [];

    for (const row of rows) {
      const nit = row.NIT || 'SIN_NIT';
      try {
        const xml = this.generateTercerosXml([row], {
          conexion: options.conexion,
          idCia: options.idCia,
          usuario: options.usuario,
          clave: options.clave,
        });

        const res = await fetch(options.url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/xml; charset=utf-8' },
          body: xml,
        });

        if (!res.ok) {
          const body = await res.text().catch(() => '');
          errores.push({ nit, status: res.status, message: `HTTP ${res.status}: ${body.substring(0, 200)}` });
        } else {
          enviados++;
        }
      } catch (err: any) {
        errores.push({ nit, message: err.message || String(err) });
      }
    }

    return { enviados, errores };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ACTUALIZAR TIPO DE UN TERCERO EXISTENTE
  // ─────────────────────────────────────────────────────────────────────────────
  async updateTerceroTipo(nit: string, tipoIdentKey: string, tipoPersonaKey: string, idCia = 1) {
    const tipoIdentMap: Record<string, string> = {
      NIT: 'N', CC: 'C', CE: 'E', TI: 'T', EXT: 'X', OTRO: 'O',
    };
    const tipoPersonaMap: Record<string, number> = { J: 0, N: 1, E: 2 };

    const idTipoIdent = tipoIdentMap[tipoIdentKey.toUpperCase()] ?? 'N';
    const indTipo     = tipoPersonaMap[tipoPersonaKey.toUpperCase()] ?? 0;

    await this.dataSource.query(
      `UPDATE t200_mm_terceros
       SET f200_id_tipo_ident = @0, f200_ind_tipo_tercero = @1, f200_ts = GETDATE()
       WHERE f200_nit = @2 AND f200_id_cia = @3`,
      [idTipoIdent, indTipo, nit, idCia],
    );

    return { nit, tipo_ident: idTipoIdent, ind_tipo_tercero: indTipo, updated: true };
  }
}
