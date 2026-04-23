import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class TercerosService {
  constructor(private dataSource: DataSource) {}

  /**
   * Listado enriquecido de terceros con info de contacto y tipo
   */
  async getTerceros(filters: {
    buscar?: string;
    tipo?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    let where = 'WHERE 1=1';
    const params: any[] = [];
    let paramIdx = 0;

    if (filters.buscar) {
      where += ` AND (t.f200_nit LIKE @${paramIdx} OR t.f200_razon_social LIKE @${paramIdx} OR t.f200_nombre_est LIKE @${paramIdx})`;
      params.push(`%${filters.buscar}%`);
      paramIdx++;
    }

    if (filters.tipo) {
      where += ` AND t.f200_ind_tipo_tercero = @${paramIdx}`;
      params.push(parseInt(filters.tipo));
      paramIdx++;
    }

    const countResult = await this.dataSource.query(`
      SELECT COUNT(*) as total FROM t200_mm_terceros t ${where}
    `, params);

    const datos = await this.dataSource.query(`
      SELECT
        t.f200_rowid as rowid,
        t.f200_nit as nit,
        t.f200_razon_social as razon_social,
        t.f200_nombre_est as nombre_establecimiento,
        t.f200_ind_tipo_tercero as tipo_tercero,
        t.f200_ind_estado as estado,
        t.f200_ind_cliente as es_cliente,
        t.f200_ind_proveedor as es_proveedor,
        t.f200_ind_empleado as es_empleado,
        t.f200_ind_otros as es_otros
      FROM t200_mm_terceros t
      ${where}
      ORDER BY t.f200_razon_social
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `, params);

    return { total: countResult[0]?.total || 0, datos, limit, offset };
  }

  /**
   * Stats de terceros
   */
  async getTercerosStats(): Promise<any> {
    const result = await this.dataSource.query(`
      SELECT
        COUNT(*) as total_terceros,
        SUM(CASE WHEN f200_ind_cliente = 1 THEN 1 ELSE 0 END) as clientes,
        SUM(CASE WHEN f200_ind_proveedor = 1 THEN 1 ELSE 0 END) as proveedores,
        SUM(CASE WHEN f200_ind_empleado = 1 THEN 1 ELSE 0 END) as empleados
      FROM t200_mm_terceros
    `);
    return result[0] || {};
  }

  /**
   * Detalle completo de un tercero con saldos
   */
  async getTerceroDetalle(rowid: number): Promise<any> {
    const tercero = await this.dataSource.query(`
      SELECT
        t.f200_rowid as rowid,
        t.f200_nit as nit,
        t.f200_razon_social as razon_social,
        t.f200_nombre_est as nombre_establecimiento,
        t.f200_ind_tipo_tercero as tipo_tercero,
        t.f200_ind_estado as estado,
        t.f200_nombres as nombres,
        t.f200_apellido1 as apellido1,
        t.f200_apellido2 as apellido2,
        t.f200_ind_cliente as es_cliente,
        t.f200_ind_proveedor as es_proveedor,
        t.f200_ind_empleado as es_empleado,
        t.f200_ind_otros as es_otros
      FROM t200_mm_terceros t
      WHERE t.f200_rowid = @0
    `, [rowid]);

    // Saldos abiertos del tercero
    const saldos = await this.dataSource.query(`
      SELECT TOP 20
        s.f353_id_tipo_docto_cruce as tipo_docto,
        s.f353_consec_docto_cruce as consecutivo,
        s.f353_fecha as fecha_documento,
        s.f353_fecha_vcto as fecha_vencimiento,
        (s.f353_total_db - s.f353_total_cr) as saldo,
        (s.f353_total_db + s.f353_total_cr) as valor_documento,
        CASE WHEN (s.f353_total_db - s.f353_total_cr) > 0 THEN 'DB' ELSE 'CR' END as tipo_saldo
      FROM t353_co_saldo_abierto s
      WHERE s.f353_rowid_tercero = @0
        AND (s.f353_total_db - s.f353_total_cr) <> 0
      ORDER BY s.f353_fecha_vcto DESC
    `, [rowid]);

    return { tercero: tercero[0] || null, saldos };
  }
}
