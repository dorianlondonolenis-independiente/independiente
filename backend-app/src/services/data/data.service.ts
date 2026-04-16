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
   * Obtiene la lista de columnas válidas de una tabla (excluye identity, computed y timestamp)
   */
  private async getValidColumns(cleanTableName: string): Promise<string[]> {
    const cols = await this.dataSource.query(`
      SELECT c.name
      FROM sys.columns c
      WHERE c.object_id = OBJECT_ID('${cleanTableName}')
        AND c.is_identity = 0
        AND c.is_computed = 0
        AND TYPE_NAME(c.system_type_id) <> 'timestamp'
    `);
    return cols.map((c: any) => c.name);
  }

  /**
   * Exporta todos los datos de una tabla como CSV
   */
  async exportTableCsv(tableName: string): Promise<string> {
    const cleanTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    await this.validateTableExists(cleanTableName);

    const columnsInfo = await this.dataSource.query(`
      SELECT COLUMN_NAME as name
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = '${cleanTableName}'
      ORDER BY ORDINAL_POSITION
    `);
    const colNames = columnsInfo.map((c: any) => c.name);

    const datos = await this.dataSource.query(`SELECT * FROM [${cleanTableName}]`);

    // Build CSV
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const header = colNames.map(escapeCsv).join(',');
    const rows = datos.map((row: any) => colNames.map((col: string) => escapeCsv(row[col])).join(','));
    return [header, ...rows].join('\r\n');
  }

  /**
   * Búsqueda global: busca un término en las primeras columnas de texto de múltiples tablas
   */
  async globalSearch(term: string, maxResults: number = 50): Promise<any[]> {
    const cleanTerm = term.replace(/'/g, "''");
    if (!cleanTerm || cleanTerm.length < 2) return [];

    // Get tables with row count > 0 that start with 't' (business tables)
    const tables = await this.dataSource.query(`
      SELECT TOP 30 t.name AS tableName
      FROM sys.tables t
      INNER JOIN sys.dm_db_partition_stats s ON t.object_id = s.object_id AND s.index_id IN (0, 1)
      WHERE t.name LIKE 't%' AND s.row_count > 0
      ORDER BY s.row_count DESC
    `);

    const results: any[] = [];

    for (const tbl of tables) {
      if (results.length >= maxResults) break;

      // Get first 3 varchar/nvarchar columns of this table
      const cols = await this.dataSource.query(`
        SELECT TOP 3 c.name
        FROM sys.columns c
        WHERE c.object_id = OBJECT_ID('${tbl.tableName}')
          AND TYPE_NAME(c.system_type_id) IN ('varchar', 'nvarchar', 'char', 'nchar')
          AND c.max_length > 0
        ORDER BY c.column_id
      `);

      if (cols.length === 0) continue;

      const whereClauses = cols.map((c: any) => `[${c.name}] LIKE '%${cleanTerm}%'`).join(' OR ');
      const selectCols = cols.map((c: any) => `[${c.name}]`).join(', ');
      const remaining = maxResults - results.length;

      try {
        const rows = await this.dataSource.query(`
          SELECT TOP ${remaining} ${selectCols}
          FROM [${tbl.tableName}]
          WHERE ${whereClauses}
        `);

        if (rows.length > 0) {
          results.push({
            tableName: tbl.tableName,
            matches: rows.length,
            columns: cols.map((c: any) => c.name),
            preview: rows.slice(0, 5),
          });
        }
      } catch {
        // Skip tables that fail (e.g. permission issues)
      }
    }

    return results;
  }

  /**
   * Obtiene las relaciones (FK) de una tabla
   */
  async getTableRelations(tableName: string): Promise<any> {
    const cleanTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    await this.validateTableExists(cleanTableName);

    // FKs where this table references other tables (outgoing)
    const outgoing = await this.dataSource.query(`
      SELECT
        fk.name AS fk_name,
        tp.name AS parent_table,
        cp.name AS parent_column,
        tr.name AS referenced_table,
        cr.name AS referenced_column
      FROM sys.foreign_keys fk
      INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
      INNER JOIN sys.tables tp ON fkc.parent_object_id = tp.object_id
      INNER JOIN sys.columns cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
      INNER JOIN sys.tables tr ON fkc.referenced_object_id = tr.object_id
      INNER JOIN sys.columns cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
      WHERE tp.name = '${cleanTableName}'
      ORDER BY fk.name
    `);

    // FKs where other tables reference this table (incoming)
    const incoming = await this.dataSource.query(`
      SELECT
        fk.name AS fk_name,
        tp.name AS referencing_table,
        cp.name AS referencing_column,
        cr.name AS referenced_column
      FROM sys.foreign_keys fk
      INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
      INNER JOIN sys.tables tp ON fkc.parent_object_id = tp.object_id
      INNER JOIN sys.columns cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
      INNER JOIN sys.tables tr ON fkc.referenced_object_id = tr.object_id
      INNER JOIN sys.columns cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
      WHERE tr.name = '${cleanTableName}'
      ORDER BY tp.name
    `);

    // Known maestras table names (for priority sorting)
    const maestrasTables = new Set([
      't120_mc_items', 't121_mc_items_extensiones', 't126_mc_items_precios',
      't400_cm_existencia', 't401_cm_existencia_lote', 't402_cm_costos', 't150_mc_bodegas',
      't200_mm_terceros', 't201_mm_clientes', 't202_mm_proveedores',
      't420_cm_oc_docto', 't430_cm_pv_docto',
      't116_mc_extensiones1', 't117_mc_extensiones1_detalle',
      't118_mc_extensiones2', 't119_mc_extensiones2_detalle', 't145_mc_conceptos',
    ]);

    // Collect all related table names for row count
    const relatedTables = new Set<string>();
    outgoing.forEach((r: any) => relatedTables.add(r.referenced_table));
    incoming.forEach((r: any) => relatedTables.add(r.referencing_table));

    // Fetch row counts in parallel
    const countMap: Record<string, number> = {};
    const countPromises = Array.from(relatedTables).map(async (tbl) => {
      try {
        const res = await this.dataSource.query(`SELECT COUNT(*) AS cnt FROM [${tbl}]`);
        countMap[tbl] = res[0]?.cnt ?? 0;
      } catch {
        countMap[tbl] = -1; // error / inaccessible
      }
    });
    await Promise.all(countPromises);

    const enrichOutgoing = outgoing.map((r: any) => ({
      fkName: r.fk_name,
      column: r.parent_column,
      referencedTable: r.referenced_table,
      referencedColumn: r.referenced_column,
      rowCount: countMap[r.referenced_table] ?? -1,
      isMaestra: maestrasTables.has(r.referenced_table),
    }));

    const enrichIncoming = incoming.map((r: any) => ({
      fkName: r.fk_name,
      referencingTable: r.referencing_table,
      referencingColumn: r.referencing_column,
      column: r.referenced_column,
      rowCount: countMap[r.referencing_table] ?? -1,
      isMaestra: maestrasTables.has(r.referencing_table),
    }));

    // Sort: maestras first, then by table name
    const sortFn = (a: any, b: any) => {
      const tblA = a.referencedTable || a.referencingTable;
      const tblB = b.referencedTable || b.referencingTable;
      if (a.isMaestra && !b.isMaestra) return -1;
      if (!a.isMaestra && b.isMaestra) return 1;
      return tblA.localeCompare(tblB);
    };

    return {
      tableName: cleanTableName,
      outgoing: enrichOutgoing.sort(sortFn),
      incoming: enrichIncoming.sort(sortFn),
    };
  }
}
