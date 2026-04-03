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
- [ ] **Guardar consultas rápidas** (sistema de favoritos)
- [ ] Endpoints para gestionar consultas rápidas

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
**Descripción:** Sistema para guardar consultas frecuentes
- Crear tabla `SavedQueries` en BD
- Endpoint POST para guardar consulta
- Endpoint GET para listar consultas guardadas
- Endpoint DELETE para eliminar consulta

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

## 🎯 Proximas Acciones

1. **Este commit:**
   - Backend: Sistema de consultas rápidas
   - Frontend: Iniciar componente tabla dinámica

2. **Próximo commit:**
   - Backend: Subnombres/aliases de tablas
   - Frontend: Integrar con API de data

3. **Antes de la semana:**
   - Frontend: Columnas calculadas
   - Frontend: Búsqueda y filtros

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
