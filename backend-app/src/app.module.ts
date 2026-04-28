import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { MetadataController } from './controllers/metadata/metadata.controller';
import { MetadataService } from './services/metadata/metadata.service';
import { DataController } from './controllers/data/data.controller';
import { DataService } from './services/data/data.service';
import { QueriesController } from './controllers/queries/queries.controller';
import { QueriesService } from './services/queries/queries.service';
import { MaestrasController } from './controllers/maestras/maestras.controller';
import { MaestrasService } from './services/maestras/maestras.service';
import { InventarioController } from './controllers/inventario/inventario.controller';
import { InventarioService } from './services/inventario/inventario.service';
import { VentasController } from './controllers/ventas/ventas.controller';
import { VentasService } from './services/ventas/ventas.service';
import { ComprasController } from './controllers/compras/compras.controller';
import { ComprasService } from './services/compras/compras.service';
import { CarteraController } from './controllers/cartera/cartera.controller';
import { CarteraService } from './services/cartera/cartera.service';
import { TercerosController } from './controllers/terceros/terceros.controller';
import { TercerosService } from './services/terceros/terceros.service';
import { BulkUploadController } from './controllers/bulk-upload/bulk-upload.controller';
import { BulkUploadService } from './services/bulk-upload/bulk-upload.service';
import { SiesaXmlController } from './controllers/siesa-xml/siesa-xml.controller';
import { SiesaXmlService } from './services/siesa-xml/siesa-xml.service';
import { SiesaComprobantesService } from './services/siesa-xml/siesa-comprobantes.service';
import { FinancieroController } from './controllers/financiero/financiero.controller';
import { FinancieroService } from './services/financiero/financiero.service';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'dist', 'frontend-app'),
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    TypeOrmModule.forRoot({
      type: 'mssql',
      host: '10.10.1.48',
      port: 1433,
      username: 'sa',
      password: 'Sa123456',
      database: 'UnoEE',
      entities: [
        join(__dirname, 'controllers/**/*.entity{.ts,.js}'),
        join(__dirname, 'services/**/*.entity{.ts,.js}'),
        join(__dirname, 'entities/**/*.entity{.ts,.js}'),
      ],
      synchronize: false,
      retryAttempts: 0,
      retryDelay: 500,
      options: {
        encrypt: false,
        trustServerCertificate: false,
        enableArithAbort: true,
        connectTimeout: 1000,
      },
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '12h' },
      }),
    }),
  ],
  controllers: [
    AppController, MetadataController, DataController, QueriesController,
    MaestrasController, InventarioController, VentasController, ComprasController,
    CarteraController, TercerosController, BulkUploadController, SiesaXmlController,
    FinancieroController,
  ],
  providers: [
    AppService, MetadataService, DataService, QueriesService,
    MaestrasService, InventarioService, VentasService, ComprasService,
    CarteraService, TercerosService, BulkUploadService, SiesaXmlService,
    SiesaComprobantesService,
    FinancieroService,
  ],
})
export class AppModule {}
