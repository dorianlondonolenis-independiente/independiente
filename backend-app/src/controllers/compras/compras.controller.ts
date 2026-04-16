import { Controller, Get, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ComprasService } from '../../services/compras/compras.service';

@ApiTags('Compras')
@Controller('compras')
export class ComprasController {
  constructor(private readonly comprasService: ComprasService) {}

  @ApiOperation({ summary: 'Estadísticas de compras' })
  @Get('stats')
  async getStats() {
    try {
      return await this.comprasService.getComprasStats();
    } catch (error) {
      throw new HttpException({ message: error.message }, error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Órdenes de compra con filtros' })
  @Get('ordenes')
  async getOrdenes(
    @Query('buscar') buscar?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      return await this.comprasService.getOrdenes({
        buscar, fechaDesde, fechaHasta,
        limit: limit ? parseInt(limit, 10) : 100,
        offset: offset ? parseInt(offset, 10) : 0,
      });
    } catch (error) {
      throw new HttpException({ message: error.message }, error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Detalle de orden de compra con líneas' })
  @Get('ordenes/:rowid')
  async getOrdenDetalle(@Param('rowid') rowid: string) {
    try {
      return await this.comprasService.getOrdenDetalle(parseInt(rowid, 10));
    } catch (error) {
      throw new HttpException({ message: error.message }, error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
