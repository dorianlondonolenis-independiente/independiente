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
import { SiesaComprobantesService } from '../../services/siesa-xml/siesa-comprobantes.service';
import type { VersionId } from '../../services/siesa-xml/comprobante-specs';
import type { Response } from 'express';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@ApiTags('Siesa XML')
@Controller('siesa-xml')
export class SiesaXmlController {
  constructor(
    private readonly siesaXmlService: SiesaXmlService,
    private readonly comprobantesService: SiesaComprobantesService,
  ) {}

  /**
   * GET /api/siesa-xml/terceros/ejemplo
   * Descarga el XML de ejemplo (CARDENAS MARTINEZ) con credenciales y formato validados
   */
  @ApiOperation({ summary: 'Descargar XML de ejemplo Terceros (datos de prueba validados)' })
  @Get('terceros/ejemplo')
  downloadEjemplo(@Res() res: Response) {
    const xml = this.siesaXmlService.generateTercerosXml(
      [{
        NIT: '80431764',
        DV: '1',
        TIPO_IDENT: 'CC',
        TIPO_PERSONA: 'N',
        RAZON_SOCIAL: 'CARDENAS MARTINEZ JAIR GUSTAVO',
        APELLIDO1: 'CARDENAS',
        APELLIDO2: 'MARTINEZ',
        NOMBRES: 'JAIR GUSTAVO',
        NOMBRE_COMERCIAL: 'CARDENAS MARTINEZ JAIR GUSTAVO',
        NOMBRE_ESTABLECIMIENTO: 'JAIR GUSTAVO CARDENAS MARTINEZ',
        DIRECCION: 'AV. 3A NORTE No. 26N-83',
        COD_CIUDAD: '16976001',
        TELEFONO: '6534343',
        EMAIL: 'Jairc@siesa.com',
        ES_CLIENTE: '1',
        ES_PROVEEDOR: '1',
        ES_EMPLEADO: '1',
      }],
      { conexion: 'Ecommerce', idCia: '1', usuario: 'integracion', clave: 'Integracion15963*' },
    );
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Importar_Terceros_Ejemplo.xml"');
    res.send(xml);
  }

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

  /**
   * POST /api/siesa-xml/terceros/enviar-xml
   * Sube un Excel y envía cada tercero row-by-row al API Siesa como XML
   */
  @ApiOperation({ summary: 'Enviar Terceros al API Siesa (XML por fila)' })
  @ApiConsumes('multipart/form-data')
  @Post('terceros/enviar-xml')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
      const ext = (file.originalname || '').toLowerCase().split('.').pop() || '';
      if (['xlsx', 'xls'].includes(ext)) cb(null, true);
      else cb(new HttpException('Solo se permiten archivos Excel (.xlsx/.xls)', HttpStatus.BAD_REQUEST), false);
    },
  }))
  async enviarTercerosXml(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: {
      url: string;
      nombreConexion: string;
      idCia?: string;
      usuario: string;
      clave: string;
    },
  ) {
    if (!file) throw new HttpException('No se recibió ningún archivo', HttpStatus.BAD_REQUEST);
    if (!body.url) throw new HttpException('Se requiere la URL del API Siesa', HttpStatus.BAD_REQUEST);

    const { rows, errors: parseErrors } = this.siesaXmlService.parseTercerosExcel(file.buffer, file.originalname);
    const validRows = rows.filter(r => r.NIT);

    if (validRows.length === 0) {
      throw new HttpException({ message: 'No se encontraron filas válidas en el Excel', errors: parseErrors }, HttpStatus.BAD_REQUEST);
    }

    const result = await this.siesaXmlService.enviarXmlToSiesa(validRows, {
      url: body.url,
      conexion: body.nombreConexion || 'SQL-NEO',
      idCia: body.idCia || '1',
      usuario: body.usuario,
      clave: body.clave,
    });

    return {
      totalLeidos: rows.length,
      enviados: result.enviados,
      errores: [...parseErrors.map(e => ({ nit: 'parse', message: e })), ...result.errores],
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COMPROBANTES CONTABLES (registros 350 y 351, todas las versiones)
  // ─────────────────────────────────────────────────────────────────────────
  @ApiOperation({ summary: 'Listar versiones disponibles de comprobantes contables' })
  @Get('comprobantes/versiones')
  listarVersiones() {
    return this.comprobantesService.listarVersiones();
  }

  @ApiOperation({ summary: 'Descargar plantilla Excel para Comprobantes Contables' })
  @ApiQuery({ name: 'version', required: false, description: 'V1 | V2 (default V2)' })
  @Get('comprobantes/plantilla')
  downloadPlantillaComprobantes(
    @Res() res: Response,
    @Query('version') version?: string,
  ) {
    try {
      const v = (version || 'V2').toUpperCase() as VersionId;
      const buffer = this.comprobantesService.generarPlantillaExcel(v);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Plantilla_Comprobantes_${v}.xlsx"`);
      res.send(buffer);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Previsualizar parseo de Comprobante Contable' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'version', required: false, description: 'V1 | V2 (default V2)' })
  @Post('comprobantes/preview')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
      const ext = (file.originalname || '').toLowerCase().split('.').pop() || '';
      if (['xlsx', 'xls'].includes(ext)) cb(null, true);
      else cb(new HttpException('Solo se permiten archivos Excel (.xlsx/.xls)', HttpStatus.BAD_REQUEST), false);
    },
  }))
  previewComprobante(
    @UploadedFile() file: Express.Multer.File,
    @Query('version') version?: string,
  ) {
    if (!file) throw new HttpException('No se recibió ningún archivo', HttpStatus.BAD_REQUEST);
    const v = (version || 'V2').toUpperCase() as VersionId;
    const parsed = this.comprobantesService.parsearExcel(file.buffer, v);
    return {
      version: v,
      cabecera: parsed.cabecera,
      totalMovimientos: parsed.movimientos.length,
      totalCruces: parsed.cruces.length,
      movimientos: parsed.movimientos.slice(0, 20),
      cruces: parsed.cruces.slice(0, 10),
      errores: parsed.errores,
    };
  }

  @ApiOperation({ summary: 'Generar XML SIESA de Comprobante Contable' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'version',  required: false, description: 'V1 | V2 (default V2)' })
  @ApiQuery({ name: 'conexion', required: false })
  @ApiQuery({ name: 'idCia',    required: false })
  @ApiQuery({ name: 'usuario',  required: false })
  @ApiQuery({ name: 'clave',    required: false })
  @Post('comprobantes/generar')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
      const ext = (file.originalname || '').toLowerCase().split('.').pop() || '';
      if (['xlsx', 'xls'].includes(ext)) cb(null, true);
      else cb(new HttpException('Solo se permiten archivos Excel (.xlsx/.xls)', HttpStatus.BAD_REQUEST), false);
    },
  }))
  generarComprobanteXml(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
    @Query('version') version?: string,
    @Query('conexion') conexion?: string,
    @Query('idCia') idCia?: string,
    @Query('usuario') usuario?: string,
    @Query('clave') clave?: string,
  ) {
    if (!file) throw new HttpException('No se recibió ningún archivo', HttpStatus.BAD_REQUEST);
    const v = (version || 'V2').toUpperCase() as VersionId;
    const parsed = this.comprobantesService.parsearExcel(file.buffer, v);
    if (parsed.errores.some((e) => e.toLowerCase().includes('vacía') || e.toLowerCase().includes('no cuadra'))) {
      throw new HttpException({ message: 'El archivo tiene errores críticos', errores: parsed.errores }, HttpStatus.BAD_REQUEST);
    }
    const xml = this.comprobantesService.generarXml(parsed, v, { conexion, idCia, usuario, clave });
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Importar_Comprobante_${v}.xml"`);
    res.send(xml);
  }

  @ApiOperation({ summary: 'Enviar Comprobante Contable al API SIESA UnoEE' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'version',  required: false, description: 'V1 | V2 (default V2)' })
  @ApiQuery({ name: 'url',      required: true,  description: 'URL del API SIESA UnoEE' })
  @ApiQuery({ name: 'conexion', required: false })
  @ApiQuery({ name: 'idCia',    required: false })
  @ApiQuery({ name: 'usuario',  required: false })
  @ApiQuery({ name: 'clave',    required: false })
  @Post('comprobantes/enviar-xml')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
      const ext = (file.originalname || '').toLowerCase().split('.').pop() || '';
      if (['xlsx', 'xls'].includes(ext)) cb(null, true);
      else cb(new HttpException('Solo se permiten archivos Excel (.xlsx/.xls)', HttpStatus.BAD_REQUEST), false);
    },
  }))
  async enviarComprobanteXml(
    @UploadedFile() file: Express.Multer.File,
    @Query('version') version?: string,
    @Query('url') url?: string,
    @Query('conexion') conexion?: string,
    @Query('idCia') idCia?: string,
    @Query('usuario') usuario?: string,
    @Query('clave') clave?: string,
  ) {
    if (!file) throw new HttpException('No se recibió ningún archivo', HttpStatus.BAD_REQUEST);
    if (!url) throw new HttpException('URL del API SIESA es obligatoria', HttpStatus.BAD_REQUEST);
    const v = (version || 'V2').toUpperCase() as VersionId;
    const parsed = this.comprobantesService.parsearExcel(file.buffer, v);
    if (parsed.errores.some((e) => e.toLowerCase().includes('vacía') || e.toLowerCase().includes('no cuadra'))) {
      throw new HttpException({ message: 'El archivo tiene errores críticos', errores: parsed.errores }, HttpStatus.BAD_REQUEST);
    }
    const result = await this.comprobantesService.enviarAlApiSiesa(parsed, v, { url, conexion, idCia, usuario, clave });
    return {
      version: v,
      ok: result.ok,
      status: result.status,
      respuesta: result.respuesta,
      errores: parsed.errores,
    };
  }
}
