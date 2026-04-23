import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class InventarioService {
  constructor(private dataSource: DataSource) {}

  /**
   * Stock actual por producto y bodega
   */
  async getStockResumen(filters?: {
    bodega?: string;
    buscar?: string;
    soloConStock?: boolean;
    bajosMinimo?: boolean;
    sinMovimiento?: number; // días sin movimiento
    limit?: number;
    offset?: number;
  }): Promise<any> {
    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;

    let where = 'WHERE 1=1';
    const params: any[] = [];
    let paramIdx = 0;

    if (filters?.bodega) {
      where += ` AND b.f150_id = @${paramIdx}`;
      params.push(filters.bodega);
      paramIdx++;
    }

    if (filters?.buscar) {
      where += ` AND (i.f120_referencia LIKE @${paramIdx} OR i.f120_descripcion LIKE @${paramIdx})`;
      params.push(`%${filters.buscar}%`);
      paramIdx++;
    }

    if (filters?.soloConStock) {
      where += ' AND e.f400_cant_existencia_1 > 0';
    }

    if (filters?.bajosMinimo) {
      where += ' AND e.f400_cant_existencia_1 < e.f400_cant_nivel_min_1 AND e.f400_cant_nivel_min_1 > 0';
    }

    if (filters?.sinMovimiento && filters.sinMovimiento > 0) {
      where += ` AND (e.f400_fecha_ult_venta IS NULL OR e.f400_fecha_ult_venta < DATEADD(DAY, -@${paramIdx}, GETDATE()))`;
      params.push(filters.sinMovimiento);
      paramIdx++;
    }

    // Count total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM t400_cm_existencia e
      JOIN t121_mc_items_extensiones ext ON e.f400_rowid_item_ext = ext.f121_rowid
      JOIN t120_mc_items i ON ext.f121_rowid_item = i.f120_rowid
      JOIN t150_mc_bodegas b ON e.f400_rowid_bodega = b.f150_rowid
      ${where}
    `;
    const countResult = await this.dataSource.query(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Data query
    const dataQuery = `
      SELECT
        i.f120_rowid as item_rowid,
        i.f120_id as item_id,
        i.f120_referencia as referencia,
        i.f120_descripcion as producto,
        i.f120_id_unidad_inventario as unidad,
        b.f150_id as bodega_id,
        b.f150_descripcion as bodega,
        b.f150_ind_estado as bodega_estado,
        e.f400_cant_existencia_1 as existencia,
        e.f400_cant_comprometida_1 as comprometida,
        e.f400_cant_pendiente_entrar_1 as por_entrar,
        e.f400_cant_pendiente_salir_1 as por_salir,
        (e.f400_cant_existencia_1 - e.f400_cant_comprometida_1 - e.f400_cant_pendiente_salir_1) as disponible,
        e.f400_cant_nivel_min_1 as nivel_min,
        e.f400_cant_nivel_max_1 as nivel_max,
        e.f400_costo_prom_uni as costo_unitario,
        (e.f400_cant_existencia_1 * e.f400_costo_prom_uni) as valor_total,
        e.f400_fecha_ult_compra as ult_compra,
        e.f400_fecha_ult_venta as ult_venta,
        e.f400_fecha_ult_entrada as ult_entrada,
        e.f400_fecha_ult_salida as ult_salida
      FROM t400_cm_existencia e
      JOIN t121_mc_items_extensiones ext ON e.f400_rowid_item_ext = ext.f121_rowid
      JOIN t120_mc_items i ON ext.f121_rowid_item = i.f120_rowid
      JOIN t150_mc_bodegas b ON e.f400_rowid_bodega = b.f150_rowid
      ${where}
      ORDER BY i.f120_referencia, b.f150_id
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `;
    const datos = await this.dataSource.query(dataQuery, params);

    return { total, datos, limit, offset };
  }

  /**
   * Resumen de estadísticas de inventario
   */
  async getStockStats(): Promise<any> {
    const query = `
      SELECT
        COUNT(DISTINCT i.f120_rowid) as total_productos,
        COUNT(DISTINCT b.f150_rowid) as total_bodegas,
        SUM(e.f400_cant_existencia_1) as total_unidades,
        SUM(e.f400_cant_existencia_1 * e.f400_costo_prom_uni) as valor_inventario,
        SUM(CASE WHEN e.f400_cant_existencia_1 <= 0 THEN 1 ELSE 0 END) as sin_stock,
        SUM(CASE WHEN e.f400_cant_existencia_1 > 0 AND e.f400_cant_existencia_1 < e.f400_cant_nivel_min_1 AND e.f400_cant_nivel_min_1 > 0 THEN 1 ELSE 0 END) as bajo_minimo,
        SUM(CASE WHEN e.f400_cant_existencia_1 > e.f400_cant_nivel_max_1 AND e.f400_cant_nivel_max_1 > 0 THEN 1 ELSE 0 END) as sobre_maximo
      FROM t400_cm_existencia e
      JOIN t121_mc_items_extensiones ext ON e.f400_rowid_item_ext = ext.f121_rowid
      JOIN t120_mc_items i ON ext.f121_rowid_item = i.f120_rowid
      JOIN t150_mc_bodegas b ON e.f400_rowid_bodega = b.f150_rowid
    `;
    const result = await this.dataSource.query(query);
    return result[0];
  }

  /**
   * Lista de bodegas para filtro
   */
  async getBodegas(): Promise<any[]> {
    return this.dataSource.query(`
      SELECT f150_id as id, f150_descripcion as descripcion, f150_ind_estado as estado
      FROM t150_mc_bodegas
      ORDER BY f150_id
    `);
  }

  /**
   * Stock agrupado por bodega (para gráfico)
   */
  async getStockPorBodega(): Promise<any[]> {
    return this.dataSource.query(`
      SELECT
        b.f150_id as bodega_id,
        b.f150_descripcion as bodega,
        COUNT(DISTINCT ext.f121_rowid_item) as productos,
        SUM(e.f400_cant_existencia_1) as unidades,
        SUM(e.f400_cant_existencia_1 * e.f400_costo_prom_uni) as valor
      FROM t400_cm_existencia e
      JOIN t121_mc_items_extensiones ext ON e.f400_rowid_item_ext = ext.f121_rowid
      JOIN t150_mc_bodegas b ON e.f400_rowid_bodega = b.f150_rowid
      WHERE e.f400_cant_existencia_1 > 0
      GROUP BY b.f150_id, b.f150_descripcion
      ORDER BY valor DESC
    `);
  }
}
