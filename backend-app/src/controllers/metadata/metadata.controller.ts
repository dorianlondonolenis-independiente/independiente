import { Controller, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { MetadataService } from '../../services/metadata/metadata.service';
import { TableMetadataDto, DatabaseMetadataDto } from '../../dtos/metadata.dto';

@ApiTags('Metadata')
@Controller('metadata')
export class MetadataController {
  constructor(private readonly metadataService: MetadataService) {}

  /**
   * GET /api/metadata/tables
   * Obtiene todas las tablas de la base de datos
   */
  @ApiOperation({ summary: 'Obtener todas las tablas' })
  @ApiResponse({ status: 200, description: 'Lista de tablas obtenida exitosamente' })
  @Get('tables')
  async getAllTables(): Promise<TableMetadataDto[]> {
    try {
      return await this.metadataService.getAllTables();
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error al obtener las tablas',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/metadata/tables/:tableName/columns
   * Obtiene las columnas de una tabla específica
   */
  @ApiOperation({ summary: 'Obtener columnas de una tabla' })
  @ApiParam({ name: 'tableName', description: 'Nombre de la tabla', example: 't145_mc_conceptos' })
  @ApiResponse({ status: 200, description: 'Columnas obtenidas exitosamente' })
  @Get('tables/:tableName/columns')
  async getTableColumns(@Param('tableName') tableName: string) {
    try {
      const columns = await this.metadataService.getTableColumns(tableName);
      return {
        table: tableName,
        columns,
        totalColumns: columns.length,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: `Error al obtener columnas de ${tableName}`,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/metadata/tables/:tableName/row-count
   * Obtiene la cantidad de filas de una tabla
   */
  @ApiOperation({ summary: 'Obtener cantidad de registros de una tabla' })
  @ApiParam({ name: 'tableName', description: 'Nombre de la tabla', example: 't145_mc_conceptos' })
  @ApiResponse({ status: 200, description: 'Cantidad de registros obtenida' })
  @Get('tables/:tableName/row-count')
  async getTableRowCount(@Param('tableName') tableName: string) {
    try {
      const rowCount = await this.metadataService.getTableRowCount(tableName);
      return {
        table: tableName,
        rowCount,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: `Error al contar filas de ${tableName}`,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/metadata/database
   * Obtiene metadata completa de la base de datos
   */
  @ApiOperation({ summary: 'Obtener estructura completa de la base de datos' })
  @ApiResponse({ status: 200, description: 'Metadata completa de la base de datos' })
  @Get('database')
  async getDatabaseMetadata(): Promise<DatabaseMetadataDto> {
    try {
      return await this.metadataService.getDatabaseMetadata();
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error al obtener metadata de la base de datos',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
