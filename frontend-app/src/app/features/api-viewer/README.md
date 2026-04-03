# API Viewer Universal Component

## 📋 Descripción

Componente standalone de Angular 17+ que permite consumir **todos los endpoints del backend** de forma dinámica a través de las rutas URL.

No necesitas crear componentes separados para cada endpoint - este componente se adapta automáticamente.

---

## 🚀 Uso Rápido

### Rutas Disponibles

#### Metadata - Estructura de Base de Datos

```
http://localhost:4200/api-viewer/metadata/database
http://localhost:4200/api-viewer/metadata/tables
http://localhost:4200/api-viewer/metadata/columns/t145_mc_conceptos
http://localhost:4200/api-viewer/metadata/row-count/t145_mc_conceptos
```

#### Data - Obtener Registros

```
http://localhost:4200/api-viewer/data/t145_mc_conceptos          (primeros 100 registros)
http://localhost:4200/api-viewer/data/t145_mc_conceptos?limit=50&offset=100  (con paginación)
http://localhost:4200/api-viewer/data/single/t145_mc_conceptos/1 (registro específico)
```

#### Queries - Consultas Guardadas

```
http://localhost:4200/api-viewer/queries                (lista de consultas guardadas)
http://localhost:4200/api-viewer/queries/detail/1      (detalle de consulta específica)
http://localhost:4200/api-viewer/queries/execute/1     (ejecutar consulta guardada)
```

---

## 🏗️ Estructura de Archivos

```
src/app/features/api-viewer/
├── api-viewer.component.ts        # Componente principal (standalone)
├── api-viewer.service.ts          # Servicio centralizado
└── README.md                       # Este archivo (documentación)
```

---

## 🔧 Componentes y Servicios

### ApiViewerComponent

**Tipo:** Standalone Component  
**Imports:** CommonModule, HttpClientModule  
**Route Pattern:** `/api-viewer/:endpoint/:id`

**Signals (Reactive):**
- `endpointType` - Tipo de endpoint (metadata, data, queries)
- `endpointId` - ID del parámetro (nombre de tabla, id de consulta)
- `currentPage` - Página actual para paginación
- `data` - Los datos obtenidos del API
- `isLoading` - Estado de carga
- `error` - Mensaje de error (si existe)

**Métodos Principales:**
- `loadData()` - Carga los datos del endpoint
- `getColumns()` - Extrae columnas del dataset
- `nextPage() / previousPage()` - Navegación de paginación
- `getEndpointObservable()` - Mapea URLs a llamadas HTTP

---

### ApiViewerService

**Singleton Service** que centraliza todas las llamadas al backend.

**Métodos Disponibles:**

```typescript
// Metadata
getMetadataDatabase(): Observable<any>
getMetadataTables(): Observable<any>
getMetadataTableColumns(tableName: string): Observable<any>
getMetadataRowCount(tableName: string): Observable<any>

// Data
getTableData(tableName, limit = 100, offset = 0): Observable<any>
getTableSingleRecord(tableName, idField, idValue): Observable<any>

// Queries
getQueriesList(): Observable<any>
getQueryDetail(id: number): Observable<any>
executeQuery(id: number, limit = 100, offset = 0): Observable<any>
createQuery(queryData): Observable<any>
updateQuery(id: number, queryData): Observable<any>
deleteQuery(id: number): Observable<any>
```

---

## 📊 Tabla de Endpoints

| Ruta Frontend | Endpoint Backend | Método | Descripción |
|---------------|-----------------|--------|-------------|
| `/api-viewer/metadata/database` | GET `/api/metadata/database` | GET | Estructura completa |
| `/api-viewer/metadata/tables` | GET `/api/metadata/tables` | GET | Lista de tablas |
| `/api-viewer/metadata/columns/:table` | GET `/api/metadata/tables/:table/columns` | GET | Columnas de tabla |
| `/api-viewer/metadata/row-count/:table` | GET `/api/metadata/tables/:table/row-count` | GET | Registros totales |
| `/api-viewer/data/:table` | GET `/api/data/:table?limit=100&offset=0` | GET | Datos paginados |
| `/api-viewer/data/single/:table/:id` | GET `/api/data/:table/id/:id` | GET | Registro único |
| `/api-viewer/queries` | GET `/api/queries` | GET | Consultas guardadas |
| `/api-viewer/queries/detail/:id` | GET `/api/queries/:id` | GET | Detalle consulta |
| `/api-viewer/queries/execute/:id` | GET `/api/queries/:id/execute` | GET | Ejecutar consulta |

---

## 🎨 Características

✅ **Visualización automática de datos**
- Tablas para arrays de datos
- JSON formateado para objetos complejos

✅ **Paginación integrada**
- Navegación anterior/siguiente
- Indicador de página actual

✅ **Manejo de errores**
- Mensajes de error claros
- Captura de excepciones HTTP

✅ **Estados reactivos**
- Loading spinner
- Error alerts
- Empty states

✅ **Información de metadatos**
- Cantidad de registros
- Número de columnas
- Tamaño en bytes
- Endpoint llamado

---

## 📝 Ejemplos de Uso

### Ejemplo 1: Ver estructurah de base de datos

```
http://localhost:4200/api-viewer/metadata/database
```

Retorna: Lista de todas las tablas con sus columnas y tipos

---

### Ejemplo 2: Ver registros de una tabla

```
http://localhost:4200/api-viewer/data/t145_mc_conceptos
```

Retorna: Primeros 100 registros en formato tabla

---

### Ejemplo 3: Ejecutar consulta guardada con ID 1

```
http://localhost:4200/api-viewer/queries/execute/1
```

Retorna: Datos de la consulta guardada con paginación

---

## 🔌 Extensión: Agregar Nuevo Endpoint

Para agregar soporte a un nuevo endpoint:

1. **Agregar método en ApiViewerService:**

```typescript
getMyNewEndpoint(param: string): Observable<any> {
  return this.http.get(`${this.apiUrl}/my-endpoint/${param}`);
}
```

2. **Agregar case en getEndpointObservable():**

```typescript
case 'my-endpoint':
  return this.apiService.getMyNewEndpoint(id);
```

3. **Usar en la ruta:**

```
http://localhost:4200/api-viewer/my-endpoint/param-value
```

---

## 🚨 Troubleshooting

### Error: "Endpoint not found"
- Verifica que el tipo de endpoint esté soportado
- Revisa que el URL esté en el formato correcto

### CORS Error
- Asegúrate de que el backend está corriendo en `http://localhost:3000`
- Verifica que CORS esté habilitado en NestJS

### Datos no se cargan
- Abre la consola del navegador (F12) para ver detalles del error
- Verifica la conexión a la BD desde el backend

---

## 💡 Próximas Mejoras

- [ ] Agregar filtros y búsqueda
- [ ] Exportar a CSV/Excel
- [ ] Edición inline de datos
- [ ] Guardado de preferencias (columnas visibles, etc.)
- [ ] Dark mode
- [ ] Soporte para múltiples idiomas

---

**Última actualización:** 03/04/2026  
**Versión:** 1.0  
**Autor:** Anderson Roldan
