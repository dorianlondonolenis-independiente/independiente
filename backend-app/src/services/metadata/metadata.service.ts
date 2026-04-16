import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ColumnMetadataDto, TableMetadataDto, DatabaseMetadataDto } from '../../dtos/metadata.dto';

@Injectable()
export class MetadataService {
  constructor(private dataSource: DataSource) {}

  /**
   * Obtiene todas las tablas de la base de datos SQL Server
   */
  async getAllTables(): Promise<TableMetadataDto[]> {
    try {
      // Query para obtener todas las tablas de SQL Server
      const tablesQuery = `
        SELECT 
          TABLE_SCHEMA,
          TABLE_NAME
        FROM 
          INFORMATION_SCHEMA.TABLES
        WHERE 
          TABLE_TYPE = 'BASE TABLE'
        ORDER BY 
          TABLE_NAME
      `;

      const tables = await this.dataSource.query(tablesQuery);

      // Para cada tabla, obtener sus columnas e información
      const tablesWithColumns = await Promise.all(
        tables.map(async (table) => {
          const columnsData = await this.getTableColumns(table.TABLE_NAME);
          const rowCount = await this.getTableRowCount(table.TABLE_NAME);

          return {
            name: table.TABLE_NAME,
            schema: table.TABLE_SCHEMA,
            rowCount: rowCount,
            columns: columnsData,
          };
        }),
      );

      return tablesWithColumns;
    } catch (error) {
      console.error('Error al obtener tablas:', error);
      throw new Error(`No se pudieron obtener las tablas: ${error.message}`);
    }
  }

  /**
   * Obtiene las columnas de una tabla específica
   */
  async getTableColumns(tableName: string): Promise<ColumnMetadataDto[]> {
    try {
      // Sanitizar el nombre de tabla para evitar SQL injection
      const cleanTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
      
      const columnsQuery = `
        SELECT 
          c.name AS COLUMN_NAME,
          TYPE_NAME(c.system_type_id) AS DATA_TYPE,
          c.is_nullable AS IS_NULLABLE,
          c.max_length AS CHARACTER_MAXIMUM_LENGTH,
          c.is_identity,
          c.is_computed
        FROM sys.columns c
        WHERE c.object_id = OBJECT_ID('${cleanTableName}')
        ORDER BY c.column_id
      `;

      const columns = await this.dataSource.query(columnsQuery);

      // Obtener claves primarias por separado
      const pkQuery = `
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_NAME = '${cleanTableName}'
        AND OBJECTPROPERTY(OBJECT_ID(CONSTRAINT_NAME), 'IsPrimaryKey') = 1
      `;
      
      const primaryKeys = await this.dataSource.query(pkQuery);
      const pkSet = new Set(primaryKeys.map((pk) => pk.COLUMN_NAME));

      return columns.map((col) => ({
        name: col.COLUMN_NAME,
        type: col.DATA_TYPE,
        nullable: !!col.IS_NULLABLE,
        isPrimaryKey: pkSet.has(col.COLUMN_NAME),
        isIdentity: !!col.is_identity,
        isComputed: !!col.is_computed,
        maxLength: col.CHARACTER_MAXIMUM_LENGTH || undefined,
      }));
    } catch (error) {
      console.error(`Error al obtener columnas de ${tableName}:`, error);
      return [];
    }
  }

  /**
   * Obtiene la cantidad de filas en una tabla
   */
  async getTableRowCount(tableName: string): Promise<number> {
    try {
      // Sanitizar el nombre de tabla
      const cleanTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
      
      // Ejecutar el COUNT real con sintaxis segura
      const realCountQuery = `SELECT COUNT(*) as cnt FROM [${cleanTableName}]`;
      const realResult = await this.dataSource.query(realCountQuery);
      return realResult[0]?.cnt || 0;
    } catch (error) {
      console.error(`Error al obtener rowCount de ${tableName}:`, error);
      return 0;
    }
  }

  /**
   * Obtiene metadata completa de la base de datos
   */
  async getDatabaseMetadata(): Promise<DatabaseMetadataDto> {
    try {
      const tables = await this.getAllTables();
      const dbName = await this.dataSource.query('SELECT DB_NAME() AS dbName');

      return {
        database: dbName[0]?.dbName || 'Unknown',
        tables,
        totalTables: tables.length,
      };
    } catch (error) {
      console.error('Error al obtener metadata de la BD:', error);
      throw new Error(`No se pudo obtener metadata: ${error.message}`);
    }
  }
}
