# INDEPENDIENTE — Manual Técnico Completo

## Índice
1. [Descripción General](#descripción-general)
2. [Arquitectura](#arquitectura)
3. [Requisitos](#requisitos)
4. [Instalación desde Cero](#instalación-desde-cero)
5. [Desarrollo (modo dev)](#desarrollo-modo-dev)
6. [Build y Producción](#build-y-producción)
7. [Módulos del Sistema](#módulos-del-sistema)
8. [Chat IA Local (Ollama)](#chat-ia-local-ollama)
9. [Variables de Entorno](#variables-de-entorno)
10. [Estructura de Carpetas](#estructura-de-carpetas)
11. [Comandos Rápidos](#comandos-rápidos)
12. [Troubleshooting](#troubleshooting)

---

## Descripción General

Herramienta interna para gestión de datos ERP (SIESA UnoEE). Permite:
- Consulta y visualización de tablas de BD (SQL Server)
- Importación de documentos contables via XML/SOAP a SIESA
- Traslados de ventas entre Centros de Operación (CO)
- Chat en lenguaje natural sobre datos de ventas, inventario y compras (IA local)

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│  Usuario (Navegador)                                     │
│  http://localhost:4200  (dev)                           │
│  http://localhost:3000  (prod — servido por backend)    │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP / REST
┌──────────────────────▼──────────────────────────────────┐
│  Backend NestJS  (puerto 3000)                          │
│  • API REST con JWT Auth                                │
│  • Módulos: datos, metadata, queries, siesa-xml, chat   │
│  • Swagger: http://localhost:3000/swagger               │
└──────┬───────────────────────────┬──────────────────────┘
       │ mssql                     │ HTTP
┌──────▼──────┐           ┌────────▼────────┐
│  SQL Server │           │  Ollama :11434  │
│  192.168.1.70           │  qwen2.5:7b     │
│  DB: unoee_pruebas      │  (IA local)     │
└─────────────┘           └─────────────────┘
                                   │ SOAP
                          ┌────────▼────────┐
                          │  SIESA UnoEE    │
                          │  192.168.1.70   │
                          │  /WSUNOEE/...   │
                          └─────────────────┘
```

---

## Requisitos

### Software obligatorio
| Software | Versión mínima | Descarga |
|---|---|---|
| Node.js | 20 LTS | https://nodejs.org |
| npm | 10+ | (incluido con Node.js) |
| Ollama | Última | https://ollama.com/download |

### Recursos de Ollama (modelo IA)
```bash
# Después de instalar Ollama, descargar el modelo:
ollama pull qwen2.5:7b
# Tamaño: ~4.7 GB
# Requiere: 8GB RAM mínimo (16GB recomendado), GPU opcional (GTX 1050+ mejora velocidad)
```

### Acceso de red requerido
| Recurso | Dirección | Puerto |
|---|---|---|
| SQL Server SIESA | 192.168.1.70 | 1433 |
| SOAP SIESA | 192.168.1.70 | 80 |
| Ollama (local) | localhost | 11434 |

---

## Instalación desde Cero

### Paso 1: Clonar repositorio
```bash
git clone https://github.com/dorianlondonolenis-independiente/independiente.git
cd independiente
```

### Paso 2: Instalar dependencias
```bat
# Opción A: Script automático
scripts\install-deps.bat

# Opción B: Manual
cd backend-app && npm install
cd ../frontend-app && npm install
```

### Paso 3: Configurar variables de entorno
```bash
# Copiar el ejemplo y editar
cp backend-app/.env.example backend-app/.env
# Editar backend-app/.env con los valores correctos (ver sección Variables de Entorno)
```

### Paso 4: Instalar Ollama + modelo
1. Descargar e instalar Ollama: https://ollama.com/download/OllamaSetup.exe
2. Abrir terminal y ejecutar:
```bash
ollama pull qwen2.5:7b
```

### Paso 5: Compilar backend
```bash
cd backend-app
npm run build
```

---

## Desarrollo (modo dev)

```bat
REM Opción A: Script automático (abre 2 ventanas)
scripts\start-dev.bat

REM Opción B: Manual (2 terminales separados)
# Terminal 1 - Backend:
cd backend-app
node dist\main.js

# Terminal 2 - Frontend (con hot-reload):
cd frontend-app
npm start
```

**URLs en desarrollo:**
- Frontend: http://localhost:4200
- Backend API: http://localhost:3000/api
- Swagger: http://localhost:3000/swagger

**Credenciales de acceso:**
- Usuario: `admin@local`
- Contraseña: (ver `.env` → `ADMIN_PASSWORD`)

---

## Build y Producción

### Compilar todo
```bat
scripts\build-produccion.bat
```
Genera los artefactos en `dist-produccion/`:
```
dist-produccion/
├── backend/          ← Node.js compilado (copiar al servidor)
│   ├── dist/
│   ├── node_modules/
│   └── package.json
└── frontend/         ← Archivos estáticos (servidos por el backend)
    └── browser/
```

### Iniciar en producción
```bat
scripts\start-produccion.bat
```

### Despliegue manual en servidor
```bash
# 1. Copiar dist-produccion/backend/ al servidor
# 2. En el servidor:
node dist/main.js
# El backend sirve el frontend estático automáticamente desde dist-produccion/frontend/
```

---

## Módulos del Sistema

### Autenticación
- JWT con expiración configurable
- Login: `POST /api/auth/login` `{ username, password }`
- Token en header: `Authorization: Bearer <token>`

### Datos / Metadata
- Explorador de tablas SQL Server
- `GET /api/metadata/tables` — lista de tablas
- `GET /api/data/:tabla` — datos paginados

### SIESA XML — Traslados de Ventas
**Flujo completo:**
1. Subir Excel (hoja `TB_CO`: columnas TERCERO, CO, %CO1..%CO20)
2. Ingresar periodo `YYYYMM` y cuenta contable
3. Previsualizar distribución
4. Enviar → importa XML a SIESA → aprueba documentos automáticamente

**Endpoints:**
```
POST /api/siesa-xml/traslados/preview   ← solo previsualizar
POST /api/siesa-xml/traslados/generar   ← descarga XML
POST /api/siesa-xml/traslados/enviar    ← importa + aprueba
```

**Parámetros requeridos:**
| Param | Valor |
|---|---|
| periodo | YYYYMM (ej: 202605) |
| cuenta | Código PUC (ej: 41204510) |
| tipoDocto | FAF |
| fecha | YYYYMMDD |
| conexion | Pruebas |
| usuario | unoee |
| clave | unoee26 |
| url | http://192.168.1.70/WSUNOEE/WFPruebaImportar.aspx |

### Chat IA (en desarrollo)
Ver sección [Chat IA Local](#chat-ia-local-ollama).

---

## Chat IA Local (Ollama)

### Descripción
Chat en lenguaje natural que traduce preguntas a SQL Server, ejecuta las queries y muestra los resultados.

### Modelo usado
- **qwen2.5:7b** — optimizado para text-to-SQL, corre en CPU/GPU local
- Alternativas: `qwen2.5:3b` (más rápido, menos preciso), `qwen2.5:14b` (más preciso, requiere más RAM)

### Seguridad implementada
- Solo queries `SELECT` permitidas — el backend rechaza cualquier DML/DDL
- `TOP 10` aplicado automáticamente si no se especifica límite
- Sanitización de inputs antes de enviar al modelo

### Endpoint (backend)
```
POST /api/chat/query
Authorization: Bearer <token>
{ "pregunta": "cuáles fueron las ventas del mes pasado?" }

Respuesta:
{
  "sql": "SELECT TOP 10 ...",
  "resultado": [...],
  "pregunta": "...",
  "tokens": 142
}
```

### Cómo funciona internamente
```
Pregunta usuario
     ↓
Backend arma prompt con schema curado de BD
     ↓
Ollama (qwen2.5:7b) genera SQL
     ↓
Backend valida: ¿es SELECT puro? ¿tiene TOP?
     ↓
Ejecuta en SQL Server → devuelve resultados
     ↓
Frontend muestra tabla + SQL generado
```

### Instalación del modelo
```bash
# Instalar Ollama: https://ollama.com/download
ollama pull qwen2.5:7b      # 4.7 GB
# ollama pull qwen2.5:3b    # 2.0 GB (alternativa ligera)
```

### Iniciar Ollama manualmente
```bash
ollama serve   # inicia el servidor en :11434
```

---

## Variables de Entorno

Archivo: `backend-app/.env`

```env
# Base de datos principal (SQL Server SIESA)
DB_HOST=192.168.1.70
DB_PORT=1433
DB_NAME=unoee_pruebas
DB_USER=sa
DB_PASS=Sa123456

# JWT
JWT_SECRET=tu_secreto_aqui
JWT_EXPIRES=8h

# Admin inicial
ADMIN_EMAIL=admin@local
ADMIN_PASSWORD=tu_password_aqui

# Ollama (IA local)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b

# SMTP (alertas por email — opcional)
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
```

---

## Estructura de Carpetas

```
INDEPENDIENTE/
├── scripts/                    ← Scripts de build y arranque
│   ├── build-produccion.bat    ← Compila backend + frontend
│   ├── start-dev.bat           ← Inicia en modo desarrollo
│   ├── start-produccion.bat    ← Inicia build de producción
│   └── install-deps.bat        ← npm install en ambos proyectos
│
├── dist-produccion/            ← Artefactos de producción (git-ignored)
│   ├── backend/
│   └── frontend/
│
├── docs/                       ← Documentación adicional
│   ├── API.md                  ← Referencia de endpoints
│   ├── MODELO-RELACIONAL.md    ← Schema BD curado para IA
│   └── QUERIES.md              ← Ejemplos de queries
│
├── backend-app/                ← NestJS (Node.js)
│   ├── src/
│   │   ├── controllers/        ← HTTP handlers por dominio
│   │   ├── services/           ← Lógica de negocio
│   │   ├── entities/           ← TypeORM entities
│   │   ├── auth/               ← JWT + Passport
│   │   └── app.module.ts
│   ├── dist/                   ← Compilado (git-ignored)
│   └── package.json
│
├── frontend-app/               ← Angular 17+
│   ├── src/app/
│   │   ├── features/           ← Páginas por dominio
│   │   ├── components/         ← Componentes compartidos
│   │   ├── services/           ← Servicios HTTP
│   │   └── app.routes.ts
│   └── package.json
│
├── test-final-siesa.ps1        ← Test de integración SIESA
├── test-enviar-y-aprobar.ps1   ← Test flujo completo traslados
└── WSUNOEE/                    ← DLLs y WSDL del servicio SIESA
```

---

## Comandos Rápidos

```bat
REM Instalar todo
scripts\install-deps.bat

REM Desarrollar
scripts\start-dev.bat

REM Compilar para producción
scripts\build-produccion.bat

REM Iniciar producción
scripts\start-produccion.bat

REM Solo backend (desarrollo)
cd backend-app && node dist\main.js

REM Compilar solo backend
cd backend-app && npm run build

REM Solo frontend (desarrollo con hot-reload)
cd frontend-app && npm start

REM Descargar/actualizar modelo IA
ollama pull qwen2.5:7b

REM Ver modelos instalados
ollama list

REM Test IA rápido
ollama run qwen2.5:7b "Dame el SQL para ver las últimas 10 facturas"
```

---

## Troubleshooting

### Backend no inicia
```bash
# Verificar que el build existe
ls backend-app/dist/main.js
# Si no existe:
cd backend-app && npm run build
```

### Error de conexión a SQL Server
- Verificar que `192.168.1.70:1433` sea accesible desde la máquina
- Verificar credenciales en `.env`
- `ping 192.168.1.70`

### Ollama no responde
```bash
# Iniciar el servicio
ollama serve
# Verificar en: http://localhost:11434
# Ver modelos disponibles:
ollama list
```

### Frontend no carga
- Verificar que el backend esté corriendo en `:3000`
- Revisar errores en consola del navegador (F12)
- En producción el frontend lo sirve el backend, no necesita servidor separado

### SIESA devuelve printTipoError != 0
| Código | Causa probable |
|---|---|
| 1 | Error en datos (cuenta inválida, tercero no existe) |
| 2 | Credenciales SIESA incorrectas (usuario/clave/conexión) |
| 3 | Estructura XML inválida o fecha no corresponde al periodo |

### Modelo IA genera SQL incorrecto
- Verificar que la cuenta/tabla existe en el schema curado (`docs/MODELO-RELACIONAL.md`)
- Ser más específico en la pregunta (incluir periodo, tipo de documento, etc.)
- Si el modelo alucina nombres de columnas, revisar y actualizar el schema curado

---

## Gestión de Usuarios

Solo usuarios con rol `admin` pueden gestionar usuarios. Todos los endpoints requieren `Authorization: Bearer <token>`.

### Crear usuario
```http
POST /api/users
{ "username": "juan", "email": "juan@empresa.com", "nombre": "Juan", "password": "pass1234", "rol": "user" }
```
- `rol`: `"admin"` o `"user"` (default: `"user"`)

### Listar usuarios
```http
GET /api/users
```

### Actualizar usuario
```http
PUT /api/users/:id
{ "nombre": "Juan Nuevo", "password": "nuevaPass" }
```

### Eliminar usuario
```http
DELETE /api/users/:id
```

---

## Sistema de Licencias

El sistema usa firma digital **Ed25519** para controlar el acceso. Las licencias son keys firmadas con llave privada que solo tú tienes.

### Flujo completo

```
1. Cliente instala la app → accede con usuario trial/admin local
2. Admin va a módulo Licencia → copia su userId (UUID)
3. Tú generas una key con la herramienta interna:
   cd licensing-tool
   node generar-key.js --userId=<uuid> --meses=6
4. Le envías la key al cliente (email/WhatsApp)
5. Cliente la pega en módulo Licencia → Aplicar
6. Sistema verifica firma → activa por el periodo indicado
```

### Generar una key (herramienta interna)
```bash
cd licensing-tool

# Por meses:
node generar-key.js --userId=<uuid> --username=cliente@empresa.com --meses=6

# Por días:
node generar-key.js --userId=<uuid> --dias=30

# Hasta fecha fija:
node generar-key.js --userId=<uuid> --hasta=2027-04-30
```
Se imprime la key. Cópiala completa y envíala al cliente.

### Aplicar una key (endpoint)
```http
POST /api/license/apply
{ "userId": "<uuid>", "key": "<key-generada>" }
```

### Ver historial de licencias
```http
GET /api/license/history/:userId
```

### Seguridad del sistema de licencias
- Keys firmadas con Ed25519 — no falsificables sin la llave privada
- Cada key incluye `keyId` único — no reutilizable
- El `userId` está dentro del payload firmado — una key de Cliente A no funciona en Cliente B
- El sistema detecta manipulación del reloj del servidor
- **NUNCA distribuir** la carpeta `licensing-tool/` ni `private-key.pem` al cliente

### Setup inicial (una sola vez por instalación)
```bash
cd licensing-tool
npm install
node init-keys.js
# Copia el contenido de public-key.pem a backend-app/src/auth/license-public-key.ts
```
> Si regeneras las llaves, invalidas TODAS las keys ya emitidas.

---

*Última actualización: Junio 2026*
