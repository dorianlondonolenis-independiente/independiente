import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class ComprasService {
  constructor(private dataSource: DataSource) {}

  async getComprasStats(): Promise<any> {
    const ordenes = await this.dataSource.query(`
      SELECT
        COUNT(*) as total_ordenes,
        COUNT(DISTINCT d.f420_rowid_tercero_prov) as proveedores_unicos
      FROM t420_cm_oc_docto d
    `);
    const valores = await this.dataSource.query(`
      SELECT
        ISNULL(SUM(m.f421_vlr_neto), 0) as valor_total,
        ISNULL(AVG(m.f421_vlr_neto), 0) as promedio_linea
      FROM t421_cm_oc_movto m
    `);
    return {
      total_ordenes: ordenes[0]?.total_ordenes || 0,
      proveedores_unicos: ordenes[0]?.proveedores_unicos || 0,
      valor_total: valores[0]?.valor_total || 0,
      promedio_orden: valores[0]?.promedio_linea || 0,
    };
  }

  async getOrdenes(filters?: {
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
      where += ` AND (t.f200_razon_social LIKE @${paramIdx} OR CAST(d.f420_consec_docto AS VARCHAR) LIKE @${paramIdx})`;
      params.push(`%${filters.buscar}%`);
      paramIdx++;
    }

    if (filters?.fechaDesde) {
      where += ` AND d.f420_fecha >= @${paramIdx}`;
      params.push(filters.fechaDesde);
      paramIdx++;
    }

    if (filters?.fechaHasta) {
      where += ` AND d.f420_fecha <= @${paramIdx}`;
      params.push(filters.fechaHasta);
      paramIdx++;
    }

    const countResult = await this.dataSource.query(`
      SELECT COUNT(*) as total
      FROM t420_cm_oc_docto d
      LEFT JOIN t200_mm_terceros t ON d.f420_rowid_tercero_prov = t.f200_rowid
      ${where}
    `, params);

    const datos = await this.dataSource.query(`
      SELECT
        d.f420_rowid as rowid,
        d.f420_id_tipo_docto as tipo_docto,
        d.f420_consec_docto as consecutivo,
        d.f420_fecha as fecha,
        t.f200_razon_social as proveedor,
        t.f200_nit as nit,
        d.f420_ind_estado as estado,
        d.f420_notas as notas,
        ISNULL(totales.vlr_bruto, 0) as valor_bruto,
        ISNULL(totales.vlr_neto, 0) as valor_neto
      FROM t420_cm_oc_docto d
      LEFT JOIN t200_mm_terceros t ON d.f420_rowid_tercero_prov = t.f200_rowid
      LEFT JOIN (
        SELECT f421_rowid_oc_docto, SUM(f421_vlr_bruto) as vlr_bruto, SUM(f421_vlr_neto) as vlr_neto
        FROM t421_cm_oc_movto GROUP BY f421_rowid_oc_docto
      ) totales ON totales.f421_rowid_oc_docto = d.f420_rowid
      ${where}
      ORDER BY d.f420_fecha DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `, params);

    return { total: countResult[0]?.total || 0, datos, limit, offset };
  }

  async getOrdenDetalle(rowid: number): Promise<any> {
    const header = await this.dataSource.query(`
      SELECT
        d.f420_rowid as rowid, d.f420_id_tipo_docto as tipo_docto,
        d.f420_consec_docto as consecutivo, d.f420_fecha as fecha,
        d.f420_notas as notas, d.f420_ind_estado as estado,
        t.f200_razon_social as proveedor, t.f200_nit as nit
      FROM t420_cm_oc_docto d
      LEFT JOIN t200_mm_terceros t ON d.f420_rowid_tercero_prov = t.f200_rowid
      WHERE d.f420_rowid = @0
    `, [rowid]);

    const lineas = await this.dataSource.query(`
      SELECT
        m.f421_rowid as rowid,
        i.f120_referencia as referencia,
        i.f120_descripcion as producto,
        m.f421_id_unidad_medida as unidad,
        m.f421_cant_pedida_base as cantidad,
        m.f421_precio_unitario as precio,
        m.f421_vlr_bruto as valor_bruto,
        m.f421_vlr_neto as valor_total,
        b.f150_descripcion as bodega
      FROM t421_cm_oc_movto m
      LEFT JOIN t121_mc_items_extensiones ext ON m.f421_rowid_item_ext = ext.f121_rowid
      LEFT JOIN t120_mc_items i ON ext.f121_rowid_item = i.f120_rowid
      LEFT JOIN t150_mc_bodegas b ON m.f421_rowid_bodega = b.f150_rowid
      WHERE m.f421_rowid_oc_docto = @0
    `, [rowid]);

    return { documento: header[0] || null, lineas };
  }
}
