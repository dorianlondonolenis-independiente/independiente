# Visor de Tablas y Consultas

Aplicación fullstack para visualizar tablas y consultas guardadas de una base de datos SQL Server.

## Stack

- **Backend:** NestJS 11 + TypeORM + SQL Server (`localhost:3000`)
- **Frontend:** Angular 21 (standalone + Signals) + Bootstrap 5 (`localhost:4200`)

## Arrancar

```bash
# Backend
cd backend-app
npm run start

# Frontend (otra terminal)
cd frontend-app
npx ng serve
```

> Requiere VPN activa para conectar al SQL Server en `10.10.1.48:1433`

## Rutas frontend

| Ruta | Descripción |
|------|-------------|
| `/tables` | Lista todas las tablas de la BD |
| `/queries` | Lista las consultas guardadas |
| `/table/:endpoint` | Muestra datos — si `:endpoint` es número ejecuta la query, si es string carga la tabla |

## Endpoints backend

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/metadata/database` | Todas las tablas con metadatos |
| GET | `/api/data/:tableName` | Datos de una tabla |
| GET | `/api/queries` | Listar consultas guardadas |
| POST | `/api/queries` | Crear consulta guardada |
| GET | `/api/queries/:id` | Obtener consulta por ID |
| PUT | `/api/queries/:id` | Actualizar consulta |
| DELETE | `/api/queries/:id` | Eliminar consulta |
| GET | `/api/queries/:id/execute` | Ejecutar consulta y retornar datos |

Swagger disponible en `http://localhost:3000/swagger`

## Arquitectura frontend

```
src/app/
├── components/
│   ├── tables-list/          → /tables
│   ├── queries-list/         → /queries
│   └── list-table-dynamic/   → /table/:endpoint
├── services/
│   └── api-viewer.service.ts → lógica HTTP centralizada
└── app.routes.server.ts      → SSR en modo Client (sin pre-render)
```

## Tareas pendientes

- [ ] Vista para filtrar datos por columna (`/api/data/:tableName/:idField/:idValue`)
- [ ] Paginación en la tabla de datos (actualmente carga 100 registros)
- [ ] Buscador/filtro en `/tables` y `/queries`
- [ ] Crear/editar/eliminar consultas desde la UI


## generar key 
#cd C:\Users\doria\OneDrive\Escritorio\INDEPENDIENTE\licensing-tool

node generar-key.js --userId=<UUID-del-usuario> --username=usuario@empresa.com --meses=6


node generar-key.js --userId=a1b2c3d4-e5f6-7890-abcd-ef1234567890 --username=cliente@empresa.com --meses=6