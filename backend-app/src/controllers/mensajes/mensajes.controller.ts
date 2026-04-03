import { Controller, Get, Query, Post, Body, Put, Param, Delete, Res, HttpStatus } from '@nestjs/common';
import { CreateMensajeDto } from 'src/entities/mensaje/dto/create-mensaje-dto/create-mensaje-dto';
import { MensajesService } from 'src/services/mensajes/mensajes.service';

@Controller('mensajes')
export class MensajesController {

    constructor(private readonly mensajesService: MensajesService) {
        console.log('MensajesController constructor');
    }

    @Post()
    create(@Body() createMensajeDto: CreateMensajeDto, @Res() response) {
        this.mensajesService.createMensaje(createMensajeDto).then((mensaje) => {
            response.status(HttpStatus.CREATED).json(mensaje);
        }).catch((error) => {
            response.status(HttpStatus.FORBIDDEN).json({
                message: 'Error creating mensaje',
                error: error.message,
            });
        });
    }

    @Get()
    getAll(@Res() response) {   
        this.mensajesService.getAll().then((mensajes) => {
            response.status(HttpStatus.OK).json(mensajes);
        }).catch((error) => {
            response.status(HttpStatus.FORBIDDEN).json({
                message: 'Error getting mensajes',
                error: error.message,
            });
        }); 
    }

    @Put(':id')
    update(@Res() response, @Param('id') id: string, @Body() updateMensajeDto: CreateMensajeDto) {
        this.mensajesService.updateMensaje(parseInt(id), updateMensajeDto).then((mensaje) => {
            if (mensaje) {
                response.status(HttpStatus.OK).json(mensaje);
            } else {
                response.status(HttpStatus.NOT_FOUND).json({
                    message: 'Mensaje not found',
                });
            }
        }).catch((error) => {
            response.status(HttpStatus.FORBIDDEN).json({
                message: 'Error updating mensaje',
                error: error.message,
            });
        });
    }

    @Delete(':id')
    delete(@Res() response, @Param('id') id: string) {
        this.mensajesService.deleteMensaje(parseInt(id)).then((mensaje) => {
            if (mensaje) {
                response.status(HttpStatus.OK).json(mensaje);
            } else {
                response.status(HttpStatus.NOT_FOUND).json({
                    message: 'Mensaje not found',
                });
            }
        }).catch((error) => {
            response.status(HttpStatus.FORBIDDEN).json({
                message: 'Error deleting mensaje',
                error: error.message,
            });
        });
    }
}
