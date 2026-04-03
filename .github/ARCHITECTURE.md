# Arquitectura del Proyecto

**Última actualización**: 2026-04-03  
**Estado**: En desarrollo (v0.1)

## 📋 Tabla de Contenidos
1. [Visión General](#visión-general)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Arquitectura de Alto Nivel](#arquitectura-de-alto-nivel)
4. [Backend - NestJS](#backend---nestjs)
5. [Frontend - Angular](#frontend---angular)
6. [Base de Datos](#base-de-datos)
7. [Flujo de Datos](#flujo-de-datos)
8. [Seguridad](#seguridad)
9. [Decisiones Arquitectónicas](#decisiones-arquitectónicas)
10. [Roadmap](#roadmap)

---

## Visión General

Sistema modular basado en cliente-servidor para gestión de:
- **Autenticación**: JWT + Passport
- **Usuarios**: Gestión de perfiles y roles
- **Consultas**: Procesamiento de solicitudes
- **Mensajes**: Sistema de comunicación
- **Perfiles**: Información de usuario

**Objetivo**: Proporcionar una plataforma escalable y mantenible con separación clara entre frontend y backend.

---

## Stack Tecnológico

### Backend
| Componente | Tecnología | Versión |
|-----------|-----------|---------|
| Framework | NestJS | Latest |
| ORM | TypeORM | Latest |
| Autenticación | JWT + Passport | - |
| Validación | class-validator | - |
| Encriptación | Bcrypt | - |
| Language | TypeScript | 5.x |

### Frontend
| Componente | Tecnología | Versión |
|-----------|-----------|---------|
| Framework | Angular | 17+ |
| Modelo | Standalone Components | - |
| Estado | Signals | - |
| HTTP | HttpClient | - |
| Language | TypeScript | 5.x |

### Bases de Datos
| BD | Propósito | Conexión |
|----|---------|----------|
| MySQL | Aplicación principal | DataSource Principal |
| SQL Server | Consultas de proveedores | DataSource Secundaria |

---

## Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENTE (Frontend)                       │
│          Angular 17 + Standalone + Signals                  │
└────────────────┬────────────────────────────────┬────────────┘
                 │                                │
                 │        HTTP/REST API          │
                 │        JWT Headers            │
                 │                                │
┌────────────────▼────────────────────────────────▼────────────┐
│              SERVIDOR (Backend)                              │
│           NestJS + TypeORM + Passport                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API Endpoints                                       │   │
│  │  - Auth (login, register)                            │   │
│  │  - Usuarios (CRUD)                                   │   │
│  │  - Consultas (CRUD)                                  │   │
│  │  - Mensajes (CRUD)                                   │   │
│  │  - Perfil (CRUD)                                     │   │
│  └────────┬─────────────────────────────────────────────┘   │
│           │                                                   │
│  ┌────────▼──────────────────────────────────────────────┐   │
│  │  Servicios & Lógica de Negocio                       │   │
│  │  - AuthService                                        │   │
│  │  - UsuariosService                                    │   │
│  │  - ConsultasService                                   │   │
│  │  - MensajesService                                    │   │
│  └────────┬──────────────────────────────────────────────┘   │
│           │                                                   │
│  ┌────────▼──────────────────────────────────────────────┐   │
│  │  Entidades & DTOs                                    │   │
│  │  - TypeORM Entities                                  │   │
│  │  - Validación con class-validator                    │   │
│  └────────┬──────────────────────────────────────────────┘   │
│           │                                                   │
└───────────┼──────────────────────────────────────────────────┘
            │
    ┌───────┴─────────┬──────────────────┐
    │                 │                  │
┌───▼────┐      ┌─────▼──┐      ┌───────▼────┐
│ MySQL  │      │SQL Srv │      │ JWT Store  │
│Principal      │Provides │      │ (Memory)   │
└────────┘      └────────┘      └────────────┘
```

---

## Backend - NestJS

### Estructura de Carpetas

```
backend-app/
├── src/
│   ├── auth/
│   │   ├── jwt-auth/
│   │   │   ├── jwt.strategy.ts      # Estrategia de JWT
│   │   │   └── jwt-auth.guard.ts    # Guard para rutas protegidas
│   │   └── auth.service.ts          # Lógica de autenticación
│   │
│   ├── controllers/
│   │   ├── auth/
│   │   │   └── auth.controller.ts   # Endpoints de auth
│   │   ├── usuarios/
│   │   │   └── usuarios.controller.ts
│   │   ├── consultas/
│   │   │   └── consultas.controller.ts
│   │   ├── mensajes/
│   │   │   └── mensajes.controller.ts
│   │   └── perfil/
│   │       └── perfil.controller.ts
│   │
│   ├── services/
│   │   ├── auth/
│   │   │   └── auth.service.ts
│   │   ├── usuarios/
│   │   │   └── usuarios.service.ts
│   │   ├── consultas/
│   │   │   └── consultas.service.ts
│   │   ├── mensajes/
│   │   │   └── mensajes.service.ts
│   │   └── perfil/
│   │       └── perfil.service.ts
│   │
│   ├── entities/
│   │   ├── auth/
│   │   ├── usuarios/
│   │   │   ├── usuario.entity.ts
│   │   │   └── dto/
│   │   │       └── create-usuario-dto.ts
│   │   ├── consultas/
│   │   ├── mensajes/
│   │   │   ├── mensaje.entity.ts
│   │   │   └── dto/
│   │   │       └── create-mensaje-dto.ts
│   │   └── perfil/
│   │
│   ├── app.module.ts                # Módulo raíz
│   ├── app.controller.ts            # Controlador raíz
│   ├── app.service.ts               # Servicio raíz
│   └── main.ts                      # Punto de entrada
│
├── test/
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
├── eslint.config.mjs
├── jest.config.js
├── nest-cli.json
├── package.json
└── tsconfig.json
```

### Patrones de Diseño

#### 1. Modulación por Dominio
- Cada dominio es independiente: `auth`, `usuarios`, `consultas`, `mensajes`, `perfil`
- Cada módulo contiene: Controlador, Servicio, Entidades, DTOs
- Inyección de dependencias centralizada en `app.module.ts`

#### 2. Controlador
```typescript
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.create(createUsuarioDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.usuariosService.findAll();
  }
}
```

#### 3. Servicio
```typescript
@Injectable()
export class UsuariosService {
  constructor(
    @InjectDataSource() 
    private dataSource: DataSource,
  ) {}

  async create(createUsuarioDto: CreateUsuarioDto) {
    // Lógica de negocio
    const repository = this.dataSource.getRepository(Usuario);
    return repository.save(createUsuarioDto);
  }
}
```

#### 4. DTO con Validación
```typescript
export class CreateUsuarioDto {
  @IsString()
  @MinLength(3)
  nombre: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
```

### Flujo de Autenticación

```
1. Cliente enviá credenciales → POST /auth/login
2. AuthService verifica contraseña con bcrypt
3. Si es válido → GeneraJWT Token
4. Cliente recibe token → lo guarda en localStorage
5. Cliente adjunta token en headers: Authorization: Bearer <token>
6. JwtAuthGuard valida el token en cada solicitud
7. Si token es válido → solicitud continúa
8. Si token es inválido/expirado → 401 Unauthorized
```

---

## Frontend - Angular

### Estructura de Carpetas

```
frontend-app/
├── src/
│   ├── app/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   ├── auth.component.ts
│   │   │   │   ├── auth.component.html
│   │   │   │   └── auth.component.css
│   │   │   ├── usuarios/
│   │   │   ├── consultas/
│   │   │   ├── mensajes/
│   │   │   └── perfil/
│   │   │
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── usuarios.service.ts
│   │   │   ├── consultas.service.ts
│   │   │   ├── mensajes.service.ts
│   │   │   └── perfil.service.ts
│   │   │
│   │   ├── app.routes.ts            # Definición de rutas
│   │   ├── app.config.ts            # Configuración global
│   │   ├── app.ts                   # Root component
│   │   └── app.css                  # Estilos globales
│   │
│   ├── index.html
│   ├── main.ts
│   ├── styles.css
│   └── server.ts
│
├── angular.json
├── package.json
├── tsconfig.json
└── tsconfig.app.json
```

### Patrones de Diseño

#### 1. Componente Standalone
```typescript
@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <h1>Usuarios</h1>
      <ul>
        <li *ngFor="let usuario of usuarios()">
          {{ usuario.nombre }}
        </li>
      </ul>
    </div>
  `,
})
export class UsuariosComponent {
  private usuariosService = inject(UsuariosService);
  usuarios = signal([]);

  ngOnInit() {
    this.usuariosService.getAllUsers().subscribe((users) => {
      this.usuarios.set(users);
    });
  }
}
```

#### 2. Servicio con HttpClient
```typescript
@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private apiUrl = 'http://localhost:3000/api/usuarios';
  private http = inject(HttpClient);

  getAllUsers() {
    return this.http.get<any[]>(this.apiUrl);
  }

  createUser(usuario: any) {
    return this.http.post(this.apiUrl, usuario);
  }
}
```

#### 3. Manejo de Estado con Signals
```typescript
export class DashboardComponent {
  private service = inject(DataService);
  
  // Signals para estado local
  data = signal([]);
  loading = signal(false);
  error = signal<string | null>(null);

  loadData() {
    this.loading.set(true);
    this.service.fetchData().subscribe({
      next: (result) => {
        this.data.set(result);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }
}
```

### Routing

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'auth', component: AuthComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'usuarios',
    component: UsuariosComponent,
    canActivate: [AuthGuard],
  },
  { path: '**', redirectTo: '' },
];
```

---

## Base de Datos

### MySQL (Principal)

**Propósito**: Almacenamiento principal de la aplicación

**Entidades Principales**:
- `Usuario` - Información de usuarios
- `Consult` - Consultas/solicitudes
- `Mensaje` - Mensajes
- `Perfil` - Perfiles de usuario

**Diagrama ER (Conceptual)**:
```
Usuario
├── id (PK, UUID)
├── nombre (String)
├── email (String, UNIQUE)
├── password_hash (String)
├── created_at (Timestamp)
└── updated_at (Timestamp)

Consult
├── id (PK, UUID)
├── usuario_id (FK → Usuario)
├── titulo (String)
├── descripcion (Text)
├── estado (Enum)
└── created_at (Timestamp)

Mensaje
├── id (PK, UUID)
├── usuario_id (FK → Usuario)
├── contenido (Text)
├── created_at (Timestamp)

Perfil
├── id (PK, UUID)
├── usuario_id (FK → Usuario, UNIQUE)
├── bio (Text)
├── avatar_url (String)
├── telefono (String)
└── updated_at (Timestamp)
```

### SQL Server (Proveedores)

**Propósito**: Consultas a base de datos de proveedores

**Uso**: Lectura de datos de sistemas externos

---

## Flujo de Datos

### Flujo: Obtener Lista de Usuarios

```
1. Frontend: Click en botón "Listar Usuarios"
   ↓
2. Frontend: Usuario.component.ts → ngOnInit()→ usuariosService.getAll()
   ↓
3. Frontend: HttpClient realiza GET /api/usuarios
   ↓
4. Backend: Request llega a UsuariosController
   ↓
5. Backend: UsuariosController → UsuariosService.findAll()
   ↓
6. Backend: UsuariosService → DataSource.query() o Repository.find()
   ↓
7. Backend: MySQL retorna registros
   ↓
8. Backend: Mapea a DTOs y retorna JSON
   ↓
9. Frontend: Recibe respuesta
   ↓
10. Frontend: Signal usuarios.set(data)
   ↓
11. Frontend: Componente se actualiza automáticamente
```

### Flujo: Crear Nuevo Usuario

```
1. Frontend: Formulario + click "Guardar"
   ↓
2. Frontend: Valida con FormControl
   ↓
3. Frontend: usuariosService.create(usuarioData)
   ↓
4. Backend: POST /api/usuarios + JWT token
   ↓
5. Backend: JwtAuthGuard valida token
   ↓
6. Backend: UsuariosController.create()
   ↓
7. Backend: Valida DTO (class-validator)
   ↓
8. Backend: UsuariosService.create()
   ↓
9. Backend: Hash de contraseña con bcrypt
   ↓
10. Backend: Guarda en MySQL
   ↓
11. Backend: Retorna usuario creado
   ↓
12. Frontend: Recibe respuesta + actualiza señal
```

---

## Seguridad

### Autenticación

- **JWT**: Token basado en claims
- **Passport**: Estrategia de validación
- **Bcrypt**: Hash de contraseñas (salt rounds: 10)
- **CORS**: Configurado en NestJS

### Validación

- **DTOs**: class-validator en backend
- **Guards**: JwtAuthGuard en rutas protegidas
- **Headers**: Auth requerido en endpoints

### Almacenamiento de Credenciales

- **Frontend**: Token en localStorage (después de login)
- **Backend**: JWT validado en cada solicitud
- **Expiración**: Configurable en JWT payload

### HTTPS/TLS

- En producción, usar HTTPS
- Configurar CORS apropiadamente
- Validar origen de solicitudes

---

## Decisiones Arquitectónicas

| Decisión | Razón | Estado |
|----------|-------|--------|
| NestJS | Framework robusto, escalable, built-in DI | ✅ Confirmado |
| TypeORM | ORM flexible, soporte MySQL + SQL Server | ✅ Confirmado |
| JWT | Stateless, escalable, seguro | ✅ Confirmado |
| Angular 17+ | Signals mejoran performance, standalone components | ✅ Confirmado |
| Standalone Components | Reducen boilerplate, mejor code splitting | ✅ Confirmado |
| Dual DataSource | Separar datos principales de proveedores | ✅ Confirmado |
| Modulación por Dominio | Facilita escalabilidad y mantenimiento | ✅ Confirmado |

---

## Roadmap

### Fase 1: Fundación (Actual)
- [x] Estructura base backend (NestJS)
- [x] Estructura base frontend (Angular)
- [x] Autenticación JWT
- [ ] CRUD de Usuarios
- [ ] CRUD de Consultas
- [ ] CRUD de Mensajes
- [ ] Perfil de usuario

### Fase 2: Funcionalidades Core
- [ ] Panel de control (Dashboard)
- [ ] Gestión de roles
- [ ] Notificaciones en tiempo real (WebSocket)
- [ ] Carga de archivos
- [ ] Sistema de reportes

### Fase 3: Optimización
- [ ] Caché (Redis)
- [ ] Paginación avanzada
- [ ] Búsqueda full-text
- [ ] Logs y auditoría
- [ ] Tests e2e completos

### Fase 4: Deployment
- [ ] Dockerización
- [ ] CI/CD pipeline
- [ ] Production deployment
- [ ] Monitoreo y alertas

---

## Notas Importantes

- **Convención**: Imports en orden: Angular → NestJS → Proyecto → Tipos
- **Testing**: Jest para backend, Jasmine para frontend
- **Linting**: Respetar `eslint.config.mjs`
- **Dokumentación**: Actualizar este archivo con cambios arquitectónicos

---

**Próximas acciones:**
1. Implementar CRUD completo para cada dominio
2. Agregar autenticación real (login/register)
3. Crear tests unitarios
4. Configurar base de datos
