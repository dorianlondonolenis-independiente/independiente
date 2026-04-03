import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth/jwt-auth.guard';
import { UsuariosService } from 'src/services/usuarios/usuarios.service';

@Controller('usuarios')
export class UsuariosController {
    constructor(private readonly usuariosService: UsuariosService) { }

    // Ruta para crear un nuevo usuario
    @Post('crear')
    async crearUsuario(@Body() body: { username: string, password: string }) {
        await this.usuariosService.crearUsuario(body.username, body.password);
        return { message: 'Usuario creado exitosamente' };
    }

    // Ruta para obtener un usuario por su 'username'
    @UseGuards(JwtAuthGuard)
    @Get(':username')
    async obtenerUsuarioPorUsername(@Param('username') username: string) {
        const usuario = await this.usuariosService.obtenerUsuarioPorUsername(username);
        if (!usuario) {
            return { message: 'Usuario no encontrado' };
        }
        return usuario;
    }

    // Ruta para obtener los permisos de un usuario
    @UseGuards(JwtAuthGuard)
    @Get(':usuarioId/permisos')
    async obtenerPermisos(@Param('usuarioId') usuarioId: number) {
        const permisos = await this.usuariosService.obtenerPermisosDeUsuario(usuarioId);
        return { permisos };
    }
}
