import { Controller, Get, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { MaestrasService } from '../../services/maestras/maestras.service';

@ApiTags('Maestras')
@Controller('maestras')
export class MaestrasController {
  constructor(private readonly maestrasService: MaestrasService) {}

  /**
   * GET /api/maestras
   * Retorna la configuración de maestras agrupadas por dominio
   */
  @ApiOperation({ summary: 'Obtener configuración de maestras con conteo de registros' })
  @ApiResponse({ status: 200, description: 'Maestras obtenidas exitosamente' })
  @Get()
  async getMaestras() {
    try {
      return await this.maestrasService.getMaestrasConfig();
    } catch (error) {
      throw new HttpException(
        { statusCode: error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR, message: error.message },
        error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/maestras/structure/:tableName
   * Obtiene la estructura de columnas de una tabla
   */
  @ApiOperation({ summary: 'Obtener estructura de columnas de una tabla' })
  @Get('structure/:tableName')
  async getTableStructure(@Param('tableName') tableName: string) {
    try {
      const columns = await this.maestrasService.getTableStructure(tableName);
      return { tableName, columns };
    } catch (error) {
      throw new HttpException(
        { statusCode: error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR, message: error.message },
        error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /api/maestras/producto
   * Crea un producto completo (item + extensiones + precio + existencia) en transacción
   */
  @ApiOperation({ summary: 'Crear producto completo con transacción' })
  @ApiBody({
    description: 'Datos del producto: item (requerido), extensiones, precio, existencia',
    schema: {
      type: 'object',
      properties: {
        item: { type: 'object', description: 'Datos para t120_mc_items' },
        extensiones: { type: 'object', description: 'Datos para t121_mc_items_extensiones' },
        precio: { type: 'object', description: 'Datos para t126_mc_items_precios' },
        existencia: { type: 'object', description: 'Datos para t400_cm_existencia' },
      },
      required: ['item'],
    },
  })
  @Post('producto')
  async createProducto(
    @Body() data: {
      item: Record<string, any>;
      extensiones?: Record<string, any>;
      precio?: Record<string, any>;
      existencia?: Record<string, any>;
    },
  ) {
    try {
      if (!data.item || Object.keys(data.item).length === 0) {
        throw new HttpException(
          { statusCode: 400, message: 'Se requiere al menos los datos del ítem' },
          HttpStatus.BAD_REQUEST,
        );
      }
      return await this.maestrasService.createProducto(data);
    } catch (error) {
      throw new HttpException(
        { statusCode: error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR, message: error.message },
        error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
