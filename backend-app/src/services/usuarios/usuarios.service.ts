import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { InjectDataSource } from '@nestjs/typeorm';

@Injectable()
export class UsuariosService {
    constructor(@InjectDataSource('mysqlConnection') private mysqlDataSource: DataSource,
        @InjectDataSource('sqlServerConnection') private sqlServerDataSource: DataSource,) { }

    async crearUsuario(username: string, password: string): Promise<any> {
        const hash = await bcrypt.hash(password, 10);
        await this.mysqlDataSource.query(
            `INSERT INTO usuarios_nest (username, password) VALUES (?, ?)`,
            [username, hash],
        );
    }

    async obtenerUsuarioPorUsername(username: string): Promise<any> {
        const result = await this.mysqlDataSource.query(
            `SELECT * FROM usuarios_nest WHERE username = ?`,
            [username],
        );
        return result[0];
    }

    async obtenerPermisosDeUsuario(usuarioId: number): Promise<string[]> {
        const permisos = await this.mysqlDataSource.query(
            `SELECT permiso FROM permisos_nest WHERE usuario_id = ?`,
            [usuarioId],
        );
        return permisos.map((p: any) => p.permiso);
    }
}
