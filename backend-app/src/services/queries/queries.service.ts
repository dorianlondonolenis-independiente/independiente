import { Injectable } from '@nestjs/common';
import { DataSourceOptions, DataSource } from 'typeorm';
import { SavedQuery } from 'src/entities/saved-query.entity';
import { CreateSavedQueryDto, UpdateSavedQueryDto } from 'src/dtos/saved-query.dto';

@Injectable()
export class QueriesService {
  private sqlServerDataSource: DataSource;

  constructor() {
    // Inicializar conexión a SQL Server
    const options: DataSourceOptions = {
      type: 'mssql',
      host: process.env.DB_HOST || '10.10.1.48',
      username: process.env.DB_USERNAME || 'sa',
      password: process.env.DB_PASSWORD || 'Sa123456',
      database: process.env.DB_NAME || 'UnoEE',
      port: parseInt(process.env.DB_PORT || '1433', 10),
      entities: [SavedQuery],
      synchronize: false,
      options: {
        encrypt: false,
        trustServerCertificate: false,
        enableArithAbort: true,
      },
    };

    this.sqlServerDataSource = new DataSource(options);
    this.sqlServerDataSource.initialize().catch((err) => {
      console.error('Error initializing SQL Server DataSource for Queries:', err);
    });
  }

  /**
   * Crear una nueva consulta rápida
   */
  async createQuery(dto: CreateSavedQueryDto): Promise<SavedQuery> {
    const queryRepository = this.sqlServerDataSource.getRepository(SavedQuery);

    const newQuery = new SavedQuery();
    newQuery.nombre = dto.nombre;
    newQuery.tableName = dto.tableName;
    newQuery.columnNames = JSON.stringify(dto.columnNames);
    newQuery.filtros = dto.filtros ? JSON.stringify(dto.filtros) : null;
    newQuery.description = dto.description || null;

    return await queryRepository.save(newQuery);
  }

  /**
   * Obtener todas las consultas guardadas
   */
  async getAllQueries(): Promise<SavedQuery[]> {
    const queryRepository = this.sqlServerDataSource.getRepository(SavedQuery);
    return await queryRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Obtener una consulta por ID
   */
  async getQueryById(id: number): Promise<SavedQuery | null> {
    const queryRepository = this.sqlServerDataSource.getRepository(SavedQuery);
    return await queryRepository.findOneBy({ id });
  }

  /**
   * Actualizar una consulta
   */
  async updateQuery(id: number, dto: UpdateSavedQueryDto): Promise<SavedQuery> {
    const queryRepository = this.sqlServerDataSource.getRepository(SavedQuery);

    const query = await queryRepository.findOneBy({ id });
    if (!query) {
      throw new Error(`Query with ID ${id} not found`);
    }

    if (dto.nombre) query.nombre = dto.nombre;
    if (dto.columnNames) query.columnNames = JSON.stringify(dto.columnNames);
    if (dto.description) query.description = dto.description;
    if (dto.filtros) query.filtros = JSON.stringify(dto.filtros);

    return await queryRepository.save(query);
  }

  /**
   * Eliminar una consulta
   */
  async deleteQuery(id: number): Promise<{ message: string }> {
    const queryRepository = this.sqlServerDataSource.getRepository(SavedQuery);

    const query = await queryRepository.findOneBy({ id });
    if (!query) {
      throw new Error(`Query with ID ${id} not found`);
    }

    await queryRepository.remove(query);
    return { message: `Query ${id} deleted successfully` };
  }

  /**
   * Ejecutar una consulta guardada retornando solo sus columnas seleccionadas
   * @param id ID de la consulta guardada
   * @param limit Número de registros a retornar (default: 100)
   * @param offset Desplazamiento (default: 0)
   */
  async executeQuery(
    id: number,
    limit: number = 100,
    offset: number = 0,
  ): Promise<any[]> {
    const queryRepository = this.sqlServerDataSource.getRepository(SavedQuery);

    const query = await queryRepository.findOneBy({ id });
    if (!query) {
      throw new Error(`Query with ID ${id} not found`);
    }

    const tableName = query.tableName;
    const columnNames: string[] = JSON.parse(query.columnNames);
    const filtros = query.filtros ? JSON.parse(query.filtros) : null;

    // Sanitizar nombres de columnas
    const sanitizedColumns = columnNames.map((col) =>
      col.replace(/[^a-zA-Z0-9_]/g, ''),
    );

    // Construir columnas para SELECT
    const selectColumns = sanitizedColumns.join(', ');

    // Construir WHERE clause si hay filtros
    let whereClause = '';
    if (filtros) {
      const conditions = Object.entries(filtros).map(
        ([key, value]) => `${key} = '${String(value).replace(/'/g, "''")}'`,
      );
      whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    }

    // Construir query dinámico
    const sql = `
      SELECT TOP ${limit} OFFSET ${offset} ROWS
        ${selectColumns}
      FROM ${tableName}
      ${whereClause}
      ORDER BY (SELECT NULL)
    `;

    try {
      const result = await this.sqlServerDataSource.query(sql);
      return result;
    } catch (error) {
      throw new Error(`Error executing query: ${error.message}`);
    }
  }

  /**
   * Sanitizar nombre de tabla
   */
  private sanitizeTableName(tableName: string): string {
    return tableName.replace(/[^a-zA-Z0-9_]/g, '');
  }
}
