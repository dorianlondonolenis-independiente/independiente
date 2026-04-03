# 📋 Tareas del Proyecto - UnoEE

**Período:** 1 semana (sin login por ahora)
**Última actualización:** 03/04/2026

---

## ✅ Backend - Completadas

- [x] Conectar a SQL Server remota (10.10.1.48:1433)
- [x] Crear API de **Metadata** (4 endpoints)
  - [x] GET `/api/metadata/database` - Estructura completa
  - [x] GET `/api/metadata/tables` - Lista de tablas
  - [x] GET `/api/metadata/tables/:tableName/columns` - Columnas
  - [x] GET `/api/metadata/tables/:tableName/row-count` - Cantidad de registros
- [x] Crear API de **Data** (2 endpoints)
  - [x] GET `/api/data/:tableName` - SELECT con paginación
  - [x] GET `/api/data/:tableName/:idField/:idValue` - Registro específico
- [x] Documentación completa en `docs/API.md`
- [x] Implementar **Swagger** para documentación interactiva
- [x] CORS configurado para Angular (localhost:4200)
- [x] Validación global de DTOs

---

## ⏳ Backend - Pendientes

- [ ] Crear subnombres/aliases para tablas en una nueva tabla
- [ ] **Guardar consultas rápidas** (sistema de favoritos con selección de columnas)
- [ ] Endpoints para gestionar consultas rápidas (CRUD + selección dinámica de columnas)

---

## 🔄 Frontend - En Progreso

- [ ] **Componente tabla dinámica** 
  - [ ] Mostrar tablas en URL específica
  - [ ] Que el componente sea dinámico (cualquier tabla)
  - [ ] Paginación
- [ ] Implementar columnas calculadas (sumas, totales, etc.)
- [ ] Evaluar posibilidad de insertar **Stored Procedures** (SP)
- [ ] Consumir endpoints de metadata
- [ ] Consumir endpoints de data
- [ ] Seleccionar tabla y mostrar datos

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
```sql
CREATE TABLE SavedQueries (
  id INT PRIMARY KEY IDENTITY(1,1),
  nombre NVARCHAR(255) NOT NULL,
  tableName NVARCHAR(255) NOT NULL,
  columnNames NVARCHAR(MAX) NOT NULL, -- JSON array de columnas
  filtros NVARCHAR(MAX), -- Opcional: WHERE conditions en JSON
  createdAt DATETIME DEFAULT GETDATE(),
  description NVARCHAR(500)
)
```

### Endpoints SavedQueries
- **POST** `/api/queries` - Guardar: `{ tableName, columnNames: ["col1", "col2"], nombre, description }`
- **GET** `/api/queries` - Listar todas las consultas guardadas
- **GET** `/api/queries/:id/execute` - Ejecutar consulta guardada (retorna solo columnas seleccionadas)
- **DELETE** `/api/queries/:id` - Eliminar consulta

---

## 🎯 Proximas Acciones

1. **Este commit:**
   - Backend: Sistema de consultas rápidas CON selección de columnas dinámicas
   - Backend: Endpoints CRUD para SavedQueries
   - Frontend: Iniciar componente tabla dinámica

2. **Próximo commit:**
   - Backend: Subnombres/aliases de tablas
   - Frontend: Integrar con API de consultas rápidas

3. **Antes de la semana:**
   - Frontend: Columnas calculadas
   - Frontend: Búsqueda y filtros avanzados

---

## 📊 Porcentaje de Avance

**Backend:** 70% ✅
- Metadata: 100%
- Data (SELECT): 100%
- Features (Consultas rápidas, Aliases): 0%
- Documentación: 100%

**Frontend:** 0% ⏳
- Componentes: 0%
- Routing: 0%
- Servicios: 0%

**Total:** 35%

---

**Notas:**
- Swagger disponible en: `http://localhost:3000/swagger`
- Documentación API: `backend-app/docs/API.md`
- El servidor está corriendo en `http://localhost:3000`
- SQL Server conectado correctamente
