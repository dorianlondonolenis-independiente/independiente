import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  HttpException,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiParam, ApiBody } from '@nestjs/swagger';
import { BulkUploadService } from '../../services/bulk-upload/bulk-upload.service';
import type { Response } from 'express';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

@ApiTags('Bulk Upload')
@Controller('bulk-upload')
export class BulkUploadController {
  constructor(private readonly bulkUploadService: BulkUploadService) {}

  /**
   * POST /api/bulk-upload/:tableName/parse
   * Upload and parse a CSV/Excel file, auto-map columns
   */
  @ApiOperation({ summary: 'Subir y parsear archivo CSV/Excel' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'tableName', description: 'Nombre de la tabla destino' })
  @Post(':tableName/parse')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
      const ext = (file.originalname || '').toLowerCase().split('.').pop() || '';
      if (['csv', 'xlsx', 'xls'].includes(ext)) {
        cb(null, true);
      } else {
        cb(new HttpException('Solo se permiten archivos CSV o Excel (.xlsx/.xls)', HttpStatus.BAD_REQUEST), false);
      }
    },
  }))
  async parseFile(
    @Param('tableName') tableName: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      if (!file) {
        throw new HttpException('No se recibió ningún archivo', HttpStatus.BAD_REQUEST);
      }

      // Parse file
      const { headers, rows } = this.bulkUploadService.parseFile(file.buffer, file.originalname);

      // Get table columns
      const tableColumns = await this.bulkUploadService.getInsertableColumns(tableName);

      // Auto-map
      const mapping = this.bulkUploadService.autoMapColumns(headers, tableColumns);

      return {
        fileName: file.originalname,
        fileSize: file.size,
        totalRows: rows.length,
        fileHeaders: headers,
        tableColumns: tableColumns.map(c => ({
          name: c.name,
          type: c.type,
          nullable: c.nullable,
          maxLength: c.maxLength,
          isPrimaryKey: c.isPrimaryKey,
        })),
        suggestedMapping: mapping,
        preview: rows.slice(0, 10),
      };
    } catch (error) {
      throw new HttpException(
        { statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR, message: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /api/bulk-upload/:tableName/validate
   * Validate mapped data (dry run) without inserting
   */
  @ApiOperation({ summary: 'Validar datos mapeados (dry run)' })
  @ApiParam({ name: 'tableName', description: 'Nombre de la tabla destino' })
  @ApiBody({ description: '{ rows: [...], mapping: { fileCol: tableCol, ... } }' })
  @Post(':tableName/validate')
  async validateData(
    @Param('tableName') tableName: string,
    @Body() body: { rows: Record<string, any>[]; mapping: Record<string, string> },
  ) {
    try {
      if (!body.rows || !body.mapping) {
        throw new HttpException(
          'Se requiere "rows" y "mapping" en el body',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.bulkUploadService.dryRun(tableName, body.rows, body.mapping);

      return {
        totalRows: body.rows.length,
        validCount: result.validRows.length,
        errorCount: result.errors.length,
        errors: result.errors.slice(0, 100), // Max 100 errors in response
        preview: result.preview,
      };
    } catch (error) {
      throw new HttpException(
        { statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR, message: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /api/bulk-upload/:tableName/execute
   * Execute the bulk insert
   */
  @ApiOperation({ summary: 'Ejecutar carga masiva' })
  @ApiParam({ name: 'tableName', description: 'Nombre de la tabla destino' })
  @ApiBody({ description: '{ rows: [...], mapping: { fileCol: tableCol, ... } }' })
  @Post(':tableName/execute')
  async executeBulk(
    @Param('tableName') tableName: string,
    @Body() body: { rows: Record<string, any>[]; mapping: Record<string, string> },
  ) {
    try {
      if (!body.rows || !body.mapping) {
        throw new HttpException(
          'Se requiere "rows" y "mapping" en el body',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate first
      const cols = await this.bulkUploadService.getInsertableColumns(tableName);
      const { validRows, errors } = this.bulkUploadService.validateRows(body.rows, body.mapping, cols);

      // Execute insert
      const result = await this.bulkUploadService.executeBulkInsert(tableName, validRows);

      return {
        ...result,
        validationErrors: errors.length,
        skippedByValidation: errors.length,
      };
    } catch (error) {
      throw new HttpException(
        { statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR, message: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /api/bulk-upload/:tableName/validate-file
   * Upload file + mapping and validate (dry run)
   */
  @ApiOperation({ summary: 'Validar archivo subido (dry run)' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'tableName', description: 'Nombre de la tabla destino' })
  @Post(':tableName/validate-file')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
      const ext = (file.originalname || '').toLowerCase().split('.').pop() || '';
      if (['csv', 'xlsx', 'xls'].includes(ext)) cb(null, true);
      else cb(new HttpException('Solo se permiten archivos CSV o Excel', HttpStatus.BAD_REQUEST), false);
    },
  }))
  async validateFile(
    @Param('tableName') tableName: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { mapping: string },
  ) {
    try {
      if (!file) throw new HttpException('No se recibió ningún archivo', HttpStatus.BAD_REQUEST);
      const mapping = JSON.parse(body.mapping);
      const { rows } = this.bulkUploadService.parseFile(file.buffer, file.originalname);
      const result = await this.bulkUploadService.dryRun(tableName, rows, mapping);
      return {
        totalRows: rows.length,
        validCount: result.validRows.length,
        errorCount: result.errors.length,
        errors: result.errors.slice(0, 100),
        preview: result.preview,
      };
    } catch (error) {
      throw new HttpException(
        { statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR, message: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /api/bulk-upload/:tableName/execute-file
   * Upload file + mapping and execute bulk insert
   */
  @ApiOperation({ summary: 'Ejecutar carga masiva desde archivo' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'tableName', description: 'Nombre de la tabla destino' })
  @Post(':tableName/execute-file')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
      const ext = (file.originalname || '').toLowerCase().split('.').pop() || '';
      if (['csv', 'xlsx', 'xls'].includes(ext)) cb(null, true);
      else cb(new HttpException('Solo se permiten archivos CSV o Excel', HttpStatus.BAD_REQUEST), false);
    },
  }))
  async executeFile(
    @Param('tableName') tableName: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { mapping: string },
  ) {
    try {
      if (!file) throw new HttpException('No se recibió ningún archivo', HttpStatus.BAD_REQUEST);
      const mapping = JSON.parse(body.mapping);
      const { rows } = this.bulkUploadService.parseFile(file.buffer, file.originalname);
      const cols = await this.bulkUploadService.getInsertableColumns(tableName);
      const { validRows, errors } = this.bulkUploadService.validateRows(rows, mapping, cols);
      const result = await this.bulkUploadService.executeBulkInsert(tableName, validRows);
      return {
        ...result,
        validationErrors: errors.length,
        skippedByValidation: errors.length,
      };
    } catch (error) {
      throw new HttpException(
        { statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR, message: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/bulk-upload/:tableName/template
   * Download CSV template for a table
   */
  @ApiOperation({ summary: 'Descargar plantilla CSV' })
  @ApiParam({ name: 'tableName', description: 'Nombre de la tabla' })
  @Get(':tableName/template')
  async downloadTemplate(
    @Param('tableName') tableName: string,
    @Res() res: Response,
  ) {
    try {
      const csv = await this.bulkUploadService.generateTemplate(tableName);
      const cleanName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="plantilla_${cleanName}.csv"`);
      res.send('\uFEFF' + csv);
    } catch (error) {
      throw new HttpException(
        { statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR, message: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/bulk-upload/:tableName/columns
   * Get insertable columns for a table (for column mapping UI)
   */
  @ApiOperation({ summary: 'Obtener columnas insertables de una tabla' })
  @ApiParam({ name: 'tableName', description: 'Nombre de la tabla' })
  @Get(':tableName/columns')
  async getColumns(@Param('tableName') tableName: string) {
    try {
      const cols = await this.bulkUploadService.getInsertableColumns(tableName);
      return { tableName, columns: cols };
    } catch (error) {
      throw new HttpException(
        { statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR, message: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
