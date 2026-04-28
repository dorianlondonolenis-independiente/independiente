import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AuthController } from './controllers/auth.controller';
import { LicenseController } from './controllers/license.controller';
import { UsersController } from './controllers/users.controller';
import { LicenseKey } from './entities/license-key.entity';
import { User } from './entities/user.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ModuleAccessGuard } from './guards/module-access.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthService } from './services/auth.service';
import { LicenseService } from './services/license.service';
import { UsersService } from './services/users.service';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * Módulo de autenticación independiente. Usa una BD SQLite local
 * (`data/auth.db`) totalmente separada del SQL Server del cliente.
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      name: 'auth',
      inject: [ConfigService],
      useFactory: () => ({
        type: 'better-sqlite3',
        database: join(process.cwd(), 'data', 'auth.db'),
        entities: [User, LicenseKey],
        synchronize: true,
        logging: false,
      }),
    }),
    TypeOrmModule.forFeature([User, LicenseKey], 'auth'),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'change-me-in-env',
        signOptions: { expiresIn: '12h' },
      }),
    }),
  ],
  controllers: [AuthController, UsersController, LicenseController],
  providers: [
    UsersService,
    AuthService,
    LicenseService,
    JwtStrategy,
    // Guard global: TODO endpoint queda protegido salvo @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Guard global de roles y módulos
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ModuleAccessGuard },
  ],
  exports: [AuthService, UsersService, JwtModule],
})
export class AuthModule {}
