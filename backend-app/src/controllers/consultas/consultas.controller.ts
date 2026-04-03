import { Controller, Get, Query } from '@nestjs/common';
import { ConsultasService } from 'src/services/consultas/consultas.service';

@Controller('consultas')
export class ConsultasController {

    constructor(private readonly ConsultasService: ConsultasService) {
        console.log('MensajesController constructor');
    }

    @Get('productos')
    async getUsuariosActivos() {
        return await this.ConsultasService.obtenerDatos();
    }

    @Get('producto')
    async buscarPorNombre(@Query('nombre') nombre: string) {
        return await this.ConsultasService.buscarPorNombre(nombre);
    }
}
