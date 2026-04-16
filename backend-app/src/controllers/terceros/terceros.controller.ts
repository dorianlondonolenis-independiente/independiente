import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { TercerosService } from '../../services/terceros/terceros.service';

@Controller('terceros')
export class TercerosController {
  constructor(private readonly tercerosService: TercerosService) {}

  @Get('stats')
  async getStats() {
    return this.tercerosService.getTercerosStats();
  }

  @Get('lista')
  async getLista(
    @Query('buscar') buscar?: string,
    @Query('tipo') tipo?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.tercerosService.getTerceros({
      buscar,
      tipo,
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  @Get(':rowid')
  async getDetalle(@Param('rowid') rowid: string) {
    return this.tercerosService.getTerceroDetalle(parseInt(rowid));
  }
}
