# 📋 Tareas del Proyecto - UnoEE

**Período:** 1 semana (sin login por ahora)
**Última actualización:** 09/04/2026

---

## ✅ Backend - Completadas

- [x] Conectar a SQL Server remota (10.10.1.48:1433)
- [x] Crear API de **Metadata** (4 endpoints)
  - [x] GET `/api/metadata/database` - Estructura completa
  - [x] GET `/api/metadata/tables` - Lista de tablas
  - [x] GET `/api/metadata/tables/:tableName/columns` - Columnas
  - [x] GET `/api/metadata/tables/:tableName/row-count` - Cantidad de registros
- [x] Crear API de **Data** (endpoints base + CRUD completo)
  - [x] GET `/api/data/:tableName` - SELECT con paginación (sin límite máximo)
  - [x] GET `/api/data/:tableName/:idField/:idValue` - Registro específico
  - [x] GET `/api/data/:tableName/primary-keys` - Primary Keys (usa sys tables + fallback IDENTITY)
  - [x] POST `/api/data/:tableName` - Crear registro
  - [x] PUT `/api/data/:tableName/:idField/:idValue` - Actualizar por PK
  - [x] PUT `/api/data/:tableName/by-row` - Actualizar usando todos los campos en WHERE (tablas sin PK, TOP 1)
  - [x] DELETE `/api/data/:tableName/:idField/:idValue` - Eliminar por PK
  - [x] POST `/api/data/:tableName/delete-by-row` - Eliminar usando todos los campos en WHERE (tablas sin PK, TOP 1)
- [x] Documentación completa en `docs/API.md`
- [x] Implementar **Swagger** para documentación interactiva
- [x] CORS configurado para Angular (localhost:4200)
- [x] Validación global de DTOs
- [x] **Guardar consultas rápidas** (sistema de favoritos con selección de columnas)
  - [x] Entidad SavedQuery en BD
  - [x] 6 endpoints CRUD con selección dinámica de columnas
  - [x] Endpoint para ejecutar consultas retornando solo columnas seleccionadas
  - [x] Documentación Swagger integrada
- [x] **Modelo relacional** generado automáticamente en `docs/MODELO-RELACIONAL.md`
  - [x] 1,477 tablas documentadas con columnas, tipos, PKs
  - [x] 9,669 Foreign Keys mapeadas
  - [x] Índices, conteo de filas, resumen de relaciones

---

## ⏳ Pendientes

- [ ] Implementar columnas calculadas (sumas, totales, etc.)
- [ ] Evaluar posibilidad de insertar **Stored Procedures** (SP)


## 🔄 Frontend - En Progreso

- [x] **Componente API Viewer Universal** ✨
  - [x] Componente standalone para consumir todos los endpoints
  - [x] Routing dinámico `/api-viewer/:endpoint/:id`
  - [x] Visualización genérica de datos en tablas
  - [x] Paginación integrada
  - [x] Manejo de errors
  - [x] Loading states
  - [x] Servicio centralizado para todos los endpoints
- [x] **Componente tabla dinámica con CRUD completo** ✨ (09/04/2026)
  - [x] Ruta `/table/:nombretabla` - Visualización dinámica de cualquier tabla
  - [x] Paginación con computed signals (sin loops de change detection)
  - [x] Buscador en tiempo real sobre todos los campos
  - [x] Selector de límite de registros (50, 100, 250, 500, 1000, Todos)
  - [x] Modal de **Crear registro** - Genera formulario dinámico por columnas
  - [x] Modal de **Editar registro** - Precarga datos, PKs deshabilitadas
  - [x] Modal de **Eliminar registro** - Confirmación antes de borrar
  - [x] Soporte tablas **con PK** (update/delete por PK)
  - [x] Soporte tablas **sin PK** (update/delete por TODOS los campos, TOP 1)
  - [x] `formData` como objeto plano para compatibilidad con `ngModel`
  - [x] Columnas metadata derivadas de datos cargados (no depende de endpoint metadata)
- [x] **Lista de tablas** (`/tables`)
  - [x] Carga desde metadata, muestra nombre/schema/filas
  - [x] Navegación directa a `/table/:nombre`
---

## 📌 Bugs Resueltos (09/04/2026)

- **Datos no cargaban (loop infinito):** `paginatedRows()` se llamaba como método en template y seteaba signals dentro, causando loops de change detection. Solución: convertir a `computed()`.
- **Modal CRUD no mostraba datos:** `[(ngModel)]="formData()[col.name]"` con signals no funciona (devuelve snapshot). Solución: `formData` como objeto plano con `[ngModel]` + `(ngModelChange)`.
- **UPDATE masivo (todos los registros):** Tablas sin PK usaban solo un campo en el WHERE. Solución: nuevo endpoint `by-row` que usa TODOS los campos en WHERE + `TOP(1)`.
- **Columnas metadata vacías:** Endpoint `/metadata/tables/:name/columns` devolvía 0 columnas. Solución: derivar columnas del `tableData()` ya cargado en vez del endpoint de metadata.
- **Primary Keys vacías:** Query con `INFORMATION_SCHEMA` no encontraba PKs. Solución: migrar a `sys.index_columns` + fallback a `sys.columns` (IDENTITY).

---

## 📌 Detalles de Tareas Pendientes

### Backend: Guardar Consultas Rápidas
**Descripción:** Sistema para guardar consultas frecuentes con selección de columnas
- Crear tabla `SavedQueries` en BD con campos: nombre, tableName, columnNames (array), filtros (opcional)
- Endpoint POST para guardar consulta con columnas específicas
- Endpoint GET para listar consultas guardadas
- Endpoint DELETE para eliminar consulta
- Al ejecutar consulta guardada, retornar SOLO las columnas seleccionadas
- **Ejemplo:** Guardar consulta "TOP 10 de conceptos" → traer solo columnas: id, descripcion, estado

### Backend: Subnombres de Tablas
**Descripción:** Asignar nombres amigables a tablas
- Crear tabla `TableAliases` en BD
- Endpoint para crear/actualizar alias
- Retornar alias en metadata si existe

### Frontend: Componente Tabla Dinámica
**Descripción:** Componente que se adapte a cualquier tabla
- Recibir nombre de tabla como parámetro
- Cargar metadata dinámicamente
- Mostrar columnas según estructura
- Paginación integrada
- Ejemplo: `/tablas/t145_mc_conceptos`

### Frontend: Columnas Calculadas
**Descripción:** Agregar columnas con cálculos
- Suma de columnas numéricas
- Totales por agrupación
- Conteos

---

## 🔧 Detalles Técnicos

### Estructura SavedQueries
**Query de creación ejecutado en SQL Server (03/04/2026):**
```sql
USE UnoEE;

CREATE TABLE [dbo].[SavedQueries] (
    [id] INT PRIMARY KEY IDENTITY(1,1),
    [nombre] NVARCHAR(255) NOT NULL,
    [tableName] NVARCHAR(255) NOT NULL,
    [columnNames] NVARCHAR(MAX) NOT NULL,
    [filtros] NVARCHAR(MAX) NULL,
    [description] NVARCHAR(500) NULL,
    [createdAt] DATETIME DEFAULT GETDATE()
);

-- Crear índice para búsquedas por tabla
CREATE INDEX [IX_SavedQueries_tableName] ON [dbo].[SavedQueries]([tableName]);
```

**Campos:**
- `id`: INT, clave primaria con auto-incremento
- `nombre`: Nombre descriptivo de la consulta (ej: "Conceptos principales")
- `tableName`: Nombre de la tabla a consultar (ej: "t145_mc_conceptos")
- `columnNames`: Array JSON con nombres de columnas a seleccionar
- `filtros`: Opcional - JSON con condiciones WHERE (ej: `{"f145_id_modulo": 1}`)
- `description`: Descripción adicional (opcional)
- `createdAt`: Timestamp automático de creación

### Endpoints SavedQueries
- **POST** `/api/queries` - Guardar: `{ tableName, columnNames: ["col1", "col2"], nombre, description }`
- **GET** `/api/queries` - Listar todas las consultas guardadas
- **GET** `/api/queries/:id/execute` - Ejecutar consulta guardada (retorna solo columnas seleccionadas)
- **DELETE** `/api/queries/:id` - Eliminar consulta

---

## 🎯 Proximas Acciones

### Frontend: API Viewer Universal
**Ubicación:** `src/app/features/api-viewer/`
**Archivos:**
- `api-viewer.component.ts` (Componente standalone)
- `api-viewer.service.ts` (Servicio centralizado)

**Rutas disponibles:**

| URL | Endpoint | Descripción |
|-----|----------|-------------|
| `/api-viewer/metadata/database` | GET /api/metadata/database | Estructura completa de BD |
| `/api-viewer/metadata/tables` | GET /api/metadata/tables | Lista de tablas |
| `/api-viewer/metadata/columns/t145_mc_conceptos` | GET /api/metadata/tables/:tableName/columns | Columnas de tabla |
| `/api-viewer/metadata/row-count/t145_mc_conceptos` | GET /api/metadata/tables/:tableName/row-count | Cantidad de registros |
| `/api-viewer/data/t145_mc_conceptos` | GET /api/data/:tableName?limit=100&offset=0 | Datos con paginación |
| `/api-viewer/queries` | GET /api/queries | Lista de consultas guardadas |
| `/api-viewer/queries/execute/1` | GET /api/queries/:id/execute | Ejecutar consulta guardada |

**Características:**
✅ Soporte para TODOS los endpoints del backend  
✅ Paginación automática  
✅ Visualización de tablas y JSON  
✅ Manejo de errores  
✅ Loading states  
✅ Información de metadatos de la consulta  

**Para expandir con nuevo endpoint:**
1. Agregar método en `ApiViewerService`
2. Agregar case en `getEndpointObservable()` del componente
3. Agregar URL en la sección de rutas arriba

1. **Próximo commit:**
   - Frontend: API Viewer Universal (COMPLETADO)
   - Backend: Subnombres/aliases de tablas con endpoints CRUD

2. **Segundo commit:**
   - Frontend: Dashboard con selector de tabla
   - Frontend: Integrar con API Viewer para mostrar datos dinámicamente

3. **Antes de la semana:**
   - Frontend: Columnas calculadas
   - Frontend: Búsqueda y filtros avanzados

---

## 📊 Porcentaje de Avance

**Backend:** 85% ✅
- Metadata: 100%
- Data (SELECT): 100%
- Consultas Rápidas: 100% ✨
- Aliases/Subnombres: 0%
- Documentación: 100%

**Frontend:** 20% ⏳ (UPDATED)
- API Viewer Universal: 100% ✨ (NUEVO)
- Componentes: 0%
- Routing: 50% (API Viewer routing listo)
- Servicios: 50% (Servicio centralizado listo)

**Total:** 55% 📈 (Actualizado a 03/04/2026)

---

**Notas:**
- Swagger disponible en: `http://localhost:3000/swagger`
- Documentación API: `backend-app/docs/API.md`
- El servidor está corriendo en `http://localhost:3000`
- SQL Server conectado correctamente
