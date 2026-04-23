import {
  Controller,
  Post,
  Get,
  Body,
  UploadedFile,
  UseInterceptors,
  HttpException,
  HttpStatus,
  Res,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { SiesaXmlService } from '../../services/siesa-xml/siesa-xml.service';
import type { Response } from 'express';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@ApiTags('Siesa XML')
@Controller('siesa-xml')
export class SiesaXmlController {
  constructor(private readonly siesaXmlService: SiesaXmlService) {}

  /**
   * GET /api/siesa-xml/terceros/plantilla
   * Descarga la plantilla Excel para carga masiva de terceros
   */
  @ApiOperation({ summary: 'Descargar plantilla Excel para Terceros Siesa' })
  @Get('terceros/plantilla')
  downloadPlantilla(@Res() res: Response) {
    try {
      const buffer = this.siesaXmlService.generateTercerosExcelTemplate();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Plantilla_Terceros_Siesa.xlsx"');
      res.send(buffer);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * POST /api/siesa-xml/terceros/preview
   * Sube un Excel y retorna preview de filas parseadas (sin generar XML)
   */
  @ApiOperation({ summary: 'Previsualizar filas del Excel de Terceros' })
  @ApiConsumes('multipart/form-data')
  @Post('terceros/preview')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
      const ext = (file.originalname || '').toLowerCase().split('.').pop() || '';
      if (['xlsx', 'xls'].includes(ext)) cb(null, true);
      else cb(new HttpException('Solo se permiten archivos Excel (.xlsx/.xls)', HttpStatus.BAD_REQUEST), false);
    },
  }))
  async previewTerceros(@UploadedFile() file: Express.Multer.File) {
    try {
      if (!file) throw new HttpException('No se recibió ningún archivo', HttpStatus.BAD_REQUEST);
      const { rows, errors } = this.siesaXmlService.parseTercerosExcel(file.buffer, file.originalname);
      return {
        totalRows: rows.length,
        errors,
        preview: rows.slice(0, 20),
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * POST /api/siesa-xml/terceros/generar
   * Sube un Excel y devuelve el XML listo para importar en Siesa
   */
  @ApiOperation({ summary: 'Generar XML de Terceros desde Excel' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'conexion', required: false, description: 'Nombre conexión Siesa (default: SQL-NEO)' })
  @ApiQuery({ name: 'idCia',    required: false, description: 'ID de compañía (default: 1)' })
  @ApiQuery({ name: 'usuario',  required: false })
  @ApiQuery({ name: 'clave',    required: false })
  @Post('terceros/generar')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
      const ext = (file.originalname || '').toLowerCase().split('.').pop() || '';
      if (['xlsx', 'xls'].includes(ext)) cb(null, true);
      else cb(new HttpException('Solo se permiten archivos Excel (.xlsx/.xls)', HttpStatus.BAD_REQUEST), false);
    },
  }))
  async generarTercerosXml(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
    @Query('conexion') conexion?: string,
    @Query('idCia') idCia?: string,
    @Query('usuario') usuario?: string,
    @Query('clave') clave?: string,
  ) {
    try {
      if (!file) throw new HttpException('No se recibió ningún archivo', HttpStatus.BAD_REQUEST);
      const { rows, errors } = this.siesaXmlService.parseTercerosExcel(file.buffer, file.originalname);

      if (errors.length > 0 && rows.filter(r => r.NIT).length === 0) {
        throw new HttpException({ message: 'El archivo tiene errores críticos', errors }, HttpStatus.BAD_REQUEST);
      }

      const validRows = rows.filter(r => r.NIT);
      const xml = this.siesaXmlService.generateTercerosXml(validRows, { conexion, idCia, usuario, clave });

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="Importar_Terceros.xml"');
      res.send(xml);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * POST /api/siesa-xml/terceros/insertar
   * Sube un Excel e inserta los terceros directamente en SQL Server (t015 + t200)
   */
  @ApiOperation({ summary: 'Insertar Terceros desde Excel directamente en SQL Server Siesa' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'idCia', required: false, description: 'ID de compañía (default: 1)' })
  @Post('terceros/insertar')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
      const ext = (file.originalname || '').toLowerCase().split('.').pop() || '';
      if (['xlsx', 'xls'].includes(ext)) cb(null, true);
      else cb(new HttpException('Solo se permiten archivos Excel (.xlsx/.xls)', HttpStatus.BAD_REQUEST), false);
    },
  }))
  async insertarTerceros(
    @UploadedFile() file: Express.Multer.File,
    @Query('idCia') idCia?: string,
  ) {
    try {
      if (!file) throw new HttpException('No se recibió ningún archivo', HttpStatus.BAD_REQUEST);
      const { rows, errors: parseErrors } = this.siesaXmlService.parseTercerosExcel(file.buffer, file.originalname);
      const validRows = rows.filter(r => r.NIT);
      const result = await this.siesaXmlService.insertTercerosToDb(validRows, parseInt(idCia || '1', 10));
      return {
        totalLeidos: rows.length,
        inserted: result.inserted,
        skipped: result.skipped,
        errores: [...parseErrors, ...result.errors.map(e => `NIT ${e.nit}: ${e.message}`)],
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * POST /api/siesa-xml/terceros/test-insert
   * Inserta un tercero de prueba directamente desde JSON (sin Excel)
   */
  @ApiOperation({ summary: '[TEST] Insertar tercero de prueba desde JSON' })
  @Post('terceros/test-insert')
  async testInsertTercero(
    @Body() body: { rows: any[]; idCia?: number },
  ) {
    const result = await this.siesaXmlService.insertTercerosToDb(body.rows || [], body.idCia || 1);
    return result;
  }

  /**
   * POST /api/siesa-xml/terceros/update-tipo
   * Corrige el tipo_ident e ind_tipo_tercero de un tercero existente
   */
  @ApiOperation({ summary: 'Corregir TIPO_IDENT y TIPO_PERSONA de un tercero existente' })
  @Post('terceros/update-tipo')
  async updateTerceroTipo(
    @Body() body: { nit: string; tipoIdent: string; tipoPersona: string; idCia?: number },
  ) {
    return this.siesaXmlService.updateTerceroTipo(
      body.nit,
      body.tipoIdent,
      body.tipoPersona,
      body.idCia || 1,
    );
  }
}
