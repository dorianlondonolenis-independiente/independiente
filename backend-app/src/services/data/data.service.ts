import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DataService {
  constructor(private dataSource: DataSource) {}

  /**
   * Obtiene todos los registros de una tabla
   */
  async getTableData(tableName: string, limit: number = 100, offset: number = 0): Promise<any> {
    try {
      // Sanitizar el nombre de tabla
      const cleanTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');

      if (!cleanTableName) {
        throw new BadRequestException('Nombre de tabla inválido');
      }

      // Validar que la tabla exista
      const tableExists = await this.dataSource.query(`
        SELECT COUNT(*) as cnt
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_NAME = '${cleanTableName}'
        AND TABLE_TYPE = 'BASE TABLE'
      `);

      if (tableExists[0].cnt === 0) {
        throw new BadRequestException(`La tabla '${cleanTableName}' no existe`);
      }

      // Obtener el total de registros
      const countResult = await this.dataSource.query(`
        SELECT COUNT(*) as total FROM [${cleanTableName}]
      `);

      const total = countResult[0]?.total || 0;

      // Obtener los registros con paginación
      const query = `
        SELECT *
        FROM [${cleanTableName}]
        ORDER BY (SELECT NULL)
        OFFSET ${offset} ROWS
        FETCH NEXT ${limit} ROWS ONLY
      `;

      const data = await this.dataSource.query(query);

      return {
        table: cleanTableName,
        total,
        limit,
        offset,
        data,
      };
    } catch (error) {
      if (error.status === 400) {
        throw error;
      }
      throw new BadRequestException(`Error al obtener datos: ${error.message}`);
    }
  }

  /**
   * Obtiene un registro específico por ID
   */
  async getTableDataById(
    tableName: string,
    idField: string,
    idValue: string | number,
  ): Promise<any> {
    try {
      // Sanitizar
      const cleanTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
      const cleanIdField = idField.replace(/[^a-zA-Z0-9_]/g, '');

      const query = `
        SELECT * FROM [${cleanTableName}]
        WHERE [${cleanIdField}] = '${idValue}'
      `;

      const result = await this.dataSource.query(query);
      return result[0] || null;
    } catch (error) {
      throw new BadRequestException(`Error al obtener registro: ${error.message}`);
    }
  }
}
