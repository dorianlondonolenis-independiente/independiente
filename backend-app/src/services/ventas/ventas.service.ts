import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class VentasService {
  constructor(private dataSource: DataSource) {}

  async getVentasStats(): Promise<any> {
    const pedidos = await this.dataSource.query(`
      SELECT
        COUNT(*) as total_pedidos,
        COUNT(DISTINCT d.f430_rowid_tercero_fact) as clientes_unicos
      FROM t430_cm_pv_docto d
    `);
    const valorPedidos = await this.dataSource.query(`
      SELECT ISNULL(SUM(m.f431_vlr_neto), 0) as valor_pedidos
      FROM t431_cm_pv_movto m
    `);
    const facturas = await this.dataSource.query(`
      SELECT
        COUNT(*) as total_facturas,
        ISNULL(SUM(f.f461_vlr_neto), 0) as valor_facturas
      FROM t461_cm_docto_factura_venta f
    `);
    return {
      total_pedidos: pedidos[0]?.total_pedidos || 0,
      clientes_unicos: pedidos[0]?.clientes_unicos || 0,
      valor_pedidos: valorPedidos[0]?.valor_pedidos || 0,
      total_facturas: facturas[0]?.total_facturas || 0,
      valor_facturas: facturas[0]?.valor_facturas || 0,
    };
  }

  async getPedidos(filters?: {
    buscar?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;

    let where = 'WHERE 1=1';
    const params: any[] = [];
    let paramIdx = 0;

    if (filters?.buscar) {
      where += ` AND (t.f200_razon_social LIKE @${paramIdx} OR CAST(d.f430_consec_docto AS VARCHAR) LIKE @${paramIdx} OR t.f200_nit LIKE @${paramIdx})`;
      params.push(`%${filters.buscar}%`);
      paramIdx++;
    }

    if (filters?.fechaDesde) {
      where += ` AND d.f430_id_fecha >= @${paramIdx}`;
      params.push(filters.fechaDesde);
      paramIdx++;
    }

    if (filters?.fechaHasta) {
      where += ` AND d.f430_id_fecha <= @${paramIdx}`;
      params.push(filters.fechaHasta);
      paramIdx++;
    }

    const countResult = await this.dataSource.query(`
      SELECT COUNT(*) as total
      FROM t430_cm_pv_docto d
      LEFT JOIN t200_mm_terceros t ON d.f430_rowid_tercero_fact = t.f200_rowid
      ${where}
    `, params);

    const datos = await this.dataSource.query(`
      SELECT
        d.f430_rowid as rowid,
        d.f430_id_tipo_docto as tipo_docto,
        d.f430_consec_docto as consecutivo,
        d.f430_id_fecha as fecha,
        t.f200_razon_social as cliente,
        t.f200_nit as nit_cliente,
        d.f430_ind_estado as estado,
        d.f430_notas as notas,
        d.f430_id_sucursal_fact as sucursal,
        d.f430_id_motivo_otros as motivo,
        mot.f1461_descripcion as motivo_descripcion,
        ISNULL(totales.vlr_bruto, 0) as valor_bruto,
        ISNULL(totales.vlr_neto, 0) as valor_neto
      FROM t430_cm_pv_docto d
      LEFT JOIN t200_mm_terceros t ON d.f430_rowid_tercero_fact = t.f200_rowid
      LEFT JOIN t1461_mc_motivos_otros mot ON mot.f1461_id = d.f430_id_motivo_otros AND mot.f1461_id_cia = 1
      LEFT JOIN (
        SELECT f431_rowid_pv_docto, SUM(f431_vlr_bruto) as vlr_bruto, SUM(f431_vlr_neto) as vlr_neto
        FROM t431_cm_pv_movto GROUP BY f431_rowid_pv_docto
      ) totales ON totales.f431_rowid_pv_docto = d.f430_rowid
      ${where}
      ORDER BY d.f430_id_fecha DESC, d.f430_consec_docto DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `, params);

    return { total: countResult[0]?.total || 0, datos, limit, offset };
  }

  async getPedidoDetalle(rowid: number): Promise<any> {
    const header = await this.dataSource.query(`
      SELECT
        d.f430_rowid as rowid, d.f430_id_tipo_docto as tipo_docto,
        d.f430_consec_docto as consecutivo, d.f430_id_fecha as fecha,
        d.f430_notas as notas, d.f430_ind_estado as estado,
        t.f200_razon_social as cliente, t.f200_nit as nit
      FROM t430_cm_pv_docto d
      LEFT JOIN t200_mm_terceros t ON d.f430_rowid_tercero_fact = t.f200_rowid
      WHERE d.f430_rowid = @0
    `, [rowid]);

    const lineas = await this.dataSource.query(`
      SELECT
        m.f431_rowid as rowid,
        i.f120_referencia as referencia,
        i.f120_descripcion as producto,
        m.f431_id_unidad_medida as unidad,
        m.f431_cant_pedida_base as cantidad,
        m.f431_precio_unitario_base as precio,
        m.f431_vlr_bruto as valor_bruto,
        m.f431_vlr_neto as valor_total,
        b.f150_descripcion as bodega
      FROM t431_cm_pv_movto m
      LEFT JOIN t121_mc_items_extensiones ext ON m.f431_rowid_item_ext = ext.f121_rowid
      LEFT JOIN t120_mc_items i ON ext.f121_rowid_item = i.f120_rowid
      LEFT JOIN t150_mc_bodegas b ON m.f431_rowid_bodega = b.f150_rowid
      WHERE m.f431_rowid_pv_docto = @0
    `, [rowid]);

    return {
      documento: header[0] || null,
      lineas,
    };
  }

  async getFacturas(filters?: {
    buscar?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;

    let where = 'WHERE 1=1';
    const params: any[] = [];
    let paramIdx = 0;

    if (filters?.buscar) {
      where += ` AND (t.f200_razon_social LIKE @${paramIdx} OR t.f200_nit LIKE @${paramIdx} OR CAST(d.f350_consec_docto AS VARCHAR) LIKE @${paramIdx})`;
      params.push(`%${filters.buscar}%`);
      paramIdx++;
    }

    const countResult = await this.dataSource.query(`
      SELECT COUNT(*) as total
      FROM t461_cm_docto_factura_venta f
      LEFT JOIN t200_mm_terceros t ON f.f461_rowid_tercero_fact = t.f200_rowid
      LEFT JOIN t350_co_docto_contable d ON f.f461_rowid_docto = d.f350_rowid
      ${where}
    `, params);

    const datos = await this.dataSource.query(`
      SELECT
        f.f461_rowid_docto as rowid,
        d.f350_id_tipo_docto as tipo_docto,
        d.f350_consec_docto as consecutivo,
        f.f461_id_fecha as fecha,
        t.f200_razon_social as cliente,
        t.f200_nit as nit,
        f.f461_id_sucursal_fact as sucursal,
        d.f350_id_motivo_otros as motivo,
        mot.f1461_descripcion as motivo_descripcion,
        f.f461_vlr_bruto as valor_bruto,
        f.f461_vlr_neto as valor
      FROM t461_cm_docto_factura_venta f
      LEFT JOIN t200_mm_terceros t ON f.f461_rowid_tercero_fact = t.f200_rowid
      LEFT JOIN t350_co_docto_contable d ON f.f461_rowid_docto = d.f350_rowid
      LEFT JOIN t1461_mc_motivos_otros mot ON mot.f1461_id = d.f350_id_motivo_otros AND mot.f1461_id_cia = 1
      ${where}
      ORDER BY f.f461_id_fecha DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `, params);

    return { total: countResult[0]?.total || 0, datos, limit, offset };
  }

  async getRemisiones(filters?: {
    buscar?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;

    let where = 'WHERE 1=1';
    const params: any[] = [];
    let paramIdx = 0;

    if (filters?.buscar) {
      where += ` AND (t.f200_razon_social LIKE @${paramIdx} OR t.f200_nit LIKE @${paramIdx} OR CAST(d.f350_consec_docto AS VARCHAR) LIKE @${paramIdx})`;
      params.push(`%${filters.buscar}%`);
      paramIdx++;
    }
    if (filters?.fechaDesde) {
      where += ` AND r.f460_id_fecha >= @${paramIdx}`;
      params.push(filters.fechaDesde);
      paramIdx++;
    }
    if (filters?.fechaHasta) {
      where += ` AND r.f460_id_fecha <= @${paramIdx}`;
      params.push(filters.fechaHasta);
      paramIdx++;
    }

    const countResult = await this.dataSource.query(`
      SELECT COUNT(*) as total
      FROM t460_cm_docto_remision_venta r
      LEFT JOIN t200_mm_terceros t ON r.f460_rowid_tercero_fact = t.f200_rowid
      LEFT JOIN t350_co_docto_contable d ON r.f460_rowid_docto = d.f350_rowid
      ${where}
    `, params);

    const datos = await this.dataSource.query(`
      SELECT
        r.f460_rowid_docto as rowid,
        d.f350_id_tipo_docto as tipo_docto,
        d.f350_consec_docto as consecutivo,
        r.f460_id_fecha as fecha,
        t.f200_razon_social as cliente,
        t.f200_nit as nit,
        r.f460_id_sucursal_fact as sucursal,
        r.f460_ind_estado_cm as estado,
        r.f460_vlr_bruto as valor_bruto,
        r.f460_vlr_neto as valor_neto
      FROM t460_cm_docto_remision_venta r
      LEFT JOIN t200_mm_terceros t ON r.f460_rowid_tercero_fact = t.f200_rowid
      LEFT JOIN t350_co_docto_contable d ON r.f460_rowid_docto = d.f350_rowid
      ${where}
      ORDER BY r.f460_id_fecha DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `, params);

    return { total: countResult[0]?.total || 0, datos, limit, offset };
  }

  async getDevoluciones(filters?: {
    buscar?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;

    let where = 'WHERE r.f460_rowid_docto_fact_base IS NOT NULL';
    const params: any[] = [];
    let paramIdx = 0;

    if (filters?.buscar) {
      where += ` AND (t.f200_razon_social LIKE @${paramIdx} OR t.f200_nit LIKE @${paramIdx} OR CAST(d.f350_consec_docto AS VARCHAR) LIKE @${paramIdx})`;
      params.push(`%${filters.buscar}%`);
      paramIdx++;
    }
    if (filters?.fechaDesde) {
      where += ` AND r.f460_id_fecha >= @${paramIdx}`;
      params.push(filters.fechaDesde);
      paramIdx++;
    }
    if (filters?.fechaHasta) {
      where += ` AND r.f460_id_fecha <= @${paramIdx}`;
      params.push(filters.fechaHasta);
      paramIdx++;
    }

    const countResult = await this.dataSource.query(`
      SELECT COUNT(*) as total
      FROM t460_cm_docto_remision_venta r
      LEFT JOIN t200_mm_terceros t ON r.f460_rowid_tercero_fact = t.f200_rowid
      LEFT JOIN t350_co_docto_contable d ON r.f460_rowid_docto = d.f350_rowid
      ${where}
    `, params);

    const datos = await this.dataSource.query(`
      SELECT
        r.f460_rowid_docto as rowid,
        d.f350_id_tipo_docto as tipo_docto,
        d.f350_consec_docto as consecutivo,
        r.f460_id_fecha as fecha,
        t.f200_razon_social as cliente,
        t.f200_nit as nit,
        r.f460_id_sucursal_fact as sucursal,
        r.f460_ind_estado_cm as estado,
        r.f460_vlr_bruto as valor_bruto,
        r.f460_vlr_neto as valor_neto
      FROM t460_cm_docto_remision_venta r
      LEFT JOIN t200_mm_terceros t ON r.f460_rowid_tercero_fact = t.f200_rowid
      LEFT JOIN t350_co_docto_contable d ON r.f460_rowid_docto = d.f350_rowid
      ${where}
      ORDER BY r.f460_id_fecha DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `, params);

    return { total: countResult[0]?.total || 0, datos, limit, offset };
  }
}
