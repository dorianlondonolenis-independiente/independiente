import { Injectable, InternalServerErrorException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as http from 'http';

// Tablas de negocio relevantes para el chat IA
const TABLAS_NEGOCIO = [
  't200_mm_terceros',
  't201_mm_clientes',
  't202_mm_proveedores',
  't120_mc_items',
  't450_cm_docto_invent',
  't460_cm_docto_remision_venta',
  't461_cm_docto_factura_venta',
  't470_cm_movto_invent',
  't400_cm_existencia',
  't5400_res_exis_item_bdg',
  't5461_acum_ventas_fact',
  't5450_acum_inventarios',
  't350_co_docto_contable',
  't351_co_mov_docto',
];

@Injectable()
export class ChatService implements OnModuleInit {
  private readonly logger = new Logger(ChatService.name);
  private schema = '';                                      // flag: schema cargado
  private schemaPorTabla = new Map<string, string>();       // tabla → bloque DDL
  private tablasDisponibles: string[] = [];
  private readonly ollamaModel = 'qwen2.5:7b';
  private readonly ollamaHost = '127.0.0.1';
  private readonly ollamaPort = 11434;

  // Mapeo de palabras clave → tablas relevantes.
  // TAMBIÉN actúa como detector de intención: si ningún grupo hace match → no es consulta de datos.
  //
  // Grupos:
  //  A) Entidades de negocio (sustantivos del dominio)
  //  B) Referencias semánticas a columnas (el usuario no sabe el nombre exacto pero describe el dato)
  //  C) Verbos de consulta (solo activan cuando vienen SOLOS sin dominio; refuerzan intención)
  private readonly MAPA_TABLAS: { keys: string[]; tablas: string[] }[] = [

    // ── A. ENTIDADES DE NEGOCIO ──────────────────────────────────────────────

    // Terceros / clientes / proveedores (incluye typos comunes)
    { keys: ['tercero','terceros','persona','personas','nit','razon social','razón social','razon','razón'],
      tablas: ['t200_mm_terceros'] },
    { keys: ['cliente','clientes'],
      tablas: ['t200_mm_terceros','t201_mm_clientes','t5461_acum_ventas_fact'] },
    { keys: ['proveedor','proveedores','proveedor','provedor','proovedor','provvedor'],
      tablas: ['t200_mm_terceros','t202_mm_proveedores'] },

    // Productos / items
    { keys: ['producto','productos','item','items','articulo','articulos','artículo','artículos','referencia','referencias','sku','codigo','código'],
      tablas: ['t120_mc_items'] },

    // Existencias / stock / bodega
    { keys: ['existencia','existencias','stock','bodega','bodegas','almacen','almacén','disponible','disponibilidad','estado bodega','estado de bodega','estado de la bodega'],
      tablas: ['t400_cm_existencia','t5400_res_exis_item_bdg','t120_mc_items'] },

    // Ventas / facturas
    { keys: ['venta','ventas','vendido','vendidos','vendida','vendidas','factura','facturas','facturado','facturacion','facturación'],
      tablas: ['t461_cm_docto_factura_venta','t5461_acum_ventas_fact','t200_mm_terceros'] },

    // Pedidos de venta
    { keys: ['pedido','pedidos','orden de venta','ordenes de venta'],
      tablas: ['t460_cm_docto_remision_venta','t461_cm_docto_factura_venta','t200_mm_terceros'] },

    // Remisiones / despachos
    { keys: ['remision','remisiones','remisión','remito','despacho','despachos','entrega','entregas'],
      tablas: ['t460_cm_docto_remision_venta','t200_mm_terceros'] },

    // Compras / órdenes de compra
    { keys: ['compra','compras','orden de compra','ordenes de compra','orden compra','pedido de compra','pedidos de compra'],
      tablas: ['t450_cm_docto_invent','t200_mm_terceros','t120_mc_items'] },

    // Inventario / movimientos de inventario
    { keys: ['inventario','movimiento inventario','movimientos inventario','entrada','salida','traslado','movimiento','movimientos'],
      tablas: ['t470_cm_movto_invent','t450_cm_docto_invent','t120_mc_items'] },

    // Documentos contables / contabilidad
    { keys: ['contable','contables','contabilidad','documento contable','documentos contables','comprobante','comprobantes','asiento','asientos'],
      tablas: ['t350_co_docto_contable','t351_co_mov_docto'] },

    // Resúmenes / acumulados por periodo
    { keys: ['periodo','periodos','mensual','acumulado','acumulados','acumuladas','resumen ventas','ventas acumuladas'],
      tablas: ['t5461_acum_ventas_fact','t5450_acum_inventarios'] },

    // ── B. REFERENCIAS SEMÁNTICAS A COLUMNAS ─────────────────────────────────
    // El usuario describe el dato sin conocer el nombre exacto de la columna

    // Columnas de valor monetario en facturas
    { keys: ['valor bruto','valor de venta','monto venta','importe venta','total factura','total venta','vlr bruto','bruto'],
      tablas: ['t461_cm_docto_factura_venta','t5461_acum_ventas_fact'] },

    // Columnas de valor neto / descuentos
    { keys: ['valor neto','monto neto','importe neto','neto','descuento','descuentos'],
      tablas: ['t461_cm_docto_factura_venta','t5461_acum_ventas_fact'] },

    // Columnas de impuesto / iva
    { keys: ['impuesto','iva','impuestos','tax'],
      tablas: ['t461_cm_docto_factura_venta'] },

    // Columnas de cantidad / stock
    { keys: ['cantidad','cantidades','unidades','cant','existencia actual','stock actual'],
      tablas: ['t400_cm_existencia','t470_cm_movto_invent','t120_mc_items'] },

    // Columnas de precio / costo unitario
    { keys: ['precio','precio de venta','precio unitario','costo','costo promedio','costo unitario','precio costo'],
      tablas: ['t120_mc_items','t470_cm_movto_invent','t461_cm_docto_factura_venta'] },

    // Estado del documento / registro
    // Estado de documentos — usar frases compuestas para evitar falsos positivos (ej: "estados unidos")
    { keys: ['aprobado','aprobados','anulado','anulados','elaboracion','elaboración',
             'estado del documento','estado de la factura','estado de la remision','estado del pedido',
             'documentos aprobados','facturas aprobadas','documentos anulados'],
      tablas: ['t461_cm_docto_factura_venta','t460_cm_docto_remision_venta','t350_co_docto_contable','t450_cm_docto_invent'] },

    // Identificadores de documentos
    { keys: ['consecutivo','nro documento','numero documento','número documento','tipo documento','tipo de documento','nit'],
      tablas: ['t461_cm_docto_factura_venta','t350_co_docto_contable','t200_mm_terceros'] },

    // ── C. VERBOS DE CONSULTA EXPLÍCITA (refuerzan intención, pero solos no bastan) ──
    // Solo activan las tablas más genéricas si no hay ningún otro match de dominio
    { keys: ['dame','muestra','lista','listar','mostrar','busca','buscar','top','últimos','ultimos','primeros','ranking','reporte','informe'],
      tablas: ['t200_mm_terceros','t5461_acum_ventas_fact','t461_cm_docto_factura_venta','t120_mc_items'] },
  ];

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    try {
      await this.cargarSchemaDesdeDB();
      this.logger.log(`Schema cargado: ${this.tablasDisponibles.length} tablas disponibles`);
    } catch (e) {
      this.logger.warn(`No se pudo cargar schema desde BD: ${e instanceof Error ? e.message : e}`);
    }
  }

  private async cargarSchemaDesdeDB(): Promise<void> {
    // Obtener columnas reales de las tablas de negocio
    const tablasStr = TABLAS_NEGOCIO.map(t => `'${t}'`).join(',');
    const rows: { TABLE_NAME: string; COLUMN_NAME: string; DATA_TYPE: string }[] =
      await this.dataSource.query(`
        SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME IN (${tablasStr})
        ORDER BY TABLE_NAME, ORDINAL_POSITION
      `);

    if (rows.length === 0) {
      this.schema = '';
      return;
    }

    // Agrupar por tabla y guardar schema por tabla
    const porTabla = new Map<string, { col: string; tipo: string }[]>();
    for (const r of rows) {
      if (!porTabla.has(r.TABLE_NAME)) porTabla.set(r.TABLE_NAME, []);
      porTabla.get(r.TABLE_NAME)!.push({ col: r.COLUMN_NAME, tipo: r.DATA_TYPE });
    }

    this.tablasDisponibles = [...porTabla.keys()];

    // Guardar DDL por tabla para selección dinámica
    for (const [tabla, cols] of porTabla) {
      const bloque = [`TABLE ${tabla} (`, cols.map(c => `  ${c.col}  ${c.tipo.toUpperCase()}`).join(',\n'), ')'].join('\n');
      this.schemaPorTabla.set(tabla, bloque);
    }

    this.schema = 'cargado'; // flag
  }

  /** Devuelve las tablas relevantes para la pregunta (sin duplicados, max 5).
   *  Si no hay ningún match devuelve [] → la pregunta no es una consulta de datos.
   *  Los verbos de consulta (grupo C, el último) solo activan si ya hay dominio encontrado,
   *  o si la pregunta tiene al menos 4 palabras (consulta real, no saludo). */
  private seleccionarTablas(pregunta: string): string[] {
    const lower = pregunta.toLowerCase();
    const seleccion = new Set<string>();
    let tieneVerboSolo = false;
    let verbosTablas: string[] = [];

    // El grupo C (verbos) es el último — lo tratamos separado
    const grupos = [...this.MAPA_TABLAS];
    const grupoVerbos = grupos[grupos.length - 1];

    for (const { keys, tablas } of grupos.slice(0, -1)) {
      if (keys.some(k => lower.includes(k))) {
        tablas.forEach(t => seleccion.add(t));
      }
    }

    // Verbos: solo activan el fallback si ya hay dominio O la pregunta tiene ≥4 palabras
    if (grupoVerbos.keys.some(k => lower.includes(k))) {
      if (seleccion.size > 0) {
        // ya hay dominio, los verbos no suman tablas adicionales (evitar ruido)
      } else if (lower.split(/\s+/).length >= 4) {
        // pregunta larga sin dominio: activar fallback genérico
        grupoVerbos.tablas.forEach(t => seleccion.add(t));
      }
      // si la pregunta tiene < 4 palabras y no hay dominio → no activa (ej: "dame info")
    }

    return [...seleccion].filter(t => this.schemaPorTabla.has(t)).slice(0, 5);
  }

  /** Construye el bloque SCHEMA reducido para el prompt */
  private buildSchemaMini(tablas: string[]): string {
    return tablas.map(t => this.schemaPorTabla.get(t) ?? '').filter(Boolean).join('\n\n');
  }

  /** Patrones que indican una pregunta CONCEPTUAL/GENERAL aunque tenga keywords de dominio.
   *  Ej: "qué es un cliente", "cómo funciona el inventario" → respuesta natural, no SQL. */
  private readonly PATRONES_CONCEPTUALES = [
    /^\s*(qu[eé]|c[oó]mo|por qu[eé]|cu[aá]ndo|d[oó]nde|qui[eé]n)\s+(es|son|fue|eran|significa|significa|representa|hace|hacen|funciona|se usa|se llama)/i,
    /\b(define|definici[oó]n|concepto|significado|qu[eé] es|qu[eé] son|qu[eé] significa|explicar|expl[ií]came|c[oó]mo funciona|c[oó]mo se usa|para qu[eé] sirve|diferencia entre)\b/i,
    /\b(ayuda|ayudar|tutorial|ejemplo de|ejemplos de|aprend|ense[nñ]|instrucci)\b/i,
  ];

  /** Devuelve true si la frase, aunque tenga keywords, es una pregunta conceptual */
  private esConceptual(pregunta: string): boolean {
    return this.PATRONES_CONCEPTUALES.some(p => p.test(pregunta));
  }

  async query(pregunta: string): Promise<{ sql: string; resultado: unknown[]; pregunta: string; tokens: number; esNatural?: boolean; respuestaNatural?: string }> {
    if (!pregunta || pregunta.trim().length < 3) {
      throw new BadRequestException('La pregunta debe tener al menos 3 caracteres');
    }

    if (!this.schema) {
      throw new InternalServerErrorException('No se pudo cargar el esquema de la base de datos. Verifique la conexión.');
    }

    const tablasRelevantes = this.seleccionarTablas(pregunta.trim());

    // ¿Tiene keywords de dominio pero es una pregunta conceptual?
    if (tablasRelevantes.length > 0 && this.esConceptual(pregunta.trim())) {
      const respuestaNatural = await this.responderNaturalmente(pregunta.trim());
      return { pregunta: pregunta.trim(), sql: '', resultado: [], tokens: 0, esNatural: true, respuestaNatural };
    }
    if (tablasRelevantes.length === 0) {
      // No hay dominio de negocio → respuesta natural con Ollama
      const respuestaNatural = await this.responderNaturalmente(pregunta.trim());
      return { pregunta: pregunta.trim(), sql: '', resultado: [], tokens: 0, esNatural: true, respuestaNatural };
    }

    // Generar y validar SQL — si falla, responder naturalmente en vez de lanzar error al usuario
    let sql: string;
    let validado: string;
    let resultado: unknown[];
    try {
      sql = await this.generarSQL(pregunta.trim(), tablasRelevantes);
      validado = this.validarSQL(sql);
      resultado = await this.ejecutarSQL(validado);
    } catch (e) {
      this.logger.warn(`SQL faló para "${pregunta}": ${e instanceof Error ? e.message : e}`);
      const respuestaNatural = await this.responderNaturalmente(pregunta.trim());
      return { pregunta: pregunta.trim(), sql: '', resultado: [], tokens: 0, esNatural: true, respuestaNatural };
    }

    return {
      pregunta: pregunta.trim(),
      sql: validado,
      resultado,
      tokens: Math.ceil((pregunta.length + sql.length) / 4),
    };
  }

  /** Responde en lenguaje natural con Ollama (sin schema SQL).
   *  Para saludos, preguntas conceptuales o temas fuera del dominio de datos. */
  private async responderNaturalmente(pregunta: string): Promise<string> {
    const systemPrompt = `Eres un asistente de datos empresariales integrado en un ERP. Responde en español de forma amable y concisa.
Si el usuario saluda o hace preguntas generales, responde con naturalidad.
Si pregunta conceptos de negocio (qué es un cliente, cómo funciona el inventario, etc.), explícalo brevemente.
Si la pregunta no tiene relación con datos empresariales, responde cordialmente y menciona que puedes consultar datos reales del negocio como ventas, clientes, facturas, inventario, etc.
Nunca generes SQL. Máximo 3 oraciones.`;

    const body = JSON.stringify({
      model: this.ollamaModel,
      prompt: pregunta,
      system: systemPrompt,
      stream: false,
      options: { temperature: 0.7, num_predict: 150 },
    });

    return new Promise((resolve) => {
      const req = http.request(
        { hostname: this.ollamaHost, port: this.ollamaPort, path: '/api/generate', method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed.response?.trim() ?? '¡Hola! Puedo ayudarte a consultar datos del negocio: ventas, clientes, inventario, facturas y más.');
            } catch {
              resolve('¡Hola! Puedo ayudarte a consultar datos del negocio: ventas, clientes, inventario, facturas y más.');
            }
          });
        },
      );
      req.on('error', () => resolve('¡Hola! Puedo ayudarte a consultar datos del negocio: ventas, clientes, inventario, facturas y más.'));
      req.setTimeout(20000, () => { req.destroy(); resolve('¡Hola! Puedo ayudarte a consultar datos del negocio: ventas, clientes, inventario, facturas y más.'); });
      req.write(body);
      req.end();
    });
  }

  private async generarSQL(pregunta: string, tablasRelevantes: string[]): Promise<string> {
    // Tablas ya calculadas en query() — usar directamente
    const schemaMini = this.buildSchemaMini(tablasRelevantes);
    this.logger.debug(`Tablas seleccionadas para "${pregunta}": ${tablasRelevantes.join(', ')}`);

    const systemPrompt = `Eres un experto en SQL Server. Responde SOLO con la consulta SQL, sin explicaciones ni bloques markdown.

REGLAS:
1. Solo SELECT. Nunca INSERT/UPDATE/DELETE/DROP/CREATE/ALTER/EXEC.
2. Usa SOLO las tablas y columnas del SCHEMA. No inventes nombres.
3. Sin límite especificado → SELECT TOP 10.
4. Periodos en formato YYYYMM (202605 = junio 2026).
5. Termina con punto y coma.

MAPEO:
- "clientes" → t200_mm_terceros WHERE f200_ind_cliente=1
- "proveedores" → t200_mm_terceros WHERE f200_ind_proveedor=1
- "qué proveedor/cliente es [nit]" → SELECT f200_nombre_est, f200_razon_social, f200_nit FROM t200_mm_terceros WHERE f200_nit = '[nit]'
- "ventas acumuladas" → t5461_acum_ventas_fact (JOIN t200_mm_terceros ON f5461_rowid_tercero_fact=f200_rowid)
- "facturas" → t461_cm_docto_factura_venta
- "stock/existencias" → t400_cm_existencia JOIN t120_mc_items ON f400_rowid_item_ext=f120_rowid
- "documentos contables" → t350_co_docto_contable

COLUMNAS CLAVE (usa EXACTAMENTE estos nombres, NUNCA uses el prefijo de tabla como prefijo de columna):
- Nombre del tercero: f200_nombre_est  (NO t200_nombre_est, NO f200_nombre)
- Razón social: f200_razon_social       (NO t200_razon_social)
- NIT del tercero: f200_nit             (NO t200_nit)
- Es cliente: f200_ind_cliente          (NO t200_ind_cliente)
- Es proveedor: f200_ind_proveedor      (NO t200_ind_proveedor)
- Descripción del item: f120_descripcion (NO t120_nombre, NO f120_nombre)
- Referencia del item: f120_referencia

SCHEMA (solo tablas relevantes):
${schemaMini}

EJEMPLOS:
Pregunta: top clientes por ventas
SQL: SELECT TOP 10 t.f200_nombre_est AS cliente, SUM(a.f5461_vlr_bruto) AS total FROM t5461_acum_ventas_fact a JOIN t200_mm_terceros t ON a.f5461_rowid_tercero_fact = t.f200_rowid GROUP BY t.f200_nombre_est ORDER BY total DESC;

Pregunta: qué proveedor es 800213511
SQL: SELECT TOP 1 f200_nombre_est AS nombre, f200_razon_social AS razon_social, f200_nit AS nit FROM t200_mm_terceros WHERE f200_nit = '800213511';

Pregunta: últimas facturas
SQL: SELECT TOP 10 f461_rowid_docto, f461_id_fecha, f461_vlr_bruto, f461_vlr_neto FROM t461_cm_docto_factura_venta ORDER BY f461_rowid_docto DESC;

Pregunta: productos con más stock
SQL: SELECT TOP 10 i.f120_descripcion AS producto, e.f400_cant_existencia_1 AS stock FROM t400_cm_existencia e JOIN t120_mc_items i ON e.f400_rowid_item_ext = i.f120_rowid ORDER BY e.f400_cant_existencia_1 DESC;`;

    const userPrompt = `Genera la consulta SQL para: ${pregunta}`;

    const body = JSON.stringify({
      model: this.ollamaModel,
      prompt: `<|im_start|>system\n${systemPrompt}<|im_end|>\n<|im_start|>user\n${userPrompt}<|im_end|>\n<|im_start|>assistant\n`,
      stream: false,
      options: { temperature: 0.1, top_p: 0.9, num_predict: 200 },
    });

    return new Promise((resolve, reject) => {
      const req = http.request(
        { hostname: this.ollamaHost, port: this.ollamaPort, path: '/api/generate', method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed.response?.trim() ?? '');
            } catch {
              reject(new InternalServerErrorException('Error al parsear respuesta de Ollama'));
            }
          });
        },
      );
      req.on('error', (e) => reject(new InternalServerErrorException(`Ollama no disponible: ${e.message}`)));
      req.setTimeout(45000, () => { req.destroy(); reject(new InternalServerErrorException('Ollama timeout (45s) — el modelo tardó demasiado')); });
      req.write(body);
      req.end();
    });
  }

  private validarSQL(sql: string): string {
    // Limpiar markdown si el modelo lo envuelve
    let clean = sql.replace(/```sql\n?/gi, '').replace(/```\n?/gi, '').trim();

    // Solo la primera instrucción
    const firstSemicolon = clean.indexOf(';');
    if (firstSemicolon > -1) {
      clean = clean.substring(0, firstSemicolon + 1).trim();
    }

    // Solo SELECT permitido
    if (!/^\s*SELECT\b/i.test(clean)) {
      throw new BadRequestException('La IA generó una consulta no permitida. Solo se permiten consultas SELECT.');
    }

    // Bloquear palabras peligrosas
    const bloqueadas = /\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|sp_|xp_)\b/i;
    if (bloqueadas.test(clean)) {
      throw new BadRequestException('La consulta contiene operaciones no permitidas.');
    }

    // Corregir columnas inventadas frecuentes (alias → nombre real)
    const correcciones: [RegExp, string][] = [
      // El modelo a veces usa prefijo de tabla (t200_) en lugar de columna (f200_)
      [/\bt200_razon_social\b/gi, 'f200_razon_social'],
      [/\bt200_nombre_est\b/gi, 'f200_nombre_est'],
      [/\bt200_nit\b/gi, 'f200_nit'],
      [/\bt200_ind_cliente\b/gi, 'f200_ind_cliente'],
      [/\bt200_ind_proveedor\b/gi, 'f200_ind_proveedor'],
      [/\bt120_descripcion\b/gi, 'f120_descripcion'],
      [/\bt120_referencia\b/gi, 'f120_referencia'],
      [/\bt461_vlr_bruto\b/gi, 'f461_vlr_bruto'],
      [/\bt461_vlr_neto\b/gi, 'f461_vlr_neto'],
      [/\bt5461_vlr_bruto\b/gi, 'f5461_vlr_bruto'],
      // Alias semánticos → nombres reales de columnas
      [/\bf461_monto_bruto\b/gi, 'f461_vlr_bruto'],
      [/\bf461_monto_neto\b/gi, 'f461_vlr_neto'],
      [/\bf461_monto_total\b/gi, 'f461_vlr_neto'],
      [/\bf461_valor_bruto\b/gi, 'f461_vlr_bruto'],
      [/\bf461_valor_neto\b/gi, 'f461_vlr_neto'],
      [/\bf460_monto_bruto\b/gi, 'f460_vlr_bruto'],
      [/\bf460_valor_bruto\b/gi, 'f460_vlr_bruto'],
      [/\bf470_cantidad\b/gi, 'f470_cant_1'],
      [/\bf470_precio\b/gi, 'f470_precio_uni'],
      [/\bf470_costo\b/gi, 'f470_costo_prom_uni'],
      [/\bf400_existencia\b/gi, 'f400_cant_existencia_1'],
      [/\bf400_stock\b/gi, 'f400_cant_existencia_1'],
      [/\bf200_nombre\b/gi, 'f200_nombre_est'],
      [/\bf200_razon\b/gi, 'f200_razon_social'],
      [/\bf120_nombre\b/gi, 'f120_descripcion'],
      [/\bf5461_valor\b/gi, 'f5461_vlr_bruto'],
      [/\bf5461_monto\b/gi, 'f5461_vlr_bruto'],
      [/\bf350_fecha_docto\b/gi, 'f350_fecha'],
    ];
    for (const [pattern, replacement] of correcciones) {
      clean = clean.replace(pattern, replacement);
    }

    // Inyectar TOP 10 si no tiene limit/top
    if (!/\bTOP\s+\d+\b/i.test(clean)) {
      clean = clean.replace(/^\s*SELECT\b/i, 'SELECT TOP 10');
    }

    // Verificar que las tablas usadas existen en el schema real
    const tablasUsadas = [...clean.matchAll(/\bFROM\s+([\w]+)|\bJOIN\s+([\w]+)/gi)]
      .map(m => (m[1] || m[2]).toLowerCase());
    const tablasInvalidas = tablasUsadas.filter(t => !this.tablasDisponibles.map(d => d.toLowerCase()).includes(t));
    if (tablasInvalidas.length > 0) {
      throw new BadRequestException(
        `La IA usó tablas que no existen en la base de datos: ${tablasInvalidas.join(', ')}. Por favor reformula la pregunta.`
      );
    }

    return clean;
  }

  private async ejecutarSQL(sql: string): Promise<unknown[]> {
    try {
      const result = await this.dataSource.query(sql);
      return Array.isArray(result) ? result : [result];
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new BadRequestException(`Error SQL: ${msg}\n\nSQL generado:\n${sql}`);
    }
  }
}
