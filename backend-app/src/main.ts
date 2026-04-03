import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Validación global de DTOs
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  // Prefijo global de API
  app.setGlobalPrefix('api');

  // Configurar Swagger
  const config = new DocumentBuilder()
    .setTitle('API REST - UnoEE')
    .setDescription('API REST para gestión de datos y metadata de SQL Server')
    .setVersion('1.0.0')
    .addTag('Metadata', 'Endpoints para obtener estructura de la base de datos')
    .addTag('Data', 'Endpoints para obtener y manipular datos de tablas')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`✅ Servidor ejecutándose en http://localhost:${port}`);
  console.log(`📚 Swagger disponible en http://localhost:${port}/swagger`);
}

bootstrap();
