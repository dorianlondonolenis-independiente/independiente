import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateMensajeDto } from 'src/entities/mensaje/dto/create-mensaje-dto/create-mensaje-dto';
import { Mensaje } from 'src/entities/mensaje/mensaje.entity';
import { Repository } from 'typeorm';

@Injectable()
export class MensajesService {

    constructor(@InjectRepository(Mensaje, 'mysqlConnection') private mensajesRepository: Repository<Mensaje>) {
        console.log('MensajesService constructor');
    }

    async getAll(): Promise<Mensaje[]> {
        return await this.mensajesRepository.find();
    }

    async createMensaje(mensaje: CreateMensajeDto): Promise<Mensaje>{
        const nuevo = new Mensaje();
        nuevo.nick = mensaje.nick;
        nuevo.mensaje = mensaje.mensaje;
        return  this.mensajesRepository.save(nuevo);
    }

    async updateMensaje(idMensaje: number, mensaje: CreateMensajeDto) : Promise<Mensaje | null> {
        const mensajeUpdate = await this.mensajesRepository.findOneBy({ id: idMensaje });
        if (mensajeUpdate) {
            mensajeUpdate.nick = mensaje.nick;
            mensajeUpdate.mensaje = mensaje.mensaje;
            return this.mensajesRepository.save(mensajeUpdate);
        }
        return null;
    }

    async deleteMensaje(idMensaje: number): Promise<Mensaje | null> {
        const mensajeDelete = await this.mensajesRepository.findOneBy({ id: idMensaje });
        if (mensajeDelete) {
            return this.mensajesRepository.remove(mensajeDelete);
        }
        return null;
    }
}
