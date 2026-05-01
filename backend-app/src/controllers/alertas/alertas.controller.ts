import { Controller, Get, HttpException, HttpStatus, Logger, Post, Query } from '@nestjs/common';
import {
  AlertasService,
  AlertaInventario,
  AlertaVentaVsStock,
  TendenciaVentas,
} from '../../services/alertas/alertas.service';

@Controller('alertas')
export class AlertasController {
  private readonly logger = new Logger(AlertasController.name);
  constructor(private readonly alertasService: AlertasService) {}

  /** Resumen rápido para widget del Dashboard */
  @Get('resumen')
  async getResumen() {
    try {
      return await this.alertasService.getResumenAlertas();
    } catch (e: any) {
      this.logger.error('getResumen error: ' + e.message, e.stack);
      throw new HttpException(e.message ?? 'Error interno', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /** Alertas de inventario: sin stock / bajo mínimo / sobre máximo */
  @Get('inventario')
  async getAlertasInventario(@Query('bodega') bodega?: string): Promise<AlertaInventario[]> {
    try {
      return await this.alertasService.getAlertasInventario(bodega);
    } catch (e: any) {
      this.logger.error('getAlertasInventario error: ' + e.message, e.stack);
      throw new HttpException(e.message ?? 'Error interno', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /** Cruce pedidos pendientes vs stock disponible */
  @Get('ventas-vs-stock')
  getVentasVsStock(): Promise<AlertaVentaVsStock[]> {
    return this.alertasService.getAlertasVentaVsStock();
  }

  /** Tendencias de ventas + cobertura de stock */
  @Get('tendencias')
  getTendencias(@Query('soloAlertas') soloAlertas?: string): Promise<TendenciaVentas[]> {
    return this.alertasService.getTendenciasVentas(soloAlertas === 'true');
  }

  /**
   * Disparar envío de email de alertas manualmente
   * POST /api/alertas/notificar
   */
  @Post('notificar')
  notificar() {
    return this.alertasService.enviarEmailAlertas();
  }

  /**
   * Enviar email de prueba (sin validar alertas críticas)
   * POST /api/alertas/notificar/test?email=destino@ejemplo.com
   */
  @Post('notificar/test')
  async notificarTest(@Query('email') email?: string) {
    try {
      return await this.alertasService.enviarEmailPrueba(email);
    } catch (e: any) {
      this.logger.error('notificarTest error: ' + e.message, e.stack);
      throw new HttpException(e.message ?? 'Error interno', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
