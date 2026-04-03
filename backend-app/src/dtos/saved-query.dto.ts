import { IsString, IsArray, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiHideProperty } from '@nestjs/swagger';

export class CreateSavedQueryDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Nombre descriptivo de la consulta',
    example: 'Conceptos principales',
  })
  nombre: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Nombre de la tabla desde donde extraer datos',
    example: 't145_mc_conceptos',
  })
  tableName: string;

  @IsNotEmpty()
  @IsArray()
  @ApiProperty({
    description: 'Array de nombres de columnas a seleccionar',
    example: ['f145_id', 'f145_descripcion', 'f145_id_modulo', 'f145_ind_naturaleza'],
    isArray: true,
    items: { type: 'string' },
  })
  columnNames: string[];

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Descripción opcional de la consulta',
    example: 'Consulta para obtener conceptos principales del sistema',
    required: false,
  })
  description?: string;

  @IsOptional()
  @ApiHideProperty()
  filtros?: Record<string, any>;
}

export class UpdateSavedQueryDto {
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Nuevo nombre para la consulta',
    example: 'Conceptos principales (actualizado)',
    required: false,
  })
  nombre?: string;

  @IsOptional()
  @IsArray()
  @ApiProperty({
    description: 'Nuevas columnas a seleccionar',
    example: ['f145_id', 'f145_descripcion', 'f145_id_modulo'],
    isArray: true,
    items: { type: 'string' },
    required: false,
  })
  columnNames?: string[];

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Nueva descripción',
    example: 'Actualizado: Consulta para conceptos del módulo de ventas',
    required: false,
  })
  description?: string;

  @IsOptional()
  @ApiHideProperty()
  filtros?: Record<string, any>;
}
