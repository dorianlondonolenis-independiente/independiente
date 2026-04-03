# API REST - Documentación de Endpoints

## Base URL
```
http://localhost:3000/api
```

---

## 📊 Metadata Endpoints

### 1. Obtener estructura completa de la base de datos
```http
GET /api/metadata/database
```

**Descripción:** Retorna la estructura completa de la base de datos incluyendo todas las tablas, columnas y cantidad de registros.

**Respuesta:**
```json
{
  "database": "UnoEE",
  "tables": [
    {
      "name": "t145_mc_conceptos",
      "schema": "dbo",
      "rowCount": 150,
      "columns": [
        {
          "name": "id",
          "type": "int",
          "nullable": false,
          "isPrimaryKey": true,
          "maxLength": null
        },
        {
          "name": "nombre",
          "type": "varchar",
          "nullable": true,
          "isPrimaryKey": false,
          "maxLength": 255
        }
      ]
    }
  ],
  "totalTables": 5
}
```

---

### 2. Listar todas las tablas
```http
GET /api/metadata/tables
```

**Descripción:** Obtiene la lista de todas las tablas de la base de datos con información básica.

**Respuesta:**
```json
[
  {
    "name": "t145_mc_conceptos",
    "schema": "dbo",
    "rowCount": 150,
    "columns": [...]
  },
  {
    "name": "Usuarios",
    "schema": "dbo",
    "rowCount": 42,
    "columns": [...]
  }
]
```

---

### 3. Obtener columnas de una tabla
```http
GET /api/metadata/tables/:tableName/columns
```

**Parámetros:**
- `:tableName` (string) - Nombre de la tabla

**Ejemplo:**
```
GET /api/metadata/tables/t145_mc_conceptos/columns
```

**Respuesta:**
```json
{
  "table": "t145_mc_conceptos",
  "columns": [
    {
      "name": "id",
      "type": "int",
      "nullable": false,
      "isPrimaryKey": true,
      "maxLength": null
    },
    {
      "name": "codigo",
      "type": "varchar",
      "nullable": false,
      "isPrimaryKey": false,
      "maxLength": 50
    },
    {
      "name": "descripcion",
      "type": "varchar",
      "nullable": true,
      "isPrimaryKey": false,
      "maxLength": 500
    }
  ],
  "totalColumns": 3
}
```

---

### 4. Obtener cantidad de registros de una tabla
```http
GET /api/metadata/tables/:tableName/row-count
```

**Parámetros:**
- `:tableName` (string) - Nombre de la tabla

**Ejemplo:**
```
GET /api/metadata/tables/t145_mc_conceptos/row-count
```

**Respuesta:**
```json
{
  "table": "t145_mc_conceptos",
  "rowCount": 150
}
```

---

## 📋 Data Endpoints

### 5. Obtener todos los registros de una tabla (con paginación)
```http
GET /api/data/:tableName?limit=100&offset=0
```

**Parámetros:**
- `:tableName` (string) - Nombre de la tabla
- `limit` (number, optional) - Cantidad de registros a retornar (default: 100, máximo: 10000)
- `offset` (number, optional) - Desplazamiento para paginación (default: 0)

**Ejemplos:**
```bash
# Obtener los primeros 100 registros
GET /api/data/t145_mc_conceptos

# Obtener 50 registros con offset de 100
GET /api/data/t145_mc_conceptos?limit=50&offset=100

# Obtener 200 registros
GET /api/data/Usuarios?limit=200
```

**Respuesta:**
```json
{
  "table": "t145_mc_conceptos",
  "total": 150,
  "limit": 100,
  "offset": 0,
  "data": [
    {
      "id": 1,
      "codigo": "CONC001",
      "descripcion": "Concepto de prueba",
      "estado": "A"
    },
    {
      "id": 2,
      "codigo": "CONC002",
      "descripcion": "Otro concepto",
      "estado": "A"
    }
  ]
}
```

---

### 6. Obtener un registro específico por ID
```http
GET /api/data/:tableName/:idField/:idValue
```

**Parámetros:**
- `:tableName` (string) - Nombre de la tabla
- `:idField` (string) - Campo que actúa como identificador
- `:idValue` (string/number) - Valor del identificador

**Ejemplos:**
```bash
# Obtener registro con id=123
GET /api/data/t145_mc_conceptos/id/123

# Obtener registro con codigo=CONC001
GET /api/data/t145_mc_conceptos/codigo/CONC001

# Obtener usuario con email
GET /api/data/Usuarios/email/usuario@example.com
```

**Respuesta:**
```json
{
  "table": "t145_mc_conceptos",
  "record": {
    "id": 123,
    "codigo": "CONC001",
    "descripcion": "Concepto de prueba",
    "estado": "A",
    "fecha_creacion": "2026-01-15T10:30:00Z"
  },
  "found": true
}
```

**Respuesta (no encontrado):**
```json
{
  "table": "t145_mc_conceptos",
  "record": null,
  "found": false
}
```

---

## 🔧 Ejemplos con cURL

### Obtener todas las tablas
```bash
curl http://localhost:3000/api/metadata/tables
```

### Obtener columnas de una tabla
```bash
curl http://localhost:3000/api/metadata/tables/t145_mc_conceptos/columns
```

### Obtener registro por ID (con formato JSON)
```bash
curl -H "Content-Type: application/json" \
  http://localhost:3000/api/data/t145_mc_conceptos/id/1
```

### Obtener datos con paginación
```bash
curl "http://localhost:3000/api/data/Usuarios?limit=30&offset=0"
```

---

## 📝 Notas Importantes

- **Sanitización**: Los nombres de tablas y campos se validan automáticamente para evitar SQL injection
- **Límites de paginación**: El máximo de registros por consulta es 10,000
- **Offset**: Útil para implementar paginación en el frontend
- **Case sensitivity**: Los nombres de tablas no son sensibles a mayúsculas/minúsculas en SQL Server
- **Todos los endpoints son GET**: Sin autenticación por el momento

---

## 🚀 Próximos endpoints (planificados)

- `POST /api/data/:tableName` - Crear nuevo registro
- `PUT /api/data/:tableName/:idField/:idValue` - Actualizar registro
- `DELETE /api/data/:tableName/:idField/:idValue` - Eliminar registro
- `POST /api/auth/login` - Autenticación JWT
- `GET /api/protected-route` - Rutas protegidas con JWT

---

**Última actualización:** 03/04/2026
