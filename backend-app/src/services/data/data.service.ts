import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TableResponseDto, ColumnDefinitionDto } from 'src/dtos/table-response.dto';

@Injectable()
export class DataService {
  constructor(private dataSource: DataSource) {}

  /**
   * Obtiene todos los registros de una tabla
   */
  async getTableData(tableName: string, limit: number = 100, offset: number = 0): Promise<TableResponseDto[]> {
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

      // Obtener información de columnas
      const columnsInfo = await this.dataSource.query(`
        SELECT 
          COLUMN_NAME as name,
          DATA_TYPE as type,
          ORDINAL_POSITION as position,
          IS_NULLABLE as nullable
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${cleanTableName}'
        ORDER BY ORDINAL_POSITION
      `);

      // Convertir información de columnas al formato requerido
      const columnas: ColumnDefinitionDto[] = columnsInfo.map((col, index) => ({
        id: col.name,
        descripcion: col.name.charAt(0).toUpperCase() + col.name.slice(1),
        orden: index + 1,
      }));

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

      const datos = await this.dataSource.query(query);

      // Construir respuesta en el formato requerido
      const response: TableResponseDto = {
        titulo: cleanTableName,
        subtitulo: `consulta desde backend`,
        buscador: true,
        columnasBuscador: true,
        columnasVisibles: true,
        exportar: true,
        contextoMenu: [],
        boton: [],
        columnas,
        datos,
      };

      return [response];
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
      const cleanTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
      const cleanIdField = idField.replace(/[^a-zA-Z0-9_]/g, '');

      const result = await this.dataSource.query(
        `SELECT * FROM [${cleanTableName}] WHERE [${cleanIdField}] = @0`,
        [idValue],
      );
      return result[0] || null;
    } catch (error) {
      throw new BadRequestException(`Error al obtener registro: ${error.message}`);
    }
  }

  /**
   * Obtiene las primary keys de una tabla
   */
  async getTablePrimaryKeys(tableName: string): Promise<string[]> {
    const cleanTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');

    // Intentar con sys tables (más confiable)
    const pks = await this.dataSource.query(`
      SELECT c.name
      FROM sys.index_columns ic
      JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
      JOIN sys.indexes i ON ic.object_id = i.object_id AND ic.index_id = i.index_id
      WHERE i.is_primary_key = 1
        AND OBJECT_NAME(ic.object_id) = '${cleanTableName}'
      ORDER BY ic.key_ordinal
    `);

    if (pks.length > 0) {
      return pks.map((pk: any) => pk.name);
    }

    // Fallback: buscar columna IDENTITY
    const identity = await this.dataSource.query(`
      SELECT c.name
      FROM sys.columns c
      WHERE c.object_id = OBJECT_ID('${cleanTableName}')
        AND c.is_identity = 1
    `);

    return identity.map((col: any) => col.name);
  }

  /**
   * Crea un registro en una tabla
   */
  async createRecord(tableName: string, data: Record<string, any>): Promise<any> {
    try {
      const cleanTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
      if (!cleanTableName) throw new BadRequestException('Nombre de tabla inválido');

      await this.validateTableExists(cleanTableName);
      const validColumns = await this.getValidColumns(cleanTableName);

      // Filtrar solo columnas válidas
      const entries = Object.entries(data).filter(([key]) => {
        const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, '');
        return validColumns.includes(cleanKey);
      });

      if (entries.length === 0) throw new BadRequestException('No hay columnas válidas para insertar');

      const columns = entries.map(([key]) => `[${key.replace(/[^a-zA-Z0-9_]/g, '')}]`).join(', ');
      const paramPlaceholders = entries.map((_, i) => `@${i}`).join(', ');
      const values = entries.map(([, val]) => val);

      const query = `INSERT INTO [${cleanTableName}] (${columns}) OUTPUT INSERTED.* VALUES (${paramPlaceholders})`;
      const result = await this.dataSource.query(query, values);
      return result[0] || null;
    } catch (error) {
      if (error.status === 400) throw error;
      throw new BadRequestException(`Error al crear registro: ${error.message}`);
    }
  }

  /**
   * Actualiza un registro en una tabla
   */
  async updateRecord(
    tableName: string,
    idField: string,
    idValue: string | number,
    data: Record<string, any>,
  ): Promise<any> {
    try {
      const cleanTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
      const cleanIdField = idField.replace(/[^a-zA-Z0-9_]/g, '');
      if (!cleanTableName || !cleanIdField) throw new BadRequestException('Parámetros inválidos');

      await this.validateTableExists(cleanTableName);
      const validColumns = await this.getValidColumns(cleanTableName);

      const entries = Object.entries(data).filter(([key]) => {
        const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, '');
        return validColumns.includes(cleanKey) && cleanKey !== cleanIdField;
      });

      if (entries.length === 0) throw new BadRequestException('No hay columnas válidas para actualizar');

      const setClauses = entries.map(([key], i) => `[${key.replace(/[^a-zA-Z0-9_]/g, '')}] = @${i}`).join(', ');
      const values = entries.map(([, val]) => val);
      values.push(idValue);

      const query = `UPDATE [${cleanTableName}] SET ${setClauses} OUTPUT INSERTED.* WHERE [${cleanIdField}] = @${entries.length}`;
      const result = await this.dataSource.query(query, values);
      return result[0] || null;
    } catch (error) {
      if (error.status === 400) throw error;
      throw new BadRequestException(`Error al actualizar registro: ${error.message}`);
    }
  }

  /**
   * Actualiza un registro usando TODOS los campos originales en el WHERE (para tablas sin PK)
   */
  async updateRecordByRow(
    tableName: string,
    originalData: Record<string, any>,
    updatedData: Record<string, any>,
  ): Promise<any> {
    try {
      const cleanTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
      if (!cleanTableName) throw new BadRequestException('Nombre de tabla inválido');

      await this.validateTableExists(cleanTableName);
      const validColumns = await this.getValidColumns(cleanTableName);

      // Build SET clause from updated data
      const setEntries = Object.entries(updatedData).filter(([key]) => {
        const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, '');
        return validColumns.includes(cleanKey);
      });

      if (setEntries.length === 0) throw new BadRequestException('No hay columnas válidas para actualizar');

      // Build WHERE clause from ALL original values
      const whereEntries = Object.entries(originalData).filter(([key]) => {
        const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, '');
        return validColumns.includes(cleanKey);
      });

      if (whereEntries.length === 0) throw new BadRequestException('No se pueden identificar condiciones para el WHERE');

      let paramIndex = 0;
      const setClauses = setEntries.map(([key]) => {
        const clause = `[${key.replace(/[^a-zA-Z0-9_]/g, '')}] = @${paramIndex}`;
        paramIndex++;
        return clause;
      });

      const whereClauses = whereEntries.map(([key, val]) => {
        if (val === null || val === undefined) {
          return `[${key.replace(/[^a-zA-Z0-9_]/g, '')}] IS NULL`;
        }
        const clause = `[${key.replace(/[^a-zA-Z0-9_]/g, '')}] = @${paramIndex}`;
        paramIndex++;
        return clause;
      });

      const values = [
        ...setEntries.map(([, val]) => val),
        ...whereEntries.filter(([, val]) => val !== null && val !== undefined).map(([, val]) => val),
      ];

      // UPDATE TOP(1) to prevent mass updates
      const query = `UPDATE TOP(1) [${cleanTableName}] SET ${setClauses.join(', ')} OUTPUT INSERTED.* WHERE ${whereClauses.join(' AND ')}`;
      const result = await this.dataSource.query(query, values);
      return result[0] || null;
    } catch (error) {
      if (error.status === 400) throw error;
      throw new BadRequestException(`Error al actualizar registro: ${error.message}`);
    }
  }

  /**
   * Elimina un registro de una tabla
   */
  async deleteRecord(
    tableName: string,
    idField: string,
    idValue: string | number,
  ): Promise<any> {
    try {
      const cleanTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
      const cleanIdField = idField.replace(/[^a-zA-Z0-9_]/g, '');
      if (!cleanTableName || !cleanIdField) throw new BadRequestException('Parámetros inválidos');

      await this.validateTableExists(cleanTableName);

      const result = await this.dataSource.query(
        `DELETE FROM [${cleanTableName}] OUTPUT DELETED.* WHERE [${cleanIdField}] = @0`,
        [idValue],
      );
      return result[0] || null;
    } catch (error) {
      if (error.status === 400) throw error;
      throw new BadRequestException(`Error al eliminar registro: ${error.message}`);
    }
  }

  /**
   * Elimina un registro usando TODOS los campos en el WHERE (para tablas sin PK)
   */
  async deleteRecordByRow(
    tableName: string,
    conditions: Record<string, any>,
  ): Promise<any> {
    try {
      const cleanTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
      if (!cleanTableName) throw new BadRequestException('Nombre de tabla inválido');

      await this.validateTableExists(cleanTableName);
      const validColumns = await this.getValidColumns(cleanTableName);

      const whereEntries = Object.entries(conditions).filter(([key]) => {
        const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, '');
        return validColumns.includes(cleanKey);
      });

      if (whereEntries.length === 0) throw new BadRequestException('No se pueden identificar condiciones para el WHERE');

      let paramIndex = 0;
      const whereClauses = whereEntries.map(([key, val]) => {
        if (val === null || val === undefined) {
          return `[${key.replace(/[^a-zA-Z0-9_]/g, '')}] IS NULL`;
        }
        const clause = `[${key.replace(/[^a-zA-Z0-9_]/g, '')}] = @${paramIndex}`;
        paramIndex++;
        return clause;
      });

      const values = whereEntries
        .filter(([, val]) => val !== null && val !== undefined)
        .map(([, val]) => val);

      // DELETE TOP(1) to prevent mass deletes
      const query = `DELETE TOP(1) FROM [${cleanTableName}] OUTPUT DELETED.* WHERE ${whereClauses.join(' AND ')}`;
      const result = await this.dataSource.query(query, values);
      return result[0] || null;
    } catch (error) {
      if (error.status === 400) throw error;
      throw new BadRequestException(`Error al eliminar registro: ${error.message}`);
    }
  }

  /**
   * Valida que una tabla exista en la BD
   */
  private async validateTableExists(cleanTableName: string): Promise<void> {
    const tableExists = await this.dataSource.query(`
      SELECT COUNT(*) as cnt
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = '${cleanTableName}' AND TABLE_TYPE = 'BASE TABLE'
    `);
    if (tableExists[0].cnt === 0) {
      throw new BadRequestException(`La tabla '${cleanTableName}' no existe`);
    }
  }

  /**
   * Obtiene la lista de columnas válidas de una tabla
   */
  private async getValidColumns(cleanTableName: string): Promise<string[]> {
    // Usar sys.columns que es más confiable que INFORMATION_SCHEMA
    const cols = await this.dataSource.query(`
      SELECT c.name
      FROM sys.columns c
      WHERE c.object_id = OBJECT_ID('${cleanTableName}')
    `);
    return cols.map((c: any) => c.name);
  }
}
