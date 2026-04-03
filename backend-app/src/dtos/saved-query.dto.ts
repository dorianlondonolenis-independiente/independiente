import { IsString, IsArray, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateSavedQueryDto {
  @IsNotEmpty()
  @IsString()
  nombre: string;

  @IsNotEmpty()
  @IsString()
  tableName: string;

  @IsNotEmpty()
  @IsArray()
  columnNames: string[]; // Array de nombres de columnas

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  filtros?: Record<string, any>; // Objeto con filtros opcionales
}

export class UpdateSavedQueryDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsArray()
  columnNames?: string[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  filtros?: Record<string, any>;
}
