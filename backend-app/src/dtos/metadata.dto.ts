export class ColumnMetadataDto {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isIdentity: boolean;
  maxLength?: number;
}

export class TableMetadataDto {
  name: string;
  schema: string;
  rowCount: number;
  columns: ColumnMetadataDto[];
}

export class DatabaseMetadataDto {
  database: string;
  tables: TableMetadataDto[];
  totalTables: number;
}
