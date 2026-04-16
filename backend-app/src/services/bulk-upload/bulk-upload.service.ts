import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as XLSX from 'xlsx';

export interface ColumnMeta {
  name: string;
  type: string;
  nullable: boolean;
  maxLength: number | null;
  isPrimaryKey: boolean;
  isIdentity: boolean;
  isComputed: boolean;
}

export interface ValidationError {
  row: number;
  column: string;
  value: any;
  message: string;
}

export interface BulkUploadResult {
  inserted: number;
  errors: number;
  total: number;
  rejectedRows: { row: number; data: Record<string, any>; error: string }[];
}

@Injectable()
export class BulkUploadService {
  constructor(private dataSource: DataSource) {}

  /**
   * Parse uploaded file (CSV or XLSX) and return rows + detected headers
   */
  parseFile(buffer: Buffer, originalName: string): { headers: string[]; rows: Record<string, any>[] } {
    const ext = (originalName || '').toLowerCase().split('.').pop();

    if (ext === 'csv') {
      return this.parseCsv(buffer);
    } else if (ext === 'xlsx' || ext === 'xls') {
      return this.parseExcel(buffer);
    } else {
      throw new BadRequestException('Formato no soportado. Use CSV o Excel (.xlsx/.xls)');
    }
  }

  private parseCsv(buffer: Buffer): { headers: string[]; rows: Record<string, any>[] } {
    // Handle BOM
    let content = buffer.toString('utf-8');
    if (content.charCodeAt(0) === 0xfeff) {
      content = content.slice(1);
    }

    const lines = content.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) {
      throw new BadRequestException('El archivo CSV debe tener al menos una fila de encabezados y una de datos');
    }

    const headers = this.parseCsvLine(lines[0]);
    const rows: Record<string, any>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      if (values.every(v => v === '')) continue; // skip empty rows
      const row: Record<string, any> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] !== undefined ? values[idx] : null;
      });
      rows.push(row);
    }

    return { headers, rows };
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          result.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
    }
    result.push(current.trim());
    return result;
  }

  private parseExcel(buffer: Buffer): { headers: string[]; rows: Record<string, any>[] } {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException('El archivo Excel no contiene hojas');
    }

    const sheet = workbook.Sheets[sheetName];
    const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    if (jsonData.length < 2) {
      throw new BadRequestException('El archivo Excel debe tener al menos una fila de encabezados y una de datos');
    }

    const headers = (jsonData[0] as any[]).map(h => String(h ?? '').trim()).filter(h => h);
    const rows: Record<string, any>[] = [];

    for (let i = 1; i < jsonData.length; i++) {
      const values = jsonData[i] as any[];
      if (!values || values.every(v => v === null || v === '')) continue;
      const row: Record<string, any> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] !== undefined ? values[idx] : null;
      });
      rows.push(row);
    }

    return { headers, rows };
  }

  /**
   * Get column metadata for a table
   */
  async getTableColumns(tableName: string): Promise<ColumnMeta[]> {
    const cleanTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    await this.validateTableExists(cleanTableName);

    const cols = await this.dataSource.query(`
      SELECT 
        c.name,
        TYPE_NAME(c.system_type_id) AS type,
        c.is_nullable AS nullable,
        c.max_length AS maxLength,
        c.is_identity AS isIdentity,
        c.is_computed AS isComputed,
        CASE WHEN pk.column_id IS NOT NULL THEN 1 ELSE 0 END AS isPrimaryKey
      FROM sys.columns c
      LEFT JOIN (
        SELECT ic.column_id, ic.object_id
        FROM sys.index_columns ic
        JOIN sys.indexes i ON i.object_id = ic.object_id AND i.index_id = ic.index_id
        WHERE i.is_primary_key = 1
      ) pk ON pk.object_id = c.object_id AND pk.column_id = c.column_id
      WHERE c.object_id = OBJECT_ID(@0)
      ORDER BY c.column_id
    `, [cleanTableName]);

    return cols.map((c: any) => ({
      name: c.name,
      type: c.type,
      nullable: !!c.nullable,
      maxLength: c.maxLength,
      isPrimaryKey: !!c.isPrimaryKey,
      isIdentity: !!c.isIdentity,
      isComputed: !!c.isComputed,
    }));
  }

  /**
   * Get insertable columns (exclude identity, computed, timestamp)
   */
  async getInsertableColumns(tableName: string): Promise<ColumnMeta[]> {
    const cols = await this.getTableColumns(tableName);
    return cols.filter(c =>
      !c.isIdentity &&
      !c.isComputed &&
      c.type.toLowerCase() !== 'timestamp',
    );
  }

  /**
   * Auto-map file headers to table columns using exact/fuzzy match
   */
  autoMapColumns(
    fileHeaders: string[],
    tableColumns: ColumnMeta[],
  ): Record<string, string> {
    const mapping: Record<string, string> = {};
    const tableColNames = tableColumns.map(c => c.name);

    for (const fh of fileHeaders) {
      const lower = fh.toLowerCase().trim();

      // Exact match (case-insensitive)
      const exact = tableColNames.find(tc => tc.toLowerCase() === lower);
      if (exact) {
        mapping[fh] = exact;
        continue;
      }

      // Partial match: file header contains table col name or vice versa
      const partial = tableColNames.find(tc =>
        lower.includes(tc.toLowerCase()) || tc.toLowerCase().includes(lower),
      );
      if (partial) {
        mapping[fh] = partial;
      }
      // If no match, don't include → user maps manually
    }

    return mapping;
  }

  /**
   * Validate data rows against column metadata
   */
  validateRows(
    rows: Record<string, any>[],
    mapping: Record<string, string>,
    tableColumns: ColumnMeta[],
  ): { validRows: Record<string, any>[]; errors: ValidationError[] } {
    const errors: ValidationError[] = [];
    const validRows: Record<string, any>[] = [];
    const colMap = new Map(tableColumns.map(c => [c.name, c]));

    // Build reverse map: tableCol -> fileHeader
    const reverseMap = new Map<string, string>();
    for (const [fileH, tableC] of Object.entries(mapping)) {
      reverseMap.set(tableC, fileH);
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const mappedRow: Record<string, any> = {};
      let rowValid = true;

      for (const [fileHeader, tableCol] of Object.entries(mapping)) {
        const col = colMap.get(tableCol);
        if (!col) continue;

        let value = row[fileHeader];

        // Convert empty string to null
        if (value === '' || value === undefined) value = null;

        // Not-null validation
        if (value === null && !col.nullable && !col.isIdentity && !col.isPrimaryKey) {
          errors.push({
            row: i + 1,
            column: tableCol,
            value,
            message: `La columna "${tableCol}" no permite nulos`,
          });
          rowValid = false;
          continue;
        }

        // Type coercion
        if (value !== null) {
          value = this.coerceValue(value, col.type);
        }

        mappedRow[tableCol] = value;
      }

      if (rowValid) {
        validRows.push(mappedRow);
      }
    }

    return { validRows, errors };
  }

  private coerceValue(value: any, type: string): any {
    const t = type.toLowerCase();

    if (t.includes('int') || t.includes('decimal') || t.includes('numeric') ||
        t.includes('float') || t.includes('money') || t.includes('real')) {
      const num = Number(value);
      return isNaN(num) ? value : num;
    }

    if (t.includes('bit')) {
      if (typeof value === 'boolean') return value;
      const str = String(value).toLowerCase();
      if (str === '1' || str === 'true' || str === 'si' || str === 'sí' || str === 'yes') return true;
      if (str === '0' || str === 'false' || str === 'no') return false;
      return value;
    }

    if (t.includes('date') || t.includes('time')) {
      // Excel serial dates
      if (typeof value === 'number' && value > 25000 && value < 65000) {
        const excelEpoch = new Date(1899, 11, 30);
        const d = new Date(excelEpoch.getTime() + value * 86400000);
        return d.toISOString();
      }
      return value;
    }

    return String(value);
  }

  /**
   * Execute batch insert with transactions
   */
  async executeBulkInsert(
    tableName: string,
    rows: Record<string, any>[],
    batchSize: number = 500,
  ): Promise<BulkUploadResult> {
    const cleanTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    await this.validateTableExists(cleanTableName);

    const result: BulkUploadResult = {
      inserted: 0,
      errors: 0,
      total: rows.length,
      rejectedRows: [],
    };

    if (rows.length === 0) return result;

    // Get all columns from first row for consistent INSERT
    const columns = Object.keys(rows[0]);
    const cleanColumns = columns.map(c => c.replace(/[^a-zA-Z0-9_]/g, ''));
    const columnList = cleanColumns.map(c => `[${c}]`).join(', ');

    // Process in batches
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);

      // Insert row by row within a transaction for partial rollback
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        for (let j = 0; j < batch.length; j++) {
          const row = batch[j];
          const values = columns.map(c => row[c]);
          const paramPlaceholders = values.map((_, idx) => `@${idx}`).join(', ');
          const query = `INSERT INTO [${cleanTableName}] (${columnList}) VALUES (${paramPlaceholders})`;

          try {
            await queryRunner.query(query, values);
            result.inserted++;
          } catch (err) {
            result.errors++;
            result.rejectedRows.push({
              row: i + j + 1,
              data: row,
              error: err.message || 'Error desconocido',
            });
          }
        }

        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        // Mark entire batch as failed
        for (let j = 0; j < batch.length; j++) {
          if (!result.rejectedRows.find(r => r.row === i + j + 1)) {
            result.errors++;
            result.rejectedRows.push({
              row: i + j + 1,
              data: batch[j],
              error: `Error en lote: ${err.message}`,
            });
          }
        }
      } finally {
        await queryRunner.release();
      }
    }

    return result;
  }

  /**
   * Generate a CSV template for a table (empty CSV with correct headers)
   */
  async generateTemplate(tableName: string): Promise<string> {
    const cols = await this.getInsertableColumns(tableName);
    const headers = cols.map(c => c.name);

    // Header row + type hints row
    const typeRow = cols.map(c => {
      let hint = c.type;
      if (c.maxLength && c.maxLength > 0 && c.maxLength < 8000) hint += `(${c.maxLength})`;
      if (!c.nullable) hint += ' *REQUERIDO';
      return hint;
    });

    return headers.join(',') + '\r\n' + typeRow.join(',') + '\r\n';
  }

  /**
   * Dry run: validate without inserting
   */
  async dryRun(
    tableName: string,
    rows: Record<string, any>[],
    mapping: Record<string, string>,
  ): Promise<{ validRows: Record<string, any>[]; errors: ValidationError[]; preview: Record<string, any>[] }> {
    const cols = await this.getInsertableColumns(tableName);
    const { validRows, errors } = this.validateRows(rows, mapping, cols);
    const preview = validRows.slice(0, 20); // First 20 rows for preview
    return { validRows, errors, preview };
  }

  private async validateTableExists(cleanTableName: string): Promise<void> {
    const tableExists = await this.dataSource.query(`
      SELECT COUNT(*) as cnt
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = @0 AND TABLE_TYPE = 'BASE TABLE'
    `, [cleanTableName]);
    if (tableExists[0].cnt === 0) {
      throw new BadRequestException(`La tabla '${cleanTableName}' no existe`);
    }
  }
}
