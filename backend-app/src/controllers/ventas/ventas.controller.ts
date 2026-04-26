import { Controller, Get, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { VentasService } from '../../services/ventas/ventas.service';

@ApiTags('Ventas')
@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @ApiOperation({ summary: 'Estadísticas generales de ventas' })
  @Get('stats')
  async getStats() {
    try {
      return await this.ventasService.getVentasStats();
    } catch (error) {
      throw new HttpException({ message: error.message }, error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Pedidos de venta con filtros' })
  @Get('pedidos')
  async getPedidos(
    @Query('buscar') buscar?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      return await this.ventasService.getPedidos({
        buscar, fechaDesde, fechaHasta,
        limit: limit ? parseInt(limit, 10) : 100,
        offset: offset ? parseInt(offset, 10) : 0,
      });
    } catch (error) {
      throw new HttpException({ message: error.message }, error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Detalle de un pedido con líneas' })
  @ApiParam({ name: 'rowid', description: 'Row ID del pedido' })
  @Get('pedidos/:rowid')
  async getPedidoDetalle(@Param('rowid') rowid: string) {
    try {
      return await this.ventasService.getPedidoDetalle(parseInt(rowid, 10));
    } catch (error) {
      throw new HttpException({ message: error.message }, error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Facturas de venta' })
  @Get('facturas')
  async getFacturas(
    @Query('buscar') buscar?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      return await this.ventasService.getFacturas({
        buscar,
        limit: limit ? parseInt(limit, 10) : 100,
        offset: offset ? parseInt(offset, 10) : 0,
      });
    } catch (error) {
      throw new HttpException({ message: error.message }, error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Remisiones de venta' })
  @Get('remisiones')
  async getRemisiones(
    @Query('buscar') buscar?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      return await this.ventasService.getRemisiones({
        buscar, fechaDesde, fechaHasta,
        limit: limit ? parseInt(limit, 10) : 100,
        offset: offset ? parseInt(offset, 10) : 0,
      });
    } catch (error) {
      throw new HttpException({ message: error.message }, error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Devoluciones de venta' })
  @Get('devoluciones')
  async getDevoluciones(
    @Query('buscar') buscar?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      return await this.ventasService.getDevoluciones({
        buscar, fechaDesde, fechaHasta,
        limit: limit ? parseInt(limit, 10) : 100,
        offset: offset ? parseInt(offset, 10) : 0,
      });
    } catch (error) {
      throw new HttpException({ message: error.message }, error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
