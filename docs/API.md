# API REST — Referencia de Endpoints

**Base URL:** `http://localhost:3000/api`  
**Autenticación:** `Authorization: Bearer <token>` (todos excepto `/auth/login`)  
**Swagger interactivo:** `http://localhost:3000/swagger`

---

## Autenticación

### Login
```http
POST /api/auth/login
{ "username": "admin@local", "password": "tu_password" }
```
**Respuesta:** `{ "token": "eyJ...", "user": { "id": "...", "username": "...", "rol": "admin" } }`

### Logout
```http
POST /api/auth/logout
```

### Perfil actual
```http
POST /api/auth/me
```

---

## Usuarios *(solo rol admin)*

```http
GET    /api/users               # Listar todos
POST   /api/users               # Crear: { username, email, nombre, password, rol }
PUT    /api/users/:id           # Actualizar: { nombre, password }
DELETE /api/users/:id           # Eliminar
```
- `rol`: `"admin"` | `"user"`

---

## Licencias *(solo rol admin)*

```http
POST /api/license/apply           # { userId, key }
GET  /api/license/history/:userId # Historial de keys aplicadas
```
> Para **generar** una key ver `licensing-tool/` → `docs/MANUAL.md` sección Licencias.

---

## Metadata

```http
GET /api/metadata/tables
GET /api/metadata/tables/:tableName/columns
GET /api/metadata/tables/:tableName/row-count
GET /api/metadata/database
```

---

## Datos

```http
GET    /api/data/:tableName                        # Listar paginado (?page=1&limit=50&search=)
GET    /api/data/:tableName/export-csv             # Exportar CSV
GET    /api/data/:tableName/:idField/:idValue      # Fila por PK
POST   /api/data/:tableName                        # Insertar
PUT    /api/data/:tableName/:idField/:idValue      # Actualizar
DELETE /api/data/:tableName/:idField/:idValue      # Eliminar
```

---

## Queries Guardadas

```http
POST   /api/queries                  # Guardar: { nombre, tableName, columnNames[], description }
GET    /api/queries                  # Listar
GET    /api/queries/:id              # Obtener
GET    /api/queries/:id/execute      # Ejecutar y devolver datos
PUT    /api/queries/:id              # Actualizar
DELETE /api/queries/:id              # Eliminar
```

---

## SIESA XML — Traslados de Ventas

Todos reciben `multipart/form-data` con campo `file` (Excel `.xlsx`).

**Query params comunes:**
| Param | Ejemplo | Descripción |
|---|---|---|
| `periodo` | `202605` | YYYYMM |
| `cuenta` | `41204510` | Código PUC de ventas |
| `tipoDocto` | `FAF` | Tipo comprobante SIESA |
| `fecha` | `20260531` | Fecha contable YYYYMMDD |
| `idCia` | `1` | ID compañía SIESA |
| `conexion` | `Pruebas` | Nombre conexión SIESA |
| `usuario` | `unoee` | Usuario SIESA |
| `clave` | `unoee26` | Clave SIESA |
| `url` | `http://192.168.1.70/WSUNOEE/WFPruebaImportar.aspx` | Solo para /enviar |

```http
POST /api/siesa-xml/traslados/preview   # Previsualizar distribución (sin crear docs)
POST /api/siesa-xml/traslados/generar   # Descargar XML
POST /api/siesa-xml/traslados/enviar    # Importar a SIESA + aprobar automáticamente
GET  /api/siesa-xml/cuentas/buscar?q=  # Buscar cuenta contable
GET  /api/siesa-xml/cuentas/ventas-periodo?co=&periodo=  # Detectar cuenta desde movimientos
GET  /api/siesa-xml/cuentas/validar?co=&periodo=&cuenta= # Validar cuenta vs BD
```

**Respuesta de `/enviar`:**
```json
{
  "ok": true, "status": 200, "printTipoError": 0, "totalTraslados": 3,
  "aprobaciones": [{ "rowid": 18161, "consec": 168, "error": 0, "descripcion": "Aprobado" }],
  "respuesta": "<...SOAP completo...>",
  "xmlEnviado": "<Importar>...</Importar>"
}
```

**Códigos printTipoError:**
| Código | Significado |
|---|---|
| 0 | Éxito |
| 1 | Error en datos (cuenta inválida, tercero no existe) |
| 2 | Credenciales incorrectas |
| 3 | XML inválido o fecha no corresponde al periodo |

---

## Chat IA *(en desarrollo)*

```http
POST /api/chat/query
{ "pregunta": "cuáles fueron las ventas del mes pasado por vendedor?" }
```
**Respuesta:** `{ "sql": "SELECT TOP 10 ...", "resultado": [...], "tokens": 142 }`
> Solo `SELECT`, `TOP 10` automático, sin DML/DDL.

---

## Ventas / Inventario / Compras / Cartera / Terceros

```http
GET /api/ventas/stats
GET /api/ventas/pedidos          GET /api/ventas/pedidos/:rowid
GET /api/ventas/facturas         GET /api/ventas/facturas/:rowid
GET /api/ventas/remisiones       GET /api/ventas/remisiones/:rowid
GET /api/ventas/devoluciones     GET /api/ventas/devoluciones/:rowid

GET /api/inventario/stock        GET /api/inventario/stats
GET /api/inventario/bodegas      GET /api/inventario/stock-por-bodega

GET /api/compras/stats           GET /api/compras/ordenes
GET /api/compras/ordenes/:rowid

GET /api/cartera/stats           GET /api/cartera/saldos
GET /api/cartera/aging

GET /api/terceros/stats          GET /api/terceros/lista
GET /api/terceros/:rowid
```

---

## Financiero

```http
POST /api/financiero/conciliacion-ventas
GET  /api/financiero/conciliacion-ventas/plantilla
POST /api/financiero/conciliacion-compras
GET  /api/financiero/conciliacion-compras/plantilla
```

---

*Última actualización: Junio 2026 — Ver Swagger en `/swagger` para detalles interactivos*
