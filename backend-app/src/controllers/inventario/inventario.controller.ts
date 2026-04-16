import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { InventarioService } from '../../services/inventario/inventario.service';

@ApiTags('Inventario')
@Controller('inventario')
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  @ApiOperation({ summary: 'Consulta de stock por producto y bodega con filtros' })
  @ApiQuery({ name: 'bodega', required: false, description: 'Filtrar por ID de bodega' })
  @ApiQuery({ name: 'buscar', required: false, description: 'Buscar por referencia o descripción' })
  @ApiQuery({ name: 'soloConStock', required: false, description: 'Solo productos con stock > 0' })
  @ApiQuery({ name: 'bajosMinimo', required: false, description: 'Solo productos bajo nivel mínimo' })
  @ApiQuery({ name: 'sinMovimiento', required: false, description: 'Días sin movimiento' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @Get('stock')
  async getStock(
    @Query('bodega') bodega?: string,
    @Query('buscar') buscar?: string,
    @Query('soloConStock') soloConStock?: string,
    @Query('bajosMinimo') bajosMinimo?: string,
    @Query('sinMovimiento') sinMovimiento?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      return await this.inventarioService.getStockResumen({
        bodega,
        buscar,
        soloConStock: soloConStock === 'true',
        bajosMinimo: bajosMinimo === 'true',
        sinMovimiento: sinMovimiento ? parseInt(sinMovimiento, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : 100,
        offset: offset ? parseInt(offset, 10) : 0,
      });
    } catch (error) {
      throw new HttpException(
        { statusCode: error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR, message: error.message },
        error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Estadísticas generales de inventario' })
  @Get('stats')
  async getStats() {
    try {
      return await this.inventarioService.getStockStats();
    } catch (error) {
      throw new HttpException(
        { statusCode: error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR, message: error.message },
        error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Lista de bodegas para filtros' })
  @Get('bodegas')
  async getBodegas() {
    try {
      return await this.inventarioService.getBodegas();
    } catch (error) {
      throw new HttpException(
        { statusCode: error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR, message: error.message },
        error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Stock agrupado por bodega' })
  @Get('stock-por-bodega')
  async getStockPorBodega() {
    try {
      return await this.inventarioService.getStockPorBodega();
    } catch (error) {
      throw new HttpException(
        { statusCode: error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR, message: error.message },
        error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
