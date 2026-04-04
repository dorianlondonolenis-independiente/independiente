import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { QueriesService } from 'src/services/queries/queries.service';
import { CreateSavedQueryDto, UpdateSavedQueryDto } from 'src/dtos/saved-query.dto';

@ApiTags('Queries')
@Controller('queries')
export class QueriesController {
  constructor(private readonly queriesService: QueriesService) {}

  /**
   * Crear una nueva consulta rápida
   */
  @Post()
  @ApiOperation({
    summary: 'Guardar una consulta rápida',
    description:
      'Crea una nueva consulta guardada con columnas específicas. Ejemplo: { tableName: "t145_mc_conceptos", columnNames: ["id", "descripcion"], nombre: "Conceptos principales" }',
  })
  @ApiResponse({
    status: 201,
    description: 'Consulta creada exitosamente',
    example: {
      id: 1,
      nombre: 'Conceptos principales',
      tableName: 't145_mc_conceptos',
      columnNames: '["id", "descripcion"]',
      description: 'Consulta para conceptos',
      createdAt: '2026-04-03T10:30:00Z',
    },
  })
  async createQuery(@Body() dto: CreateSavedQueryDto) {
    try {
      const result = await this.queriesService.createQuery(dto);
      return {
        id: result.id,
        nombre: result.nombre,
        tableName: result.tableName,
        columnNames: JSON.parse(result.columnNames),
        description: result.description,
        createdAt: result.createdAt,
      };
    } catch (error) {
      throw new HttpException(
        `Error creating query: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Obtener todas las consultas guardadas
   */
  @Get()
  @ApiOperation({
    summary: 'Listar todas las consultas guardadas',
    description: 'Retorna un listado de todas las consultas rápidas guardadas',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado de consultas',
    example: [
      {
        id: 1,
        nombre: 'Conceptos principales',
        tableName: 't145_mc_conceptos',
        columnNames: ['id', 'descripcion'],
        description: 'Consulta para conceptos',
        createdAt: '2026-04-03T10:30:00Z',
      },
    ],
  })
  async getAllQueries() {
    try {
      const queries = await this.queriesService.getAllQueries();
      return queries.map((q) => ({
        id: q.id,
        nombre: q.nombre,
        tableName: q.tableName,
        columnNames: JSON.parse(q.columnNames),
        description: q.description,
        createdAt: q.createdAt,
      }));
    } catch (error) {
      throw new HttpException(
        `Error retrieving queries: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtener una consulta específica
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener una consulta guardada por ID',
    description: 'Retorna los detalles de una consulta rápida específica',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la consulta',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Detalles de la consulta',
  })
  async getQueryById(@Param('id', ParseIntPipe) id: number) {
    try {
      const query = await this.queriesService.getQueryById(id);
      if (!query) {
        throw new HttpException('Query not found', HttpStatus.NOT_FOUND);
      }
      return {
        id: query.id,
        nombre: query.nombre,
        tableName: query.tableName,
        columnNames: JSON.parse(query.columnNames),
        description: query.description,
        createdAt: query.createdAt,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Actualizar una consulta
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar una consulta guardada',
    description: 'Modifica los parámetros de una consulta rápida existente. Todos los campos son opcionales.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la consulta a actualizar',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Consulta actualizada',
    example: {
      id: 1,
      nombre: 'Conceptos principales (actualizado)',
      tableName: 't145_mc_conceptos',
      columnNames: ['f145_id', 'f145_descripcion', 'f145_id_modulo'],
      description: 'Consulta actualizada para conceptos',
      createdAt: '2026-04-03T10:30:00Z',
    },
  })
  async updateQuery(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSavedQueryDto,
  ) {
    try {
      const result = await this.queriesService.updateQuery(id, dto);
      return {
        id: result.id,
        nombre: result.nombre,
        tableName: result.tableName,
        columnNames: JSON.parse(result.columnNames),
        description: result.description,
        createdAt: result.createdAt,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Eliminar una consulta
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar una consulta guardada',
    description: 'Borra una consulta rápida del sistema',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la consulta a eliminar',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Consulta eliminada',
  })
  async deleteQuery(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.queriesService.deleteQuery(id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Ejecutar una consulta guardada
   */
  @Get(':id/execute')
  @ApiOperation({
    summary: 'Ejecutar una consulta guardada',
    description:
      'Ejecuta una consulta guardada y retorna SOLO las columnas seleccionadas. Soporta paginación.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la consulta a ejecutar',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Número de registros a retornar (default: 100)',
    example: 100,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Desplazamiento para paginación (default: 0)',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado de la consulta con columnas seleccionadas',
    example: [
      {
        titulo: 'Consulta ejemplo',
        subtitulo: 'consulta desde backend',
        buscador: true,
        columnasBuscador: true,
        columnasVisibles: true,
        exportar: true,
        contextoMenu: [],
        boton: [],
        columnas: [
          { id: 'id', descripcion: 'Id', orden: 1 },
          { id: 'descripcion', descripcion: 'Descripcion', orden: 2 },
        ],
        datos: [
          { id: 1, descripcion: 'Concepto 1' },
          { id: 2, descripcion: 'Concepto 2' },
        ],
      },
    ],
  })
  async executeQuery(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      const parsedLimit = limit ? parseInt(limit, 10) : 100;
      const parsedOffset = offset ? parseInt(offset, 10) : 0;

      // El servicio ahora retorna el formato requerido directamente
      return await this.queriesService.executeQuery(id, parsedLimit, parsedOffset);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
