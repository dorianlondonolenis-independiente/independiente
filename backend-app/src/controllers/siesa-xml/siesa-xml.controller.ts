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
import { TrasladosVentasService } from '../../services/siesa-xml/traslados-ventas.service';
import type { VersionId } from '../../services/siesa-xml/comprobante-specs';
import type { Response } from 'express';
import { Public } from '../../auth/decorators/public.decorator';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@ApiTags('Siesa XML')
@Controller('siesa-xml')
export class SiesaXmlController {
  constructor(
    private readonly siesaXmlService: SiesaXmlService,
    private readonly comprobantesService: SiesaComprobantesService,
    private readonly trasladosService: TrasladosVentasService,
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

  // ── TRASLADOS DE VENTAS ────────────────────────────────────────────────────

  private readonly EXCEL_FILTER = (_req: any, file: Express.Multer.File, cb: any) => {
    const ext = (file.originalname || '').toLowerCase().split('.').pop() || '';
    if (['xlsx', 'xls'].includes(ext)) cb(null, true);
    else cb(new HttpException('Solo se permiten archivos Excel (.xlsx/.xls)', HttpStatus.BAD_REQUEST), false);
  };

  /**
   * POST /api/siesa-xml/traslados/preview
   * Sube el Excel TB_CO + periodo → retorna preview con ventas y distribución calculada
   */
  @ApiOperation({ summary: 'Preview traslados de ventas desde Excel TB_CO' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'periodo', required: true, description: 'Periodo YYYYMM (ej. 202604)' })
  @Post('traslados/preview')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
      const ext = (file.originalname || '').toLowerCase().split('.').pop() || '';
      if (['xlsx', 'xls'].includes(ext)) cb(null, true);
      else cb(new HttpException('Solo se permiten archivos Excel (.xlsx/.xls)', HttpStatus.BAD_REQUEST), false);
    },
  }))
  async previewTraslados(
    @UploadedFile() file: Express.Multer.File,
    @Query('periodo') periodo?: string,
  ) {
    try {
      if (!file) throw new HttpException('No se recibió ningún archivo', HttpStatus.BAD_REQUEST);
      if (!periodo) throw new HttpException('Parámetro "periodo" es obligatorio (YYYYMM)', HttpStatus.BAD_REQUEST);
      const rows = this.trasladosService.parsearExcelTbCo(file.buffer);
      const previews = await this.trasladosService.consultarVentas(rows, periodo);
      return { total: previews.length, previews };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * POST /api/siesa-xml/traslados/generar
   * Sube el Excel TB_CO + parámetros → devuelve el XML como descarga
   */
  @ApiOperation({ summary: 'Generar XML de traslados de ventas' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'periodo',    required: true  })
  @ApiQuery({ name: 'cuenta',     required: true,  description: 'Cuenta contable (ej. 41359501)' })
  @ApiQuery({ name: 'tipoDocto',  required: true,  description: 'Tipo documento (ej. TRV)' })
  @ApiQuery({ name: 'fecha',      required: true,  description: 'Fecha documento YYYYMMDD' })
  @ApiQuery({ name: 'idCia',      required: false })
  @ApiQuery({ name: 'conexion',   required: false })
  @ApiQuery({ name: 'usuario',    required: false })
  @ApiQuery({ name: 'clave',      required: false })
  @ApiQuery({ name: 'consec',     required: false, description: 'Consecutivo inicial (default 1)' })
  @Post('traslados/generar')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
      const ext = (file.originalname || '').toLowerCase().split('.').pop() || '';
      if (['xlsx', 'xls'].includes(ext)) cb(null, true);
      else cb(new HttpException('Solo se permiten archivos Excel (.xlsx/.xls)', HttpStatus.BAD_REQUEST), false);
    },
  }))
  async generarTrasladosXml(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
    @Query('periodo')   periodo?: string,
    @Query('cuenta')    cuenta?: string,
    @Query('tipoDocto') tipoDocto?: string,
    @Query('fecha')     fecha?: string,
    @Query('idCia')     idCia?: string,
    @Query('conexion')  conexion?: string,
    @Query('usuario')   usuario?: string,
    @Query('clave')     clave?: string,
    @Query('consec')    consec?: string,
  ) {
    try {
      if (!file)      throw new HttpException('No se recibió ningún archivo', HttpStatus.BAD_REQUEST);
      if (!periodo)   throw new HttpException('Parámetro "periodo" es obligatorio', HttpStatus.BAD_REQUEST);
      if (!cuenta)    throw new HttpException('Parámetro "cuenta" es obligatorio', HttpStatus.BAD_REQUEST);
      if (!tipoDocto) throw new HttpException('Parámetro "tipoDocto" es obligatorio', HttpStatus.BAD_REQUEST);
      if (!fecha)     throw new HttpException('Parámetro "fecha" es obligatorio (YYYYMMDD)', HttpStatus.BAD_REQUEST);

      const rows = this.trasladosService.parsearExcelTbCo(file.buffer);
      const previews = await this.trasladosService.consultarVentas(rows, periodo);
      const xml = this.trasladosService.generarXml(previews, {
        cuentaVentas: cuenta,
        tipoDocto,
        fecha,
        idCia: idCia || '1',
        conexion: conexion || 'SQL-NEO',
        usuario: usuario || '',
        clave: clave || '',
        consecutivoInicial: consec ? parseInt(consec, 10) : 1,
      });

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="Traslados_${periodo}.xml"`);
      res.send(xml);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * POST /api/siesa-xml/traslados/enviar
   * Sube el Excel TB_CO + parámetros → genera XML y lo envía al API SIESA
   */
  @ApiOperation({ summary: 'Generar y enviar XML de traslados de ventas al API SIESA' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'periodo',    required: true })
  @ApiQuery({ name: 'cuenta',     required: true })
  @ApiQuery({ name: 'tipoDocto',  required: true })
  @ApiQuery({ name: 'fecha',      required: true })
  @ApiQuery({ name: 'url',        required: true, description: 'URL del API SIESA' })
  @ApiQuery({ name: 'idCia',      required: false })
  @ApiQuery({ name: 'conexion',   required: false })
  @ApiQuery({ name: 'usuario',    required: false })
  @ApiQuery({ name: 'clave',      required: false })
  @ApiQuery({ name: 'consec',     required: false })
  @Post('traslados/enviar')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
      const ext = (file.originalname || '').toLowerCase().split('.').pop() || '';
      if (['xlsx', 'xls'].includes(ext)) cb(null, true);
      else cb(new HttpException('Solo se permiten archivos Excel (.xlsx/.xls)', HttpStatus.BAD_REQUEST), false);
    },
  }))
  async enviarTrasladosXml(
    @UploadedFile() file: Express.Multer.File,
    @Query('periodo')   periodo?: string,
    @Query('cuenta')    cuenta?: string,
    @Query('tipoDocto') tipoDocto?: string,
    @Query('fecha')     fecha?: string,
    @Query('url')       url?: string,
    @Query('idCia')     idCia?: string,
    @Query('conexion')  conexion?: string,
    @Query('usuario')   usuario?: string,
    @Query('clave')     clave?: string,
    @Query('consec')    consec?: string,
  ) {
    try {
      if (!file)      throw new HttpException('No se recibió ningún archivo', HttpStatus.BAD_REQUEST);
      if (!periodo)   throw new HttpException('Parámetro "periodo" es obligatorio', HttpStatus.BAD_REQUEST);
      if (!cuenta)    throw new HttpException('Parámetro "cuenta" es obligatorio', HttpStatus.BAD_REQUEST);
      if (!tipoDocto) throw new HttpException('Parámetro "tipoDocto" es obligatorio', HttpStatus.BAD_REQUEST);
      if (!fecha)     throw new HttpException('Parámetro "fecha" es obligatorio (YYYYMMDD)', HttpStatus.BAD_REQUEST);
      if (!url)       throw new HttpException('Parámetro "url" (API SIESA) es obligatorio', HttpStatus.BAD_REQUEST);

      const rows = this.trasladosService.parsearExcelTbCo(file.buffer);
      const previews = await this.trasladosService.consultarVentas(rows, periodo);
      const xml = this.trasladosService.generarXml(previews, {
        cuentaVentas: cuenta,
        tipoDocto,
        fecha,
        idCia: idCia || '1',
        conexion: conexion || 'SQL-NEO',
        usuario: usuario || '',
        clave: clave || '',
        consecutivoInicial: consec ? parseInt(consec, 10) : 1,
      });

      const result = await this.trasladosService.enviarAlApi(xml, url);
      return {
        ok: result.ok,
        status: result.status,
        respuesta: result.respuesta,
        totalTraslados: previews.filter((p) => p.ventasNetas > 0).length,
        xmlEnviado: xml,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /api/siesa-xml/cuentas/por-tipo-docto?co=200&periodo=202303&tipos=FDV,FEL,FVM,FVC
   * Trae todas las cuentas auxiliares usadas en documentos de ventas (sin filtro de tipo)
   */
  @ApiOperation({ summary: 'Cuentas auxiliares por tipo de documento de ventas' })
  @Public()
  @Get('cuentas/por-tipo-docto')
  async cuentasPorTipoDocto(
    @Query('co') co: string,
    @Query('periodo') periodo: string,
    @Query('tipos') tipos: string,
  ) {
    if (!co || !periodo) return [];
    const tiposDocto = (tipos || 'FDV,FEL,FVM,FVC').split(',');
    try {
      return await this.trasladosService.cuentasPorTipoDocto(co.trim(), periodo.trim(), tiposDocto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /api/siesa-xml/cuentas/validar?co=200&periodo=202303&cuenta=41359501
   * Valida los movimientos reales de una cuenta auxiliar en un CO y periodo
   */
  @ApiOperation({ summary: 'Validar cuenta auxiliar vs movimientos reales del periodo' })
  @Public()
  @Get('cuentas/validar')
  async validarCuentaPeriodo(
    @Query('co') co: string,
    @Query('periodo') periodo: string,
    @Query('cuenta') cuenta: string,
  ) {
    if (!co || !periodo || !cuenta) return [];
    try {
      return await this.trasladosService.validarCuentaPeriodo(co.trim(), periodo.trim(), cuenta.trim());
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /api/siesa-xml/cuentas/ventas-periodo?co=200&periodo=202303
   * Detecta cuentas de ventas reales usadas en un CO y periodo
   */
  @ApiOperation({ summary: 'Detectar cuentas de ventas por CO y periodo' })
  @Public()
  @Get('cuentas/ventas-periodo')
  async detectarCuentasVentas(
    @Query('co') co: string,
    @Query('periodo') periodo: string,
  ) {
    if (!co || !periodo) return [];
    try {
      return await this.trasladosService.detectarCuentasVentas(co.trim(), periodo.trim());
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /api/siesa-xml/cuentas/buscar?q=
   * Busca cuentas contables en t253_co_auxiliares
   */
  @ApiOperation({ summary: 'Buscar cuentas contables' })
  @Public()
  @ApiQuery({ name: 'q', required: true, description: 'Texto a buscar (código o nombre)' })
  @Get('cuentas/buscar')
  async buscarCuentas(@Query('q') q: string) {
    if (!q || q.trim().length < 2) return [];
    try {
      return await this.trasladosService.buscarCuentas(q.trim());
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
