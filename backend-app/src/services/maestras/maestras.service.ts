import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface MaestraConfig {
  key: string;
  label: string;
  tables: {
    name: string;
    label: string;
    description: string;
    rowCount?: number;
  }[];
}

@Injectable()
export class MaestrasService {
  constructor(private dataSource: DataSource) {}

  /**
   * Retorna las maestras agrupadas por dominio con conteo de registros
   */
  async getMaestrasConfig(): Promise<MaestraConfig[]> {
    const maestras: MaestraConfig[] = [
      {
        key: 'inventario',
        label: 'Inventario',
        tables: [
          { name: 't120_mc_items', label: 'Ítems / Productos', description: 'Maestro principal de ítems' },
          { name: 't121_mc_items_extensiones', label: 'Extensiones de Ítems', description: 'Atributos extendidos de cada ítem' },
          { name: 't126_mc_items_precios', label: 'Precios', description: 'Listas de precios por ítem' },
          { name: 't400_cm_existencia', label: 'Existencias / Stock', description: 'Stock actual por bodega' },
          { name: 't401_cm_existencia_lote', label: 'Existencia por Lote', description: 'Inventario desglosado por lote' },
          { name: 't402_cm_costos', label: 'Costos', description: 'Costos por ítem, instalación y segmento' },
          { name: 't150_mc_bodegas', label: 'Bodegas', description: 'Maestro de bodegas/almacenes' },
        ],
      },
      {
        key: 'terceros',
        label: 'Terceros',
        tables: [
          { name: 't200_mm_terceros', label: 'Terceros', description: 'Clientes, proveedores y empleados' },
          { name: 't201_mm_clientes', label: 'Clientes', description: 'Detalle de clientes y condiciones comerciales' },
          { name: 't202_mm_proveedores', label: 'Proveedores', description: 'Detalle de proveedores' },
        ],
      },
      {
        key: 'comercial',
        label: 'Comercial',
        tables: [
          { name: 't420_cm_oc_docto', label: 'Órdenes de Compra', description: 'Documentos de órdenes de compra' },
          { name: 't430_cm_pv_docto', label: 'Pedidos de Venta', description: 'Documentos de pedidos de venta' },
        ],
      },
      {
        key: 'configuracion',
        label: 'Configuración',
        tables: [
          { name: 't116_mc_extensiones1', label: 'Extensiones Tipo 1', description: 'Definición de extensiones tipo 1' },
          { name: 't117_mc_extensiones1_detalle', label: 'Detalle Extensiones 1', description: 'Valores de extensiones tipo 1' },
          { name: 't118_mc_extensiones2', label: 'Extensiones Tipo 2', description: 'Definición de extensiones tipo 2' },
          { name: 't119_mc_extensiones2_detalle', label: 'Detalle Extensiones 2', description: 'Valores de extensiones tipo 2' },
          { name: 't145_mc_conceptos', label: 'Conceptos', description: 'Maestro de conceptos' },
        ],
      },
    ];

    // Obtener conteo de registros para cada tabla
    for (const grupo of maestras) {
      for (const tabla of grupo.tables) {
        try {
          const result = await this.dataSource.query(
            `SELECT COUNT(*) as cnt FROM [${tabla.name}]`,
          );
          tabla.rowCount = result[0]?.cnt || 0;
        } catch {
          tabla.rowCount = 0;
        }
      }
    }

    return maestras;
  }

  /**
   * Obtiene la estructura (columnas) de un conjunto de tablas relacionadas
   */
  async getTableStructure(tableName: string): Promise<any> {
    const cleanName = tableName.replace(/[^a-zA-Z0-9_]/g, '');

    const columns = await this.dataSource.query(`
      SELECT 
        c.name,
        t.name as type,
        c.max_length,
        c.is_nullable,
        c.is_identity,
        c.is_computed,
        dc.definition as default_value
      FROM sys.columns c
      JOIN sys.types t ON c.user_type_id = t.user_type_id
      LEFT JOIN sys.default_constraints dc ON c.default_object_id = dc.object_id
      WHERE c.object_id = OBJECT_ID(@0)
      ORDER BY c.column_id
    `, [cleanName]);

    return columns;
  }

  /**
   * Crea un producto completo con transacción (item + extensiones + precio + stock)
   */
  async createProducto(data: {
    item: Record<string, any>;
    extensiones?: Record<string, any>;
    precio?: Record<string, any>;
    existencia?: Record<string, any>;
  }): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const results: Record<string, any> = {};

      // 1. Insertar en t120_mc_items
      const itemResult = await this.insertRecord(queryRunner, 't120_mc_items', data.item);
      results.item = itemResult;

      const itemRowId = itemResult?.f120_rowid;
      if (!itemRowId) {
        throw new BadRequestException('No se pudo obtener el rowid del ítem creado');
      }

      // 2. Insertar extensiones (si se proporcionan)
      if (data.extensiones && Object.keys(data.extensiones).length > 0) {
        const extData = { ...data.extensiones, f121_rowid_item: itemRowId };
        const extResult = await this.insertRecord(queryRunner, 't121_mc_items_extensiones', extData);
        results.extensiones = extResult;

        // 3. Insertar precio (necesita el rowid de la extensión)
        if (data.precio && Object.keys(data.precio).length > 0) {
          const extRowId = extResult?.f121_rowid;
          const precioData = { ...data.precio, f126_rowid_item: extRowId || itemRowId };
          const precioResult = await this.insertRecord(queryRunner, 't126_mc_items_precios', precioData);
          results.precio = precioResult;
        }

        // 4. Insertar existencia (necesita el rowid de la extensión)
        if (data.existencia && Object.keys(data.existencia).length > 0) {
          const extRowId = extResult?.f121_rowid;
          if (extRowId) {
            const existData = { ...data.existencia, f400_rowid_item_ext: extRowId };
            const existResult = await this.insertRecord(queryRunner, 't400_cm_existencia', existData);
            results.existencia = existResult;
          }
        }
      } else {
        // Sin extensiones, insertar precio y existencia con el rowid del item
        if (data.precio && Object.keys(data.precio).length > 0) {
          const precioData = { ...data.precio, f126_rowid_item: itemRowId };
          const precioResult = await this.insertRecord(queryRunner, 't126_mc_items_precios', precioData);
          results.precio = precioResult;
        }
      }

      await queryRunner.commitTransaction();
      return { success: true, results };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(`Error al crear producto: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Inserta un registro usando el queryRunner (dentro de transacción)
   */
  private async insertRecord(
    queryRunner: any,
    tableName: string,
    data: Record<string, any>,
  ): Promise<any> {
    const cleanTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');

    // Obtener columnas válidas excluyendo identity, timestamp y computed
    const cols = await queryRunner.query(`
      SELECT c.name
      FROM sys.columns c
      WHERE c.object_id = OBJECT_ID('${cleanTableName}')
        AND c.is_identity = 0
        AND c.is_computed = 0
        AND TYPE_NAME(c.system_type_id) <> 'timestamp'
    `);
    const validColumns = cols.map((c: any) => c.name);

    // Filtrar columnas válidas y no vacías
    const entries = Object.entries(data).filter(([key, val]) => {
      const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, '');
      return validColumns.includes(cleanKey) && val !== undefined && val !== '';
    });

    if (entries.length === 0) {
      throw new BadRequestException(`No hay columnas válidas para insertar en ${cleanTableName}`);
    }

    const columns = entries.map(([key]) => `[${key.replace(/[^a-zA-Z0-9_]/g, '')}]`).join(', ');
    const paramPlaceholders = entries.map((_, i) => `@${i}`).join(', ');
    const values = entries.map(([, val]) => val);

    const query = `INSERT INTO [${cleanTableName}] (${columns}) OUTPUT INSERTED.* VALUES (${paramPlaceholders})`;
    const result = await queryRunner.query(query, values);
    return result[0] || null;
  }
}
