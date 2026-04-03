import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class ConsultasService {

    constructor(@InjectDataSource('mysqlConnection') private mysqlDataSource: DataSource,
        @InjectDataSource('sqlServerConnection') private sqlServerDataSource: DataSource,) {
    }

    async obtenerDatos(): Promise<any[]> {
        const result = await this.sqlServerDataSource.query(`
            SELECT TOP (5) *
            FROM [BdPortalProveedores].[web].[tblusuarios]`);
        return result;
    }

    async buscarPorNombre(nombre: string): Promise<any[]> {
        return await this.mysqlDataSource.query(
            `SELECT * FROM producto WHERE descripcion LIKE '%${nombre}%'`,
        );
    }
}
