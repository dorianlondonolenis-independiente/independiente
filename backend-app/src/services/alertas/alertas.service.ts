import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import * as nodemailer from 'nodemailer';
import { UsersService } from '../../auth/services/users.service';
import { ConfigService } from '@nestjs/config';
import { BrandingService } from '../branding/branding.service';

export interface AlertaInventario {
  item_id: string;
  referencia: string;
  producto: string;
  bodega_id: string;
  bodega: string;
  existencia: number;
  disponible: number;
  nivel_min: number;
  nivel_max: number;
  comprometida: number;
  por_entrar: number;
  tipo: 'bajo_minimo' | 'sin_stock' | 'sobre_maximo';
  severidad: 'critica' | 'alta' | 'media';
  costo_unitario: number;
  valor_riesgo: number;
}

export interface AlertaVentaVsStock {
  item_id: string;
  referencia: string;
  producto: string;
  bodega_id: string;
  bodega: string;
  stock_disponible: number;
  demanda_pedidos: number;
  deficit: number;
  pedidos_afectados: number;
  valor_en_riesgo: number;
}

export interface TendenciaVentas {
  item_id: string;
  referencia: string;
  producto: string;
  ventas_mes_actual: number;
  ventas_mes_anterior: number;
  ventas_hace_2_meses: number;
  promedio_3m: number;
  stock_actual: number;
  cobertura_dias: number; // días de stock según promedio
  tendencia: 'creciente' | 'estable' | 'decreciente';
  alerta: boolean;
}

@Injectable()
export class AlertasService implements OnModuleInit {
  private readonly logger = new Logger(AlertasService.name);
  private transporter: nodemailer.Transporter | null = null;

  /**
   * Estado en memoria de las alertas conocidas.
   * Clave: "item_id|bodega_id"  Valor: tipo de alerta
   * Se inicializa al arrancar (sin enviar email) y se compara en cada ciclo.
   */
  private estadoConocido = new Map<string, string>();
  private inicializado = false;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
    private readonly brandingService: BrandingService,
  ) {
    this.initMailer();
  }

  /** Al arrancar: carga el estado actual sin enviar emails (línea base) */
  async onModuleInit() {
    try {
      const alertas = await this.getAlertasInventario();
      this.actualizarEstado(alertas);
      this.inicializado = true;
      this.logger.log(`Estado inicial cargado: ${alertas.length} alertas conocidas (sin notificar)`);
    } catch (e: any) {
      // SQL Server puede no estar disponible al arrancar — se reintentará en el primer cron
      this.logger.warn('Estado inicial no cargado (BD no disponible): ' + e.message);
    }
  }

  private initMailer() {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT') || 587;
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      this.logger.warn('SMTP no configurado — emails deshabilitados. Configure SMTP_HOST, SMTP_USER, SMTP_PASS en .env');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. ALERTAS DE INVENTARIO: productos bajo mínimo / sin stock / sobre máximo
  // ─────────────────────────────────────────────────────────────────────────
  async getAlertasInventario(bodega?: string): Promise<AlertaInventario[]> {
    let whereExtra = '';
    const params: any[] = [];

    if (bodega) {
      whereExtra = ' AND b.f150_id = @0';
      params.push(bodega);
    }

    const rows = await this.dataSource.query(`
      SELECT
        i.f120_id                                                        AS item_id,
        i.f120_referencia                                                AS referencia,
        i.f120_descripcion                                               AS producto,
        b.f150_id                                                        AS bodega_id,
        b.f150_descripcion                                               AS bodega,
        e.f400_cant_existencia_1                                         AS existencia,
        (e.f400_cant_existencia_1 - e.f400_cant_comprometida_1
         - e.f400_cant_pendiente_salir_1)                               AS disponible,
        e.f400_cant_comprometida_1                                       AS comprometida,
        e.f400_cant_pendiente_entrar_1                                   AS por_entrar,
        e.f400_cant_nivel_min_1                                          AS nivel_min,
        e.f400_cant_nivel_max_1                                          AS nivel_max,
        e.f400_costo_prom_uni                                            AS costo_unitario
      FROM t400_cm_existencia e
      JOIN t121_mc_items_extensiones ext ON e.f400_rowid_item_ext = ext.f121_rowid
      JOIN t120_mc_items i               ON ext.f121_rowid_item   = i.f120_rowid
      JOIN t150_mc_bodegas b             ON e.f400_rowid_bodega    = b.f150_rowid
      WHERE (
        (e.f400_cant_existencia_1 <= 0)
        OR (e.f400_cant_existencia_1 > 0 AND e.f400_cant_nivel_min_1 > 0
            AND e.f400_cant_existencia_1 < e.f400_cant_nivel_min_1)
        OR (e.f400_cant_nivel_max_1 > 0
            AND e.f400_cant_existencia_1 > e.f400_cant_nivel_max_1)
      )
      ${whereExtra}
      ORDER BY
        CASE WHEN e.f400_cant_existencia_1 <= 0 THEN 0
             WHEN e.f400_cant_existencia_1 < e.f400_cant_nivel_min_1 THEN 1
             ELSE 2 END,
        (e.f400_costo_prom_uni * e.f400_cant_existencia_1) DESC
    `, params);

    return rows.map((r: any): AlertaInventario => {
      const existencia = Number(r.existencia) || 0;
      const nivelMin   = Number(r.nivel_min)  || 0;
      const nivelMax   = Number(r.nivel_max)  || 0;
      const disponible = Number(r.disponible) || 0;
      const costo      = Number(r.costo_unitario) || 0;

      let tipo: AlertaInventario['tipo'];
      let severidad: AlertaInventario['severidad'];

      if (existencia <= 0) {
        tipo = 'sin_stock'; severidad = 'critica';
      } else if (nivelMin > 0 && existencia < nivelMin) {
        tipo = 'bajo_minimo';
        severidad = existencia < nivelMin * 0.5 ? 'critica' : 'alta';
      } else {
        tipo = 'sobre_maximo'; severidad = 'media';
      }

      return {
        item_id:      r.item_id,
        referencia:   r.referencia,
        producto:     r.producto,
        bodega_id:    r.bodega_id,
        bodega:       r.bodega,
        existencia,
        disponible,
        nivel_min:    nivelMin,
        nivel_max:    nivelMax,
        comprometida: Number(r.comprometida) || 0,
        por_entrar:   Number(r.por_entrar) || 0,
        tipo,
        severidad,
        costo_unitario: costo,
        valor_riesgo: tipo === 'sobre_maximo'
          ? (existencia - nivelMax) * costo
          : (nivelMin - existencia) * costo,
      };
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. CRUCE VENTAS PENDIENTES vs STOCK DISPONIBLE
  // ─────────────────────────────────────────────────────────────────────────
  async getAlertasVentaVsStock(): Promise<AlertaVentaVsStock[]> {
    // Pedidos pendientes de facturar con demanda por ítem
    const rows = await this.dataSource.query(`
      SELECT
        i.f120_id                                              AS item_id,
        i.f120_referencia                                      AS referencia,
        i.f120_descripcion                                     AS producto,
        b.f150_id                                              AS bodega_id,
        b.f150_descripcion                                     AS bodega,
        ISNULL(SUM(m.f431_cant1_pedida), 0)                    AS demanda_pedidos,
        COUNT(DISTINCT d.f430_rowid)                           AS pedidos_afectados,
        ISNULL(AVG(m.f431_vlr_bruto / NULLIF(m.f431_cant1_pedida, 0)), 0) AS precio_promedio,
        ISNULL(e.f400_cant_existencia_1 - e.f400_cant_comprometida_1
               - e.f400_cant_pendiente_salir_1, 0)            AS stock_disponible
      FROM t431_cm_pv_movto m
      JOIN t430_cm_pv_docto d        ON m.f431_rowid_pv_docto  = d.f430_rowid
      JOIN t121_mc_items_extensiones ext ON m.f431_rowid_item_ext = ext.f121_rowid
      JOIN t120_mc_items i           ON ext.f121_rowid_item    = i.f120_rowid
      LEFT JOIN t400_cm_existencia e ON e.f400_rowid_item_ext  = ext.f121_rowid
      LEFT JOIN t150_mc_bodegas b    ON e.f400_rowid_bodega    = b.f150_rowid
      WHERE d.f430_ind_estado IN (1, 2)          -- pedidos activos/en proceso
        AND m.f431_cant1_pedida > 0
      GROUP BY
        i.f120_id, i.f120_referencia, i.f120_descripcion,
        b.f150_id, b.f150_descripcion,
        e.f400_cant_existencia_1, e.f400_cant_comprometida_1, e.f400_cant_pendiente_salir_1
      HAVING ISNULL(SUM(m.f431_cant1_pedida), 0) >
             ISNULL(e.f400_cant_existencia_1, 0) - ISNULL(e.f400_cant_comprometida_1, 0)
             - ISNULL(e.f400_cant_pendiente_salir_1, 0)
      ORDER BY (ISNULL(SUM(m.f431_cant1_pedida), 0)
               - ISNULL(e.f400_cant_existencia_1, 0) + ISNULL(e.f400_cant_comprometida_1, 0)
               + ISNULL(e.f400_cant_pendiente_salir_1, 0)) DESC
    `);

    return rows.map((r: any): AlertaVentaVsStock => {
      const demanda   = Number(r.demanda_pedidos)  || 0;
      const stock     = Number(r.stock_disponible) || 0;
      const deficit   = demanda - stock;
      const precio    = Number(r.precio_promedio)  || 0;

      return {
        item_id:          r.item_id,
        referencia:       r.referencia,
        producto:         r.producto,
        bodega_id:        r.bodega_id || '',
        bodega:           r.bodega || 'N/A',
        stock_disponible: stock,
        demanda_pedidos:  demanda,
        deficit:          Math.max(0, deficit),
        pedidos_afectados: Number(r.pedidos_afectados) || 0,
        valor_en_riesgo:  Math.max(0, deficit) * precio,
      };
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. TENDENCIAS DE VENTAS + PROYECCIÓN DE COBERTURA
  // ─────────────────────────────────────────────────────────────────────────
  async getTendenciasVentas(soloAlertas = false): Promise<TendenciaVentas[]> {
    const rows = await this.dataSource.query(`
      SELECT
        i.f120_id                              AS item_id,
        i.f120_referencia                      AS referencia,
        i.f120_descripcion                     AS producto,
        ISNULL(SUM(CASE
          WHEN MONTH(m.f431_fecha_cumplido) = MONTH(GETDATE())
           AND YEAR(m.f431_fecha_cumplido)  = YEAR(GETDATE())
          THEN m.f431_cant1_facturada ELSE 0 END), 0) AS ventas_mes_actual,
        ISNULL(SUM(CASE
          WHEN m.f431_fecha_cumplido >= DATEADD(MONTH, -1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
           AND m.f431_fecha_cumplido <  DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
          THEN m.f431_cant1_facturada ELSE 0 END), 0) AS ventas_mes_anterior,
        ISNULL(SUM(CASE
          WHEN m.f431_fecha_cumplido >= DATEADD(MONTH, -2, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
           AND m.f431_fecha_cumplido <  DATEADD(MONTH, -1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
          THEN m.f431_cant1_facturada ELSE 0 END), 0) AS ventas_hace_2_meses,
        ISNULL(AVG(e.f400_cant_existencia_1), 0) AS stock_actual
      FROM t431_cm_pv_movto m
      JOIN t121_mc_items_extensiones ext  ON m.f431_rowid_item_ext = ext.f121_rowid
      JOIN t120_mc_items i                ON ext.f121_rowid_item   = i.f120_rowid
      LEFT JOIN t400_cm_existencia e      ON e.f400_rowid_item_ext = ext.f121_rowid
      WHERE m.f431_cant1_facturada > 0
        AND m.f431_fecha_cumplido >= DATEADD(MONTH, -3, GETDATE())
      GROUP BY i.f120_id, i.f120_referencia, i.f120_descripcion
      HAVING ISNULL(SUM(CASE
          WHEN MONTH(m.f431_fecha_cumplido) = MONTH(GETDATE())
           AND YEAR(m.f431_fecha_cumplido)  = YEAR(GETDATE())
          THEN m.f431_cant1_facturada ELSE 0 END), 0) > 0
          OR ISNULL(SUM(CASE
          WHEN m.f431_fecha_cumplido >= DATEADD(MONTH, -1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
           AND m.f431_fecha_cumplido <  DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
          THEN m.f431_cant1_facturada ELSE 0 END), 0) > 0
      ORDER BY ISNULL(AVG(e.f400_cant_existencia_1), 0) ASC
    `);

    const result: TendenciaVentas[] = rows.map((r: any): TendenciaVentas => {
      const m0 = Number(r.ventas_mes_actual)    || 0;
      const m1 = Number(r.ventas_mes_anterior)  || 0;
      const m2 = Number(r.ventas_hace_2_meses)  || 0;
      const promedio = (m0 + m1 + m2) / 3;
      const stock    = Number(r.stock_actual)   || 0;

      // Días de cobertura según promedio mensual (30 días/mes)
      const cobertura = promedio > 0 ? Math.round((stock / promedio) * 30) : 999;

      let tendencia: TendenciaVentas['tendencia'];
      if (m0 > m1 * 1.1) tendencia = 'creciente';
      else if (m0 < m1 * 0.9) tendencia = 'decreciente';
      else tendencia = 'estable';

      // Alerta: cobertura < 30 días O tendencia creciente con poco stock
      const alerta = cobertura < 30 || (tendencia === 'creciente' && cobertura < 60);

      return {
        item_id:             r.item_id,
        referencia:          r.referencia,
        producto:            r.producto,
        ventas_mes_actual:   m0,
        ventas_mes_anterior: m1,
        ventas_hace_2_meses: m2,
        promedio_3m:         Math.round(promedio * 10) / 10,
        stock_actual:        stock,
        cobertura_dias:      cobertura,
        tendencia,
        alerta,
      };
    });

    return soloAlertas ? result.filter(t => t.alerta) : result;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RESUMEN EJECUTIVO (para Dashboard widget)
  // ─────────────────────────────────────────────────────────────────────────
  async getResumenAlertas(): Promise<{
    sin_stock: number;
    bajo_minimo: number;
    sobre_maximo: number;
    deficit_ventas: number;
    productos_cobertura_critica: number;
    valor_riesgo_total: number;
  }> {
    const [inv, ventas, tendencias] = await Promise.all([
      this.getAlertasInventario(),
      this.getAlertasVentaVsStock(),
      this.getTendenciasVentas(true),
    ]);

    return {
      sin_stock:                  inv.filter(a => a.tipo === 'sin_stock').length,
      bajo_minimo:                inv.filter(a => a.tipo === 'bajo_minimo').length,
      sobre_maximo:               inv.filter(a => a.tipo === 'sobre_maximo').length,
      deficit_ventas:             ventas.length,
      productos_cobertura_critica: tendencias.filter(t => t.cobertura_dias < 15).length,
      valor_riesgo_total:         ventas.reduce((s, v) => s + v.valor_en_riesgo, 0),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CRON cada 10 min: detecta NUEVAS alertas y notifica al instante
  // ─────────────────────────────────────────────────────────────────────────
  @Cron('*/10 * * * *')
  async verificarCambiosInventario() {
    if (!this.inicializado) {
      // Primer ciclo después de un fallo en onModuleInit — cargar línea base
      try {
        const alertas = await this.getAlertasInventario();
        this.actualizarEstado(alertas);
        this.inicializado = true;
        this.logger.log(`Línea base tardía cargada: ${alertas.length} alertas`);
      } catch { /* reintentará en el siguiente ciclo */ }
      return;
    }

    let alertasActuales: AlertaInventario[];
    try {
      alertasActuales = await this.getAlertasInventario();
    } catch (e: any) {
      this.logger.error('Error al consultar inventario en cron:', e.message);
      return;
    }

    // Detectar alertas NUEVAS o cuyo tipo cambió (p.ej. pasó de bajo_minimo a sin_stock)
    const nuevasAlertas = alertasActuales.filter(a => {
      const clave = `${a.item_id}|${a.bodega_id}`;
      const tipoAnterior = this.estadoConocido.get(clave);
      return tipoAnterior === undefined || tipoAnterior !== a.tipo;
    });

    // Actualizar estado con la foto actual
    this.actualizarEstado(alertasActuales);

    if (nuevasAlertas.length === 0) return;

    this.logger.log(`🔔 ${nuevasAlertas.length} alertas NUEVAS detectadas`);
    await this.enviarEmailNuevasAlertas(nuevasAlertas);
  }

  /** Reemplaza el mapa de estado con la lista actual de alertas */
  private actualizarEstado(alertas: AlertaInventario[]) {
    this.estadoConocido.clear();
    for (const a of alertas) {
      this.estadoConocido.set(`${a.item_id}|${a.bodega_id}`, a.tipo);
    }
  }

  /** Email enfocado solo en las alertas que acaban de producirse */
  private async enviarEmailNuevasAlertas(nuevas: AlertaInventario[]) {
    if (!this.transporter) return;

    const usuarios = await this.usersService.findAll();
    const destinatarios = usuarios
      .filter(u => u.activo)
      .map(u => u.email)
      .filter(e => e && e.includes('@'));

    if (destinatarios.length === 0) return;

    const branding = this.brandingService.getBranding();
    const fmt = (n: number) => n?.toLocaleString('es-CO') ?? '0';
    const fmtCOP = (n: number) => `$${fmt(Math.round(n))}`;
    const hora = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    const fecha = new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const criticas = nuevas.filter(a => a.severidad === 'critica');
    const asunto = criticas.length > 0
      ? `🔴 ALERTA CRÍTICA — ${criticas.length} productos sin stock o agotándose`
      : `🟠 Nueva alerta de inventario — ${nuevas.length} producto(s) afectado(s)`;

    const filas = nuevas.map(a => `
      <tr style="background:${a.severidad === 'critica' ? '#fff5f5' : '#fffdf0'}">
        <td style="padding:7px 10px;border-bottom:1px solid #eee"><code>${a.referencia}</code></td>
        <td style="padding:7px 10px;border-bottom:1px solid #eee">${a.producto}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #eee">${a.bodega}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:center">
          <span style="background:${{ sin_stock:'#dc3545', bajo_minimo:'#fd7e14', sobre_maximo:'#0d6efd' }[a.tipo]};color:#fff;padding:2px 8px;border-radius:10px;font-size:12px">
            ${{ sin_stock:'Sin Stock', bajo_minimo:'Bajo Mínimo', sobre_maximo:'Sobre Máximo' }[a.tipo]}
          </span>
        </td>
        <td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:right">${fmt(a.existencia)}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:right">${fmt(a.nivel_min)}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:right">${fmtCOP(a.valor_riesgo)}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:0">
<div style="max-width:720px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
  <div style="background:linear-gradient(135deg,#b71c1c,#c62828);padding:20px 28px;color:#fff">
    <h1 style="margin:0;font-size:18px">🔔 Alerta de Inventario en Tiempo Real</h1>
    <p style="margin:4px 0 0;opacity:.85;font-size:12px">${fecha} — detectado a las ${hora}</p>
  </div>
  <div style="padding:16px 28px;background:#fff3cd;border-bottom:1px solid #ffc107">
    <p style="margin:0;font-size:14px;color:#856404">
      Se detectaron <strong>${nuevas.length} novedad(es) de inventario</strong> que requieren atención inmediata.
      ${criticas.length > 0 ? `<br><strong>${criticas.length} son críticas.</strong>` : ''}
    </p>
  </div>
  <div style="padding:20px 28px">
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="background:#f8f9fa">
        <th style="padding:8px 10px;text-align:left">Referencia</th>
        <th style="padding:8px 10px;text-align:left">Producto</th>
        <th style="padding:8px 10px;text-align:left">Bodega</th>
        <th style="padding:8px 10px;text-align:center">Tipo</th>
        <th style="padding:8px 10px;text-align:right">Stock</th>
        <th style="padding:8px 10px;text-align:right">Mínimo</th>
        <th style="padding:8px 10px;text-align:right">Valor Riesgo</th>
      </tr></thead>
      <tbody>${filas}</tbody>
    </table>
  </div>
  <div style="padding:14px 28px;background:#f8f9fa;border-top:1px solid #eee;font-size:12px;color:#999;text-align:center">
    Generado automáticamente por ${branding.emailFooterText}
  </div>
</div>
</body></html>`;

    try {
      await this.transporter.sendMail({
        from: `"${branding.emailSenderName}" <${this.config.get('SMTP_USER')}>`,
        to: destinatarios.join(', '),
        subject: asunto,
        html,
      });
      this.logger.log(`Email de alerta en tiempo real enviado a ${destinatarios.length} usuario(s)`);
    } catch (err: any) {
      this.logger.error('Error enviando email de nueva alerta:', err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CRON: reporte completo diario a las 7:00 AM
  // ─────────────────────────────────────────────────────────────────────────
  @Cron('0 7 * * 1-5') // Lunes a viernes a las 7:00
  async enviarEmailAlertasDiarias() {
    this.logger.log('Ejecutando cron de alertas diarias...');
    await this.enviarEmailAlertas();
  }

  /**
   * Enviar email de alertas manualmente (también llamable desde endpoint)
   */
  /**
   * Envía un email de prueba con datos reales de inventario.
   */
  async enviarEmailPrueba(destinatario?: string): Promise<{ enviado: boolean; destinatario: string; mensaje: string }> {
    if (!this.transporter) {
      return { enviado: false, destinatario: '', mensaje: 'SMTP no configurado. Verifique SMTP_HOST, SMTP_USER, SMTP_PASS en .env' };
    }

    const smtpUser = this.config.get<string>('SMTP_USER') ?? '';
    const dest = (destinatario && destinatario.includes('@')) ? destinatario : smtpUser;
    const branding = this.brandingService.getBranding();

    if (!dest) {
      return { enviado: false, destinatario: '', mensaje: 'No se especificó destinatario y SMTP_USER no está configurado' };
    }

    // Obtener datos reales: hasta 5 alertas críticas (sin stock o bajo mínimo)
    const alertasInv = await this.getAlertasInventario();
    const criticas = alertasInv
      .filter(a => a.tipo === 'sin_stock' || a.tipo === 'bajo_minimo')
      .slice(0, 5);

    const fmt = (n: number) => (n ?? 0).toLocaleString('es-CO');
    const fmtCOP = (n: number) => `$${Math.round(n ?? 0).toLocaleString('es-CO')}`;

    const badgeTipo = (tipo: string) => tipo === 'sin_stock'
      ? `<span style="background:#dc3545;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px">SIN STOCK</span>`
      : `<span style="background:#fd7e14;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px">BAJO MÍNIMO</span>`;

    const filasProductos = criticas.map(a => `
      <tr style="border-bottom:1px solid #eee">
        <td style="padding:10px 8px"><code style="background:#f1f3f5;padding:2px 6px;border-radius:4px">${a.referencia?.trim()}</code></td>
        <td style="padding:10px 8px;max-width:180px">${a.producto}</td>
        <td style="padding:10px 8px">${a.bodega}</td>
        <td style="padding:10px 8px;text-align:center">${badgeTipo(a.tipo)}</td>
        <td style="padding:10px 8px;text-align:right;font-weight:bold;color:${a.existencia <= 0 ? '#dc3545' : '#fd7e14'}">${fmt(a.existencia)}</td>
        <td style="padding:10px 8px;text-align:right">${fmt(a.nivel_min)}</td>
        <td style="padding:10px 8px;text-align:right">${fmt(a.nivel_max)}</td>
        <td style="padding:10px 8px;text-align:right;color:#6c757d">${fmtCOP(a.costo_unitario ?? 0)}</td>
      </tr>`).join('');

    const resumen = await this.getResumenAlertas();
    const ahora = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const html = `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:0">
<div style="max-width:750px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1a237e,#0d47a1);padding:24px 28px;color:#fff">
    <h1 style="margin:0;font-size:20px">⚠️ Alertas de Inventario</h1>
    <p style="margin:4px 0 0;opacity:.8;font-size:13px">${ahora}</p>
  </div>

  <!-- KPIs -->
  <div style="display:flex;gap:0;border-bottom:1px solid #eee">
    <div style="flex:1;padding:16px;text-align:center;border-right:1px solid #eee">
      <div style="font-size:32px;font-weight:bold;color:#dc3545">${resumen.sin_stock}</div>
      <div style="font-size:12px;color:#666;margin-top:4px">Sin Stock</div>
    </div>
    <div style="flex:1;padding:16px;text-align:center;border-right:1px solid #eee">
      <div style="font-size:32px;font-weight:bold;color:#fd7e14">${resumen.bajo_minimo}</div>
      <div style="font-size:12px;color:#666;margin-top:4px">Bajo Mínimo</div>
    </div>
    <div style="flex:1;padding:16px;text-align:center;border-right:1px solid #eee">
      <div style="font-size:32px;font-weight:bold;color:#0d6efd">${resumen.sobre_maximo}</div>
      <div style="font-size:12px;color:#666;margin-top:4px">Sobre Máximo</div>
    </div>
    <div style="flex:1;padding:16px;text-align:center">
      <div style="font-size:32px;font-weight:bold;color:#6c757d">${resumen.sin_stock + resumen.bajo_minimo + resumen.sobre_maximo}</div>
      <div style="font-size:12px;color:#666;margin-top:4px">Total Alertas</div>
    </div>
  </div>

  <!-- Tabla productos -->
  <div style="padding:20px 28px">
    <h2 style="font-size:15px;color:#1a237e;margin:0 0 12px">Productos críticos${criticas.length < alertasInv.filter(a=>a.tipo==='sin_stock'||a.tipo==='bajo_minimo').length ? ` (mostrando ${criticas.length} de ${alertasInv.filter(a=>a.tipo==='sin_stock'||a.tipo==='bajo_minimo').length})` : ''}</h2>
    ${criticas.length === 0 ? '<p style="color:#6c757d;font-style:italic">No hay productos críticos en este momento.</p>' : `
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:#f1f3f5;color:#495057">
          <th style="padding:8px;text-align:left">Referencia</th>
          <th style="padding:8px;text-align:left">Producto</th>
          <th style="padding:8px;text-align:left">Bodega</th>
          <th style="padding:8px;text-align:center">Estado</th>
          <th style="padding:8px;text-align:right">Stock</th>
          <th style="padding:8px;text-align:right">Mín</th>
          <th style="padding:8px;text-align:right">Máx</th>
          <th style="padding:8px;text-align:right">Costo Unit.</th>
        </tr>
      </thead>
      <tbody>${filasProductos}</tbody>
    </table>`}
  </div>

  <!-- Footer -->
  <div style="padding:14px 28px;background:#f8f9fa;border-top:1px solid #eee;font-size:12px;color:#999;text-align:center">
    Alertas Inventario · Email de prueba · ${branding.emailFooterText}
  </div>
</div>
</body></html>`;

    try {
      await this.transporter.sendMail({
        from: `"${branding.emailSenderName}" <${smtpUser}>`,
        to: dest,
        subject: `⚠️ [PRUEBA] ${branding.emailSenderName} — ${resumen.sin_stock} sin stock, ${resumen.bajo_minimo} bajo mínimo`,
        html,
      });
      this.logger.log(`Email de prueba con datos reales enviado a ${dest}`);
      return { enviado: true, destinatario: dest, mensaje: `Email enviado a ${dest} con ${criticas.length} productos de muestra` };
    } catch (err: any) {
      this.logger.error('Error enviando email de prueba:', err.message);
      return { enviado: false, destinatario: dest, mensaje: `Error SMTP: ${err.message}` };
    }
  }

  async enviarEmailAlertas(): Promise<{ enviados: number; destinatarios: string[] }> {
    if (!this.transporter) {
      this.logger.warn('No se pueden enviar emails: SMTP no configurado');
      return { enviados: 0, destinatarios: [] };
    }

    const [alertasInv, alertasVentas, resumen] = await Promise.all([
      this.getAlertasInventario(),
      this.getAlertasVentaVsStock(),
      this.getResumenAlertas(),
    ]);

    const criticas     = alertasInv.filter(a => a.severidad === 'critica');
    const sinStock     = alertasInv.filter(a => a.tipo === 'sin_stock');
    const bajoMinimo   = alertasInv.filter(a => a.tipo === 'bajo_minimo');
    const sobreMaximo  = alertasInv.filter(a => a.tipo === 'sobre_maximo');

    if (criticas.length === 0 && alertasVentas.length === 0) {
      this.logger.log('Sin alertas críticas — email omitido');
      return { enviados: 0, destinatarios: [] };
    }

    // Obtener todos los usuarios activos con email
    const usuarios = await this.usersService.findAll();
    const destinatarios = usuarios
      .filter(u => u.activo)
      .map(u => u.email)
      .filter(e => e && e.includes('@'));

    if (destinatarios.length === 0) {
      this.logger.warn('Sin destinatarios con email válido');
      return { enviados: 0, destinatarios: [] };
    }

    const html = this.buildEmailHtml(sinStock, bajoMinimo, sobreMaximo, alertasVentas, resumen);
    const branding = this.brandingService.getBranding();

    try {
      await this.transporter.sendMail({
        from: `"${branding.emailSenderName}" <${this.config.get('SMTP_USER')}>`,
        to: destinatarios.join(', '),
        subject: `⚠️ Alertas de Inventario — ${sinStock.length} sin stock, ${bajoMinimo.length} bajo mínimo`,
        html,
      });
      this.logger.log(`Email de alertas enviado a ${destinatarios.length} usuarios`);
      return { enviados: destinatarios.length, destinatarios };
    } catch (err: any) {
      this.logger.error('Error enviando email de alertas:', err.message);
      return { enviados: 0, destinatarios: [] };
    }
  }

  private buildEmailHtml(
    sinStock: AlertaInventario[],
    bajoMinimo: AlertaInventario[],
    sobreMaximo: AlertaInventario[],
    deficitVentas: AlertaVentaVsStock[],
    resumen: ReturnType<typeof Object.create>,
  ): string {
    const fmt = (n: number) => n?.toLocaleString('es-CO') ?? '0';
    const fmtCOP = (n: number) => `$${fmt(Math.round(n))}`;
    const branding = this.brandingService.getBranding();

    const filaInv
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee"><code>${a.referencia}</code></td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${a.producto}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${a.bodega}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${fmt(a.existencia)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${fmt(a.nivel_min)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${fmtCOP(a.valor_riesgo)}</td>
      </tr>`;

    const filaVenta = (v: AlertaVentaVsStock) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee"><code>${v.referencia}</code></td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${v.producto}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${fmt(v.stock_disponible)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${fmt(v.demanda_pedidos)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;color:#dc3545;font-weight:bold">${fmt(v.deficit)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${fmtCOP(v.valor_en_riesgo)}</td>
      </tr>`;

    return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:0">
<div style="max-width:700px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
  <div style="background:linear-gradient(135deg,${branding.emailHeaderColor},${branding.secondaryColor});padding:24px 28px;color:#fff">
    <h1 style="margin:0;font-size:20px">⚠️ Reporte de Alertas de Inventario</h1>
    <p style="margin:4px 0 0;opacity:.8;font-size:13px">${new Date().toLocaleDateString('es-CO', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
  </div>

  <!-- Resumen -->
  <div style="padding:20px 28px;background:#fff3cd;border-bottom:1px solid #ffc107">
    <h2 style="margin:0 0 12px;font-size:15px;color:#856404">Resumen Ejecutivo</h2>
    <table style="width:100%;border-collapse:collapse">
      <tr>
        <td style="padding:8px;text-align:center;background:#dc354510;border-radius:6px;margin:4px">
          <div style="font-size:28px;font-weight:bold;color:#dc3545">${resumen.sin_stock}</div>
          <div style="font-size:12px;color:#666">Sin Stock</div>
        </td>
        <td style="padding:8px;text-align:center;background:#fd7e1410;border-radius:6px">
          <div style="font-size:28px;font-weight:bold;color:#fd7e14">${resumen.bajo_minimo}</div>
          <div style="font-size:12px;color:#666">Bajo Mínimo</div>
        </td>
        <td style="padding:8px;text-align:center;background:#0d6efd10;border-radius:6px">
          <div style="font-size:28px;font-weight:bold;color:#0d6efd">${resumen.deficit_ventas}</div>
          <div style="font-size:12px;color:#666">Déficit vs Pedidos</div>
        </td>
        <td style="padding:8px;text-align:center;background:#19875410;border-radius:6px">
          <div style="font-size:22px;font-weight:bold;color:#198754">${fmtCOP(resumen.valor_riesgo_total)}</div>
          <div style="font-size:12px;color:#666">Valor en Riesgo</div>
        </td>
      </tr>
    </table>
  </div>

  <div style="padding:20px 28px">
    ${sinStock.length > 0 ? `
    <h2 style="color:#dc3545;font-size:15px;margin:0 0 8px">🔴 Sin Stock (${sinStock.length})</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
      <thead><tr style="background:#f8f9fa">
        <th style="padding:8px;text-align:left">Referencia</th>
        <th style="padding:8px;text-align:left">Producto</th>
        <th style="padding:8px;text-align:left">Bodega</th>
        <th style="padding:8px;text-align:right">Stock</th>
        <th style="padding:8px;text-align:right">Mínimo</th>
        <th style="padding:8px;text-align:right">Valor Riesgo</th>
      </tr></thead>
      <tbody>${sinStock.slice(0, 15).map(filaInv).join('')}</tbody>
    </table>` : ''}

    ${bajoMinimo.length > 0 ? `
    <h2 style="color:#fd7e14;font-size:15px;margin:0 0 8px">🟠 Bajo Mínimo (${bajoMinimo.length})</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
      <thead><tr style="background:#f8f9fa">
        <th style="padding:8px;text-align:left">Referencia</th>
        <th style="padding:8px;text-align:left">Producto</th>
        <th style="padding:8px;text-align:left">Bodega</th>
        <th style="padding:8px;text-align:right">Stock</th>
        <th style="padding:8px;text-align:right">Mínimo</th>
        <th style="padding:8px;text-align:right">Valor Riesgo</th>
      </tr></thead>
      <tbody>${bajoMinimo.slice(0, 15).map(filaInv).join('')}</tbody>
    </table>` : ''}

    ${deficitVentas.length > 0 ? `
    <h2 style="color:#6f42c1;font-size:15px;margin:0 0 8px">🟣 Déficit vs Pedidos Activos (${deficitVentas.length})</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
      <thead><tr style="background:#f8f9fa">
        <th style="padding:8px;text-align:left">Referencia</th>
        <th style="padding:8px;text-align:left">Producto</th>
        <th style="padding:8px;text-align:right">Stock Disp.</th>
        <th style="padding:8px;text-align:right">Demanda</th>
        <th style="padding:8px;text-align:right">Déficit</th>
        <th style="padding:8px;text-align:right">Valor en Riesgo</th>
      </tr></thead>
      <tbody>${deficitVentas.slice(0, 15).map(filaVenta).join('')}</tbody>
    </table>` : ''}
  </div>

  <div style="padding:16px 28px;background:#f8f9fa;border-top:1px solid #eee;font-size:12px;color:#999;text-align:center">
    Generado automáticamente por ${branding.emailFooterText}
  </div>
</div>
</body></html>`;
  }
}
