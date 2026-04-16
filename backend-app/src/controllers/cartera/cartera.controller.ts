import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CarteraService } from '../../services/cartera/cartera.service';

@ApiTags('Cartera')
@Controller('cartera')
export class CarteraController {
  constructor(private readonly carteraService: CarteraService) {}

  @ApiOperation({ summary: 'Estadísticas de cartera CxC/CxP' })
  @Get('stats')
  async getStats() {
    try {
      return await this.carteraService.getCarteraStats();
    } catch (error) {
      throw new HttpException({ message: error.message }, error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Saldos abiertos con filtros' })
  @Get('saldos')
  async getSaldos(
    @Query('buscar') buscar?: string,
    @Query('tipo') tipo?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      return await this.carteraService.getSaldos({
        buscar, tipo,
        limit: limit ? parseInt(limit, 10) : 100,
        offset: offset ? parseInt(offset, 10) : 0,
      });
    } catch (error) {
      throw new HttpException({ message: error.message }, error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Antigüedad de saldos (aging)' })
  @Get('aging')
  async getAging() {
    try {
      return await this.carteraService.getAging();
    } catch (error) {
      throw new HttpException({ message: error.message }, error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
