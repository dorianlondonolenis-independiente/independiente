import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class KardexService {
  constructor(private dataSource: DataSource) {}

  /**
   * Kardex: movimientos de inventario por producto
   */
  async getKardex(filters: {
    referencia?: string;
    itemRowid?: number;
    bodega?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    let where = 'WHERE 1=1';
    const params: any[] = [];
    let paramIdx = 0;

    if (filters.itemRowid) {
      where += ` AND i.f120_rowid = @${paramIdx}`;
      params.push(filters.itemRowid);
      paramIdx++;
    }

    if (filters.referencia) {
      where += ` AND (i.f120_referencia LIKE @${paramIdx} OR i.f120_descripcion LIKE @${paramIdx})`;
      params.push(`%${filters.referencia}%`);
      paramIdx++;
    }

    if (filters.bodega) {
      where += ` AND b.f150_id = @${paramIdx}`;
      params.push(filters.bodega);
      paramIdx++;
    }

    if (filters.fechaDesde) {
      where += ` AND m.f470_fecha >= @${paramIdx}`;
      params.push(filters.fechaDesde);
      paramIdx++;
    }

    if (filters.fechaHasta) {
      where += ` AND m.f470_fecha <= @${paramIdx}`;
      params.push(filters.fechaHasta);
      paramIdx++;
    }

    const countResult = await this.dataSource.query(`
      SELECT COUNT(*) as total
      FROM t470_cm_movto_invent m
      JOIN t121_mc_items_extensiones ext ON m.f470_rowid_item_ext = ext.f121_rowid
      JOIN t120_mc_items i ON ext.f121_rowid_item = i.f120_rowid
      JOIN t150_mc_bodegas b ON m.f470_rowid_bodega = b.f150_rowid
      ${where}
    `, params);

    const datos = await this.dataSource.query(`
      SELECT
        m.f470_rowid as rowid,
        m.f470_fecha as fecha,
        m.f470_id_tipo_docto as tipo_docto,
        m.f470_consec_docto as consecutivo,
        i.f120_referencia as referencia,
        i.f120_descripcion as producto,
        b.f150_id as bodega_id,
        b.f150_descripcion as bodega,
        m.f470_id_concepto as concepto,
        m.f470_id_motivo as motivo,
        m.f470_cant_base as cantidad,
        m.f470_vlr_uni as valor_unitario,
        m.f470_vlr_tot as valor_total,
        m.f470_id_co as centro_operacion,
        m.f470_notas as notas
      FROM t470_cm_movto_invent m
      JOIN t121_mc_items_extensiones ext ON m.f470_rowid_item_ext = ext.f121_rowid
      JOIN t120_mc_items i ON ext.f121_rowid_item = i.f120_rowid
      JOIN t150_mc_bodegas b ON m.f470_rowid_bodega = b.f150_rowid
      ${where}
      ORDER BY m.f470_fecha DESC, m.f470_rowid DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `, params);

    return { total: countResult[0]?.total || 0, datos, limit, offset };
  }

  /**
   * Resumen movimientos: entradas vs salidas por mes
   */
  async getResumenMensual(meses: number = 12): Promise<any[]> {
    return this.dataSource.query(`
      SELECT
        FORMAT(m.f470_fecha, 'yyyy-MM') as mes,
        SUM(CASE WHEN m.f470_cant_base > 0 THEN m.f470_cant_base ELSE 0 END) as entradas,
        SUM(CASE WHEN m.f470_cant_base < 0 THEN ABS(m.f470_cant_base) ELSE 0 END) as salidas,
        COUNT(*) as movimientos
      FROM t470_cm_movto_invent m
      WHERE m.f470_fecha >= DATEADD(MONTH, -@0, GETDATE())
      GROUP BY FORMAT(m.f470_fecha, 'yyyy-MM')
      ORDER BY mes DESC
    `, [meses]);
  }
}
