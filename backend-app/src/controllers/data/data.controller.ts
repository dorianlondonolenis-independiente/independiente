import { Controller, Get, Post, Put, Delete, Param, Query, Body, HttpException, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiBody } from '@nestjs/swagger';
import { DataService } from '../../services/data/data.service';
import type { Response } from 'express';

@ApiTags('Data')
@Controller('data')
export class DataController {
  constructor(private readonly dataService: DataService) {}

  /**
   * GET /api/data/search/global
   * Búsqueda global en múltiples tablas
   */
  @ApiOperation({ summary: 'Búsqueda global en múltiples tablas' })
  @ApiQuery({ name: 'q', description: 'Término a buscar', required: true })
  @Get('search/global')
  async globalSearch(@Query('q') term: string) {
    try {
      if (!term || term.length < 2) {
        return { results: [], message: 'El término debe tener al menos 2 caracteres' };
      }
      const results = await this.dataService.globalSearch(term);
      return { results, total: results.reduce((acc, r) => acc + r.matches, 0) };
    } catch (error) {
      throw new HttpException(
        { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

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
   * GET /api/data/:tableName/export-csv
   * Exporta los datos de una tabla como CSV
   */
  @ApiOperation({ summary: 'Exportar datos de tabla como CSV' })
  @ApiParam({ name: 'tableName', description: 'Nombre de la tabla' })
  @Get(':tableName/export-csv')
  async exportCsv(@Param('tableName') tableName: string, @Res() res: Response) {
    try {
      const csv = await this.dataService.exportTableCsv(tableName);
      const cleanName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${cleanName}.csv"`);
      res.send('\uFEFF' + csv); // BOM for Excel UTF-8 compat
    } catch (error) {
      throw new HttpException(
        { statusCode: error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR, message: error.message },
        error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/data/:tableName/relations
   * Obtiene las relaciones FK de una tabla
   */
  @ApiOperation({ summary: 'Obtener relaciones FK de una tabla' })
  @ApiParam({ name: 'tableName', description: 'Nombre de la tabla' })
  @Get(':tableName/relations')
  async getRelations(@Param('tableName') tableName: string) {
    try {
      return await this.dataService.getTableRelations(tableName);
    } catch (error) {
      throw new HttpException(
        { statusCode: error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR, message: error.message },
        error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/data/:tableName/primary-keys
   * Obtiene las primary keys de una tabla (MUST be before :idField/:idValue)
   */
  @ApiOperation({ summary: 'Obtener primary keys de una tabla' })
  @ApiParam({ name: 'tableName', description: 'Nombre de la tabla' })
  @Get(':tableName/primary-keys')
  async getPrimaryKeys(@Param('tableName') tableName: string) {
    try {
      const keys = await this.dataService.getTablePrimaryKeys(tableName);
      return { tableName, primaryKeys: keys };
    } catch (error) {
      throw new HttpException(
        { statusCode: error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR, message: error.message },
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

  /**
   * POST /api/data/:tableName
   * Crea un registro en la tabla
   */
  @ApiOperation({ summary: 'Crear un registro en una tabla' })
  @ApiParam({ name: 'tableName', description: 'Nombre de la tabla' })
  @ApiBody({ description: 'Datos del registro', schema: { type: 'object' } })
  @Post(':tableName')
  async createRecord(
    @Param('tableName') tableName: string,
    @Body() data: Record<string, any>,
  ) {
    try {
      const record = await this.dataService.createRecord(tableName, data);
      return { success: true, record };
    } catch (error) {
      throw new HttpException(
        { statusCode: error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR, message: error.message },
        error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * PUT /api/data/:tableName/by-row
   * Actualiza un registro usando todos los campos originales en el WHERE
   * Body: { original: {...}, updated: {...} }
   */
  @ApiOperation({ summary: 'Actualizar registro por todas las columnas (sin PK)' })
  @ApiParam({ name: 'tableName', description: 'Nombre de la tabla' })
  @ApiBody({ description: '{ original: datos originales, updated: datos nuevos }' })
  @Put(':tableName/by-row')
  async updateRecordByRow(
    @Param('tableName') tableName: string,
    @Body() body: { original: Record<string, any>; updated: Record<string, any> },
  ) {
    try {
      if (!body.original || !body.updated) {
        throw new HttpException(
          { statusCode: 400, message: 'Se requiere "original" y "updated" en el body' },
          HttpStatus.BAD_REQUEST,
        );
      }
      const record = await this.dataService.updateRecordByRow(tableName, body.original, body.updated);
      if (!record) {
        throw new HttpException({ statusCode: 404, message: 'Registro no encontrado' }, HttpStatus.NOT_FOUND);
      }
      return { success: true, record };
    } catch (error) {
      throw new HttpException(
        { statusCode: error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR, message: error.message },
        error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * PUT /api/data/:tableName/:idField/:idValue
   * Actualiza un registro por PK
   */
  @ApiOperation({ summary: 'Actualizar un registro' })
  @ApiParam({ name: 'tableName', description: 'Nombre de la tabla' })
  @ApiParam({ name: 'idField', description: 'Campo identificador' })
  @ApiParam({ name: 'idValue', description: 'Valor del identificador' })
  @ApiBody({ description: 'Datos a actualizar', schema: { type: 'object' } })
  @Put(':tableName/:idField/:idValue')
  async updateRecord(
    @Param('tableName') tableName: string,
    @Param('idField') idField: string,
    @Param('idValue') idValue: string,
    @Body() data: Record<string, any>,
  ) {
    try {
      const record = await this.dataService.updateRecord(tableName, idField, idValue, data);
      if (!record) {
        throw new HttpException({ statusCode: 404, message: 'Registro no encontrado' }, HttpStatus.NOT_FOUND);
      }
      return { success: true, record };
    } catch (error) {
      throw new HttpException(
        { statusCode: error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR, message: error.message },
        error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /api/data/:tableName/delete-by-row
   * Elimina un registro usando todos los campos en el WHERE (POST porque DELETE no acepta body en todos los clientes)
   * Body: { conditions: {...} }
   */
  @ApiOperation({ summary: 'Eliminar registro por todas las columnas (sin PK)' })
  @ApiParam({ name: 'tableName', description: 'Nombre de la tabla' })
  @ApiBody({ description: '{ conditions: datos del registro a eliminar }' })
  @Post(':tableName/delete-by-row')
  async deleteRecordByRow(
    @Param('tableName') tableName: string,
    @Body() body: { conditions: Record<string, any> },
  ) {
    try {
      if (!body.conditions) {
        throw new HttpException(
          { statusCode: 400, message: 'Se requiere "conditions" en el body' },
          HttpStatus.BAD_REQUEST,
        );
      }
      const record = await this.dataService.deleteRecordByRow(tableName, body.conditions);
      if (!record) {
        throw new HttpException({ statusCode: 404, message: 'Registro no encontrado' }, HttpStatus.NOT_FOUND);
      }
      return { success: true, deleted: record };
    } catch (error) {
      throw new HttpException(
        { statusCode: error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR, message: error.message },
        error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * DELETE /api/data/:tableName/:idField/:idValue
   * Elimina un registro por PK
   */
  @ApiOperation({ summary: 'Eliminar un registro' })
  @ApiParam({ name: 'tableName', description: 'Nombre de la tabla' })
  @ApiParam({ name: 'idField', description: 'Campo identificador' })
  @ApiParam({ name: 'idValue', description: 'Valor del identificador' })
  @Delete(':tableName/:idField/:idValue')
  async deleteRecord(
    @Param('tableName') tableName: string,
    @Param('idField') idField: string,
    @Param('idValue') idValue: string,
  ) {
    try {
      const record = await this.dataService.deleteRecord(tableName, idField, idValue);
      if (!record) {
        throw new HttpException({ statusCode: 404, message: 'Registro no encontrado' }, HttpStatus.NOT_FOUND);
      }
      return { success: true, deleted: record };
    } catch (error) {
      throw new HttpException(
        { statusCode: error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR, message: error.message },
        error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
