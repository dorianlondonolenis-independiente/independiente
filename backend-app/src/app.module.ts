import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MensajesController } from './controllers/mensajes/mensajes.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MensajesService } from './services/mensajes/mensajes.service';
import { Mensaje } from './entities/mensaje/mensaje.entity';
import { ConsultasService } from './services/consultas/consultas.service';
import { ConsultasController } from './controllers/consultas/consultas.controller';
import { UsuariosService } from './services/usuarios/usuarios.service';
import { AuthService } from './services/auth/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './controllers/auth/auth.controller';
import { JwtAuthGuard } from './auth/jwt-auth/jwt-auth.guard';
import { JwtStrategy } from './auth/jwt-auth/jwt.strategy';
import { PerfilController } from './controllers/perfil/perfil.controller';
import { UsuariosController } from './controllers/usuarios/usuarios.controller';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'dist', 'messageapp'), // 👈 ajusta este nombre
    }),
    ConfigModule.forRoot({
      isGlobal: true, // Hace disponible el config en toda la app
    }),
    TypeOrmModule.forRoot({
      name: 'mysqlConnection',
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'nest',
      password: 'app',
      database: 'sistema',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      // entities: [], // No usar a menos que no quieras tener entidades relacionadas con la base de datos
      // synchronize: false, // No usar a menos que no quieras tener entidades relacionadas con la base de datos
      synchronize: true,
    }),
    TypeOrmModule.forRoot({
      name: 'sqlServerConnection',
      type: 'mssql',
      host: '10.100.10.5', // o IP de tu servidor SQL
      port: 1433, // puerto por defecto de SQL Server
      username: 'azure',
      password: 'H#n!QvY9mb**',
      database: 'BdPortalProveedores',
      synchronize: false, // solo en desarrollo, ¡no en producción!
      options: {
        encrypt: true, // necesario para Azure SQL y servidores que exigen TLS
        trustServerCertificate: true, // para ignorar error de certificado autofirmado
        enableArithAbort: true, // usualmente se recomienda true para evitar warnings
      },
      entities: [], // entidad propia de SQL Server
    }),
    TypeOrmModule.forFeature([Mensaje], 'mysqlConnection'), // Conexión a MySQL

    // JwtModule usando ConfigService
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '2m' },
      }),
    }),
  ],
  controllers: [AppController, MensajesController, ConsultasController, AuthController, PerfilController, UsuariosController],
  providers: [AppService, MensajesService, ConsultasService, UsuariosService, JwtStrategy, JwtAuthGuard, AuthService],
})
export class AppModule { }
