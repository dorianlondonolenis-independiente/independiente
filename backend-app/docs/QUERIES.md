# 📚 Documentación - API de Consultas Rápidas

**Base URL:** `http://localhost:3000/api`

---

## 🎯 Endpoints de Consultas Rápidas

### 1️⃣ POST `/api/queries` - Guardar una Consulta Rápida

Crea una nueva consulta guardada con columnas específicas.

**Request Body:**
```json
{
  "nombre": "Conceptos principales",
  "tableName": "t145_mc_conceptos",
  "columnNames": ["id", "descripcion", "estado"],
  "description": "Consulta para conceptos activos",
  "filtros": {
    "estado": "ACTIVO"
  }
}
```

**Parámetros:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `nombre` | string | ✅ | Nombre identificador de la consulta |
| `tableName` | string | ✅ | Nombre de la tabla a consultar |
| `columnNames` | array | ✅ | Array con nombres de columnas a retornar |
| `description` | string | ❌ | Descripción para referencia |
| `filtros` | object | ❌ | Filtros WHERE opcionales en JSON |

**Response (201 Created):**
```json
{
  "id": 1,
  "nombre": "Conceptos principales",
  "tableName": "t145_mc_conceptos",
  "columnNames": ["id", "descripcion", "estado"],
  "description": "Consulta para conceptos activos",
  "createdAt": "2026-04-03T16:45:00.000Z"
}
```

**Ejemplos cURL:**
```bash
# Guardar consulta sin filtros
curl -X POST http://localhost:3000/api/queries \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "TOP Conceptos",
    "tableName": "t145_mc_conceptos",
    "columnNames": ["id", "descripcion"],
    "description": "Los conceptos más importantes"
  }'

# Guardar consulta CON filtros
curl -X POST http://localhost:3000/api/queries \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Conceptos Activos",
    "tableName": "t145_mc_conceptos",
    "columnNames": ["id", "descripcion", "estado"],
    "description": "Solo conceptos activos",
    "filtros": {
      "estado": "ACTIVO"
    }
  }'
```

---

### 2️⃣ GET `/api/queries` - Listar Todas las Consultas

Obtiene el listado completo de consultas guardadas ordenadas por fecha (más recientes primero).

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "nombre": "Conceptos principales",
    "tableName": "t145_mc_conceptos",
    "columnNames": ["id", "descripcion", "estado"],
    "description": "Consulta para conceptos activos",
    "createdAt": "2026-04-03T16:45:00.000Z"
  },
  {
    "id": 2,
    "nombre": "Usuarios activos",
    "tableName": "t001_usuario",
    "columnNames": ["id", "usuario", "email"],
    "description": "Cambio listado de usuarios",
    "createdAt": "2026-04-03T16:40:00.000Z"
  }
]
```

**Ejemplos cURL:**
```bash
curl -X GET http://localhost:3000/api/queries \
  -H "Content-Type: application/json"
```

---

### 3️⃣ GET `/api/queries/:id` - Obtener Detalles de una Consulta

Retorna los detalles específicos de una consulta guardada.

**Parámetros URL:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | number | ID de la consulta guardada |

**Response (200 OK):**
```json
{
  "id": 1,
  "nombre": "Conceptos principales",
  "tableName": "t145_mc_conceptos",
  "columnNames": ["id", "descripcion", "estado"],
  "description": "Consulta para conceptos activos",
  "createdAt": "2026-04-03T16:45:00.000Z"
}
```

**Ejemplos cURL:**
```bash
curl -X GET http://localhost:3000/api/queries/1 \
  -H "Content-Type: application/json"
```

---

### 4️⃣ GET `/api/queries/:id/execute` - Ejecutar Consulta Guardada

**⚠️ IMPORTANTE:** Este es el endpoint principal para usar consultas guardadas. Retorna **SOLO las columnas seleccionadas** con soporte para paginación.

**Parámetros URL:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | number | ID de la consulta guardada |

**Query Parameters:**
| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `limit` | number | 100 | Cantidad de registros a retornar |
| `offset` | number | 0 | Desplazamiento para paginación |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "descripcion": "Concepto 1",
      "estado": "ACTIVO"
    },
    {
      "id": 2,
      "descripcion": "Concepto 2",
      "estado": "ACTIVO"
    }
  ],
  "count": 2,
  "limit": 100,
  "offset": 0
}
```

**Ejemplos cURL:**
```bash
# Ejecutar con parámetros por defecto
curl -X GET http://localhost:3000/api/queries/1/execute \
  -H "Content-Type: application/json"

# Con paginación personalizada
curl -X GET "http://localhost:3000/api/queries/1/execute?limit=50&offset=0" \
  -H "Content-Type: application/json"

# Segunda página (10 registros por página)
curl -X GET "http://localhost:3000/api/queries/1/execute?limit=10&offset=10" \
  -H "Content-Type: application/json"
```

**Casos de Uso:**
```bash
# Obtener primeros 10 registros
?limit=10&offset=0

# Obtener siguientes 10 registros
?limit=10&offset=10

# Obtener siguiente página en paginación de 50
?limit=50&offset=50

# Obtener todos sin límite (cuidado con tablas grandes)
?limit=10000&offset=0
```

---

### 5️⃣ PUT `/api/queries/:id` - Actualizar una Consulta

Actualiza los parámetros de una consulta guardada.

**Parámetros URL:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | number | ID de la consulta a actualizar |

**Request Body (todos opcionales):**
```json
{
  "nombre": "Conceptos modificado",
  "columnNames": ["id", "descripcion"],
  "description": "Descripción actualizada",
  "filtros": {
    "estado": "INACTIVO"
  }
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "nombre": "Conceptos modificado",
  "tableName": "t145_mc_conceptos",
  "columnNames": ["id", "descripcion"],
  "description": "Descripción actualizada",
  "createdAt": "2026-04-03T16:45:00.000Z"
}
```

**Ejemplos cURL:**
```bash
# Cambiar nombre y columnas
curl -X PUT http://localhost:3000/api/queries/1 \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Nuevo nombre",
    "columnNames": ["id", "descripcion", "tipo"]
  }'

# Cambiar solo la descripción
curl -X PUT http://localhost:3000/api/queries/1 \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Nueva descripción"
  }'

# Actualizar filtros
curl -X PUT http://localhost:3000/api/queries/1 \
  -H "Content-Type: application/json" \
  -d '{
    "filtros": {
      "estado": "ACTIVO",
      "tipo": "GENERAL"
    }
  }'
```

---

### 6️⃣ DELETE `/api/queries/:id` - Eliminar una Consulta

Borra permanentemente una consulta guardada.

**Parámetros URL:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | number | ID de la consulta a eliminar |

**Response (200 OK):**
```json
{
  "message": "Query 1 deleted successfully"
}
```

**Ejemplos cURL:**
```bash
curl -X DELETE http://localhost:3000/api/queries/1 \
  -H "Content-Type: application/json"
```

**Response en caso de query no encontrada (404):**
```json
{
  "statusCode": 404,
  "message": "Error deleting query: Query with ID 999 not found"
}
```

---

## 🔄 Flujo Típico de Uso

### Escenario: Guardar y reutilizar una consulta

**1. Crear la consulta:**
```bash
curl -X POST http://localhost:3000/api/queries \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Mi consulta importante",
    "tableName": "t145_mc_conceptos",
    "columnNames": ["id", "descripcion"],
    "filtros": { "estado": "ACTIVO" }
  }'
# Respuesta: { "id": 1, ... }
```

**2. Usar la consulta guardada (primera vez):**
```bash
curl -X GET http://localhost:3000/api/queries/1/execute \
  -H "Content-Type: application/json"
# Retorna: { "data": [...datos...], "count": 50, "limit": 100, "offset": 0 }
```

**3. Usar con paginación:**
```bash
# Página 1 (primeros 10)
curl -X GET "http://localhost:3000/api/queries/1/execute?limit=10&offset=0"

# Página 2 (siguientes 10)
curl -X GET "http://localhost:3000/api/queries/1/execute?limit=10&offset=10"
```

**4. Actualizar si es necesario:**
```bash
curl -X PUT http://localhost:3000/api/queries/1 \
  -H "Content-Type: application/json" \
  -d '{ "columnNames": ["id", "descripcion", "estado"] }'
```

**5. Eliminar cuando ya no se use:**
```bash
curl -X DELETE http://localhost:3000/api/queries/1
```

---

## ✅ Validaciones y Errores

### Errores Comunes:

**1. Campo requerido faltante (POST):**
```json
{
  "statusCode": 400,
  "message": "Bad Request",
  "error": "nombre should not be empty"
}
```

**2. Tabla no existe (Execute):**
```json
{
  "statusCode": 500,
  "message": "Error executing query: Invalid object name 'tabla_inexistente'"
}
```

**3. Consulta no encontrada:**
```json
{
  "statusCode": 404,
  "message": "Error retrieving query: Query with ID 999 not found"
}
```

---

## 💡 Tips y Mejores Prácticas

### ✨ Columnas Dinámicas
```bash
# ❌ NO hacer esto - traer todas las columnas
GET /api/data/t145_mc_conceptos

# ✅ HACER esto - usar consulta guardada con columnas específicas
POST /api/queries
GET /api/queries/:id/execute
```

### 🔍 Selectividad
```bash
# Guardar solo lo que necesitas
"columnNames": ["id", "descripcion"]  # ✅ 2 columnas

# En lugar de
"columnNames": ["id", "descripcion", "estado", "tipo", "nivel", ...]  # ❌ muchas
```

### 📊 Paginación Eficiente
```bash
# Para tablas grandes, usar limit pequeño
?limit=50&offset=0    # ✅ 50 registros
?limit=10000&offset=0 # ❌ puede ser lento

# Calcular offset: (página - 1) * limit
# Página 5 con limit=10: offset = (5-1)*10 = 40
```

### 🎯 Filtros Útiles
```json
{
  "filtros": {
    "estado": "ACTIVO",
    "tipo": "PRINCIPAL"
  }
}
```

---

## 📍 Verificación en Swagger

Todos estos endpoints están documentados en Swagger:
```
http://localhost:3000/swagger
```

Busca la sección **"Queries"** para ver la documentación interactiva y probar los endpoints.

---

**¿Necesitas más ejemplos para algún caso de uso específico?**
