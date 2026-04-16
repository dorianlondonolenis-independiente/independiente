import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { KardexService } from '../../services/kardex/kardex.service';

@Controller('kardex')
export class KardexController {
  constructor(private readonly kardexService: KardexService) {}

  @Get('movimientos')
  async getMovimientos(
    @Query('referencia') referencia?: string,
    @Query('itemRowid') itemRowid?: string,
    @Query('bodega') bodega?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.kardexService.getKardex({
      referencia,
      itemRowid: itemRowid ? parseInt(itemRowid) : undefined,
      bodega,
      fechaDesde,
      fechaHasta,
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  @Get('resumen-mensual')
  async getResumenMensual(@Query('meses') meses?: string) {
    return this.kardexService.getResumenMensual(meses ? parseInt(meses) : 12);
  }
}
