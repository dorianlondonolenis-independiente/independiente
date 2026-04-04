import { Controller, Get, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { DataService } from '../../services/data/data.service';

@ApiTags('Data')
@Controller('data')
export class DataController {
  constructor(private readonly dataService: DataService) {}

  /**
   * GET /api/data/:tableName
   * Obtiene todos los registros de una tabla con paginación
   * Query params: limit (default: 100), offset (default: 0)
   */
  @ApiOperation({ summary: 'Obtener datos de una tabla con paginación' })
  @ApiParam({ name: 'tableName', description: 'Nombre de la tabla', example: 't145_mc_conceptos' })
  @ApiQuery({ name: 'limit', description: 'Cantidad de registros', required: false, example: 100 })
  @ApiQuery({ name: 'offset', description: 'Desplazamiento', required: false, example: 0 })
  @ApiResponse({ status: 200, description: 'Datos obtenidos exitosamente' })
  @Get(':tableName')
  async getTableData(
    @Param('tableName') tableName: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      const parsedLimit = limit ? parseInt(limit, 10) : 100;
      const parsedOffset = offset ? parseInt(offset, 10) : 0;

      // Validar que limit no sea muy grande
      if (parsedLimit > 10000) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'El límite máximo es 10000 registros',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // El servicio ahora retorna el formato requerido directamente
      return await this.dataService.getTableData(tableName, parsedLimit, parsedOffset);
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message || 'Error al obtener datos',
          error: error.response?.error || error.message,
        },
        error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/data/:tableName/:idField/:idValue
   * Obtiene un registro específico de una tabla
   */
  @ApiOperation({ summary: 'Obtener un registro específico' })
  @ApiParam({ name: 'tableName', description: 'Nombre de la tabla', example: 't145_mc_conceptos' })
  @ApiParam({ name: 'idField', description: 'Campo identificador', example: 'id' })
  @ApiParam({ name: 'idValue', description: 'Valor del identificador', example: '1' })
  @ApiResponse({ status: 200, description: 'Registro obtenido' })
  @Get(':tableName/:idField/:idValue')
  async getTableDataById(
    @Param('tableName') tableName: string,
    @Param('idField') idField: string,
    @Param('idValue') idValue: string,
  ) {
    try {
      const record = await this.dataService.getTableDataById(tableName, idField, idValue);

      return {
        table: tableName,
        record: record || null,
        found: record ? true : false,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message || 'Error al obtener registro',
        },
        error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
