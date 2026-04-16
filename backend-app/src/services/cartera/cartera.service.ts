import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class CarteraService {
  constructor(private dataSource: DataSource) {}

  async getCarteraStats(): Promise<any> {
    const result = await this.dataSource.query(`
      SELECT
        COUNT(*) as total_saldos,
        SUM(CASE WHEN (sa.f353_total_db - sa.f353_total_cr) > 0 THEN (sa.f353_total_db - sa.f353_total_cr) ELSE 0 END) as total_cxc,
        SUM(CASE WHEN (sa.f353_total_db - sa.f353_total_cr) < 0 THEN ABS(sa.f353_total_db - sa.f353_total_cr) ELSE 0 END) as total_cxp,
        COUNT(DISTINCT sa.f353_rowid_tercero) as terceros_con_saldo
      FROM t353_co_saldo_abierto sa
      WHERE (sa.f353_total_db - sa.f353_total_cr) <> 0
    `);
    return result[0];
  }

  async getSaldos(filters?: {
    buscar?: string;
    tipo?: string; // 'cxc' | 'cxp' | 'todos'
    limit?: number;
    offset?: number;
  }): Promise<any> {
    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;

    let where = 'WHERE (sa.f353_total_db - sa.f353_total_cr) <> 0';
    const params: any[] = [];
    let paramIdx = 0;

    if (filters?.buscar) {
      where += ` AND (t.f200_razon_social LIKE @${paramIdx} OR t.f200_nit LIKE @${paramIdx})`;
      params.push(`%${filters.buscar}%`);
      paramIdx++;
    }

    if (filters?.tipo === 'cxc') {
      where += ' AND (sa.f353_total_db - sa.f353_total_cr) > 0';
    } else if (filters?.tipo === 'cxp') {
      where += ' AND (sa.f353_total_db - sa.f353_total_cr) < 0';
    }

    const countResult = await this.dataSource.query(`
      SELECT COUNT(*) as total
      FROM t353_co_saldo_abierto sa
      LEFT JOIN t200_mm_terceros t ON sa.f353_rowid_tercero = t.f200_rowid
      ${where}
    `, params);

    const datos = await this.dataSource.query(`
      SELECT
        sa.f353_rowid as rowid,
        t.f200_razon_social as tercero,
        t.f200_nit as nit,
        sa.f353_id_tipo_docto_cruce as tipo_docto,
        sa.f353_consec_docto_cruce as consecutivo,
        sa.f353_fecha as fecha_documento,
        sa.f353_fecha_vcto as fecha_vencimiento,
        (sa.f353_total_db - sa.f353_total_cr) as saldo,
        CASE WHEN (sa.f353_total_db - sa.f353_total_cr) > 0 THEN 'CxC' ELSE 'CxP' END as tipo,
        DATEDIFF(DAY, sa.f353_fecha_vcto, GETDATE()) as dias_vencido
      FROM t353_co_saldo_abierto sa
      LEFT JOIN t200_mm_terceros t ON sa.f353_rowid_tercero = t.f200_rowid
      ${where}
      ORDER BY ABS(sa.f353_total_db - sa.f353_total_cr) DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `, params);

    return { total: countResult[0]?.total || 0, datos, limit, offset };
  }

  async getAging(): Promise<any[]> {
    return this.dataSource.query(`
      SELECT
        CASE
          WHEN DATEDIFF(DAY, sa.f353_fecha_vcto, GETDATE()) <= 0 THEN 'Vigente'
          WHEN DATEDIFF(DAY, sa.f353_fecha_vcto, GETDATE()) BETWEEN 1 AND 30 THEN '1-30 dias'
          WHEN DATEDIFF(DAY, sa.f353_fecha_vcto, GETDATE()) BETWEEN 31 AND 60 THEN '31-60 dias'
          WHEN DATEDIFF(DAY, sa.f353_fecha_vcto, GETDATE()) BETWEEN 61 AND 90 THEN '61-90 dias'
          ELSE 'Mas de 90 dias'
        END as rango,
        COUNT(*) as cantidad,
        SUM(sa.f353_total_db - sa.f353_total_cr) as valor
      FROM t353_co_saldo_abierto sa
      WHERE (sa.f353_total_db - sa.f353_total_cr) <> 0
      GROUP BY
        CASE
          WHEN DATEDIFF(DAY, sa.f353_fecha_vcto, GETDATE()) <= 0 THEN 'Vigente'
          WHEN DATEDIFF(DAY, sa.f353_fecha_vcto, GETDATE()) BETWEEN 1 AND 30 THEN '1-30 dias'
          WHEN DATEDIFF(DAY, sa.f353_fecha_vcto, GETDATE()) BETWEEN 31 AND 60 THEN '31-60 dias'
          WHEN DATEDIFF(DAY, sa.f353_fecha_vcto, GETDATE()) BETWEEN 61 AND 90 THEN '61-90 dias'
          ELSE 'Mas de 90 dias'
        END
      ORDER BY MIN(DATEDIFF(DAY, sa.f353_fecha_vcto, GETDATE()))
    `);
  }
}
