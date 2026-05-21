# 🚀 Quick Reference - Consultas Rápidas API

## 📌 Endpoints Resumen

```
POST   /api/queries                    │ Guardar consulta
GET    /api/queries                    │ Listar todas
GET    /api/queries/:id                │ Obtener detalles
GET    /api/queries/:id/execute        │ EJECUTAR (retorna datos)
PUT    /api/queries/:id                │ Actualizar
DELETE /api/queries/:id                │ Eliminar
```

---

## 🎯 Ejemplos Rápidos

### GUARDAR CONSULTA
```bash
curl -X POST http://localhost:3000/api/queries \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Conceptos activos",
    "tableName": "t145_mc_conceptos",
    "columnNames": ["id", "descripcion"],
    "description": "Mis conceptos"
  }'
```
**Response:** `{ "id": 1, "nombre": "...", ... }`

---

### LISTAR TODAS
```bash
curl -X GET http://localhost:3000/api/queries
```
**Response:** Array de todas las consultas

---

### OBTENER DETALLES
```bash
curl -X GET http://localhost:3000/api/queries/1
```
**Response:** Detalles de la consulta ID 1

---

### EJECUTAR (⭐ MÁS IMPORTANTE)
```bash
# Sin paginación
curl -X GET http://localhost:3000/api/queries/1/execute

# Con paginación
curl -X GET "http://localhost:3000/api/queries/1/execute?limit=50&offset=0"
```
**Response:**
```json
{
  "data": [
    { "id": 1, "descripcion": "Concepto 1" },
    { "id": 2, "descripcion": "Concepto 2" }
  ],
  "count": 2,
  "limit": 100,
  "offset": 0
}
```

---

### ACTUALIZAR
```bash
curl -X PUT http://localhost:3000/api/queries/1 \
  -H "Content-Type: application/json" \
  -d '{
    "columnNames": ["id", "descripcion", "estado"]
  }'
```

---

### ELIMINAR
```bash
curl -X DELETE http://localhost:3000/api/queries/1
```

---

## 🔑 Campos Importantes

### Guardar Consulta (POST)
| Campo | Tipo | Requerido | Ejemplo |
|-------|------|-----------|---------|
| nombre | string | ✅ | "Mi consulta" |
| tableName | string | ✅ | "t145_mc_conceptos" |
| columnNames | array | ✅ | ["id", "descripcion"] |
| description | string | ❌ | "Descripción opcional" |
| filtros | object | ❌ | { "estado": "ACTIVO" } |

---

## 📊 Paginación

Usar en `/execute`:
```bash
?limit=10&offset=0      # Primeros 10
?limit=10&offset=10     # Siguientes 10
?limit=50&offset=50     # Registros 50-100
```

Fórmula: `offset = (página_actual - 1) * limit`

---

## ⚠️ Errores Comunes

| Error | Solución |
|-------|----------|
| Campo requerido faltante | Enviar `nombre`, `tableName`, `columnNames` |
| Tabla no existe | Verificar nombre exacto de tabla |
| Query no encontrada | Verificar ID existe |
| JSON inválido | Revisar formato del body |

---

## 🎓 Caso de Uso Completo

```bash
# 1. Crear consulta
curl -X POST http://localhost:3000/api/queries \
  -d '{"nombre":"TOP10","tableName":"t001_usuario","columnNames":["id","usuario"]}'

# 2. Ejecutar (obtiene datos)
curl -X GET "http://localhost:3000/api/queries/1/execute?limit=10"

# 3. Si necesitas cambiar columnas
curl -X PUT http://localhost:3000/api/queries/1 \
  -d '{"columnNames":["id","usuario","email"]}'

# 4. Ejecutar de nuevo
curl -X GET http://localhost:3000/api/queries/1/execute?limit=10

# 5. Limpiar
curl -X DELETE http://localhost:3000/api/queries/1
```

---

## 🌐 Swagger Interactivo

Prueba los endpoints en: `http://localhost:3000/swagger`

Busca la sección **"Queries"** para:
- Documentación completa
- Probar endpoints directamente
- Ver esquemas de request/response
