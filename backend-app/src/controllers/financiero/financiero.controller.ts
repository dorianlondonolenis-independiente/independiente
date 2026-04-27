import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import type { Response } from 'express';
import { FinancieroService } from '../../services/financiero/financiero.service';

@Controller('financiero')
export class FinancieroController {
  constructor(private readonly service: FinancieroService) {}

  @Post('conciliacion-ventas')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  )
  async conciliar(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Debe adjuntar un archivo.');
    }
    return this.service.conciliarVentas(file.buffer);
  }

  @Get('conciliacion-ventas/plantilla')
  async descargarPlantilla(@Res() res: Response) {
    const buffer = await this.service.generarPlantilla();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="plantilla-conciliacion-ventas.xlsx"',
    );
    res.send(buffer);
  }

  @Post('conciliacion-compras')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async conciliarCompras(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Debe adjuntar un archivo.');
    }
    return this.service.conciliarCompras(file.buffer);
  }

  @Get('conciliacion-compras/plantilla')
  async descargarPlantillaCompras(@Res() res: Response) {
    const buffer = await this.service.generarPlantillaCompras();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="plantilla-conciliacion-compras.xlsx"',
    );
    res.send(buffer);
  }
}


