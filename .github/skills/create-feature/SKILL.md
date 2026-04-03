---
name: create-feature
description: "Use when adding a new feature, module, or domain to the backend (NestJS) or frontend (Angular). Generates boilerplate following project patterns: modular architecture, DTOs, services, controllers, components. Ensures consistency with JWT auth, dual-database setup, and Signal-based components."
---

# Crear Nueva Feature/Módulo

Use este skill cuando necesites agregar un nuevo módulo o feature al backend o frontend manteniendo los estándares del proyecto.

## Flujo General

### Backend (NestJS)

**1. Estructura de Carpetas**
```
src/
├── controllers/[domain]/
│   └── [domain].controller.ts
├── services/[domain]/
│   └── [domain].service.ts
├── entities/[domain]/
│   ├── [domain].entity.ts
│   └── dto/
│       └── create-[domain]-dto/
│           └── create-[domain]-dto.ts
```

**2. Archivo de Entidad (Entity)**
- Usar decoradores de TypeORM: `@Entity()`, `@Column()`, `@PrimaryGeneratedColumn()`
- Definir relaciones si aplica
- Exportar desde el archivo

**3. Archivo DTO (Data Transfer Object)**
- Crear en `dto/create-[domain]-dto/create-[domain]-dto.ts`
- Usar decoradores de clase-validator: `@IsString()`, `@IsEmail()`, etc.
- Incluir validación de datos

**4. Servicio (Service)**
- Ubicado en `services/[domain]/[domain].service.ts`
- Decorador `@Injectable()`
- Métodos para CRUD: `create()`, `findAll()`, `findOne()`, `update()`, `remove()`
- Usar inyección de dependencias para DataSource (MySQL o SQL Server)
- Manejar errores apropiadamente

**5. Controlador (Controller)**
- Ubicado en `controllers/[domain]/[domain].controller.ts`
- Decorador `@Controller('ruta-del-dominio')`
- Decorador `@UseGuards(JwtAuthGuard)` para rutas protegidas
- Métodos HTTP: `@Get()`, `@Post()`, `@Put()`, `@Delete()`
- Usar inyección del servicio

**6. Registro en Module**
- Agregar en `app.module.ts`: importar controlador y servicio
- Agregar en providers si es necesario

### Frontend (Angular)

**1. Estructura de Carpetas**
```
src/app/
├── features/[domain]/
│   ├── [domain].component.ts
│   ├── [domain].component.html
│   └── [domain].component.css
├── services/
│   └── [domain].service.ts
```

**2. Componente (Component)**
- Standalone: `standalone: true`
- Usar Signals: `signal()`, `computed()`, `effect()`
- Importar componentes necesarios
- Template con binding de signals: `{{ signal() }}`

**3. Servicio (Service)**
- Decorador `@Injectable({ providedIn: 'root' })`
- Inyectar `HttpClient` para llamadas al backend
- Usar Observables o Signals para estado
- Métodos para consumir API backend

**4. Routing**
- Agregar en `app.routes.ts`
- Configurar lazy loading si es feature grande

## Estándares de Código

### Naming Conventions
- **Entidades/Clases**: PascalCase: `Usuario`, `Mensaje`, `Consulta`
- **Archivos**: kebab-case: `usuario.entity.ts`, `crear-usuario-dto.ts`
- **Métodos/Propiedades**: camelCase: `crearUsuario()`, `obtenerPorId()`
- **Constantes**: UPPER_SNAKE_CASE: `MAX_RETRIES`, `DEFAULT_TIMEOUT`

### Imports
- Organizar en orden: Angular → NestJS → Proyecto → Tipos
- Usar rutas relativas para archivos locales

### Decoradores TypeORM
```typescript
@Entity()
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ unique: true })
  email: string;
}
```

### Validación DTO
```typescript
import { IsString, IsEmail, MinLength } from 'class-validator';

export class CreateUsuarioDto {
  @IsString()
  @MinLength(3)
  nombre: string;

  @IsEmail()
  email: string;
}
```

### Servicio Backend
```typescript
@Injectable()
export class UsuarioService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async create(createDto: CreateUsuarioDto) {
    // Lógica de creación
  }

  async findAll() {
    // Retornar todos los registros
  }
}
```

### Controlador Backend
```typescript
@Controller('usuarios')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createDto: CreateUsuarioDto) {
    return this.usuarioService.create(createDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.usuarioService.findAll();
  }
}
```

### Componente Frontend
```typescript
import { Component, inject, signal } from '@angular/core';
import { UsuarioService } from '../../services/usuario.service';

@Component({
  selector: 'app-usuario',
  standalone: true,
  template: `<div>{{ usuarios() | json }}</div>`,
})
export class UsuarioComponent {
  private usuarioService = inject(UsuarioService);
  usuarios = signal([]);

  ngOnInit() {
    this.usuarioService.getAll().subscribe(data => {
      this.usuarios.set(data);
    });
  }
}
```

## Checklist de Implementación

### Backend
- [ ] Crear entidad con decoradores TypeORM
- [ ] Crear DTO con validaciones
- [ ] Crear servicio con métodos CRUD
- [ ] Implementar inyección de DataSource
- [ ] Crear controlador con rutas HTTP
- [ ] Agregar @UseGuards(JwtAuthGuard) en rutas protegidas
- [ ] Registrar en app.module.ts
- [ ] Crear tests unitarios

### Frontend
- [ ] Crear componente standalone
- [ ] Crear servicio con inyección HttpClient
- [ ] Implementar llamadas a API backend
- [ ] Usar Signals para manejo de estado
- [ ] Agregar rutas en app.routes.ts
- [ ] Crear tests unitarios

## Testing

### Backend (Jest)
- Tests unitarios para servicios
- Tests e2e para endpoints
- Ubicar en `test/` o `src/**/*.spec.ts`

### Frontend (Jasmine)
- Tests unitarios para componentes
- Tests de servicios
- Ubicar en `src/**/*.spec.ts`

## Base de Datos

- **MySQL DataSource**: Para aplicación principal
- **SQL Server DataSource**: Para consultas/proveedores
- Usar `DataSource.query()` para raw queries si es necesario
- Implementar migraciones para cambios de esquema

---

**Inicio rápido**: 
1. Elige el nombre del dominio (ej: "producto", "pedido")
2. Decide si es backend, frontend o ambos
3. Usa este skill como guía para generar los archivos
4. Sigue los estándares de naming y estructura
