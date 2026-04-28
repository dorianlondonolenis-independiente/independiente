# Guía de Entrega al Cliente

> Esta guía describe los pasos para compilar, empaquetar y entregar la aplicación a un cliente on-premise o SaaS.  
> `licensing-tool/` **nunca se entrega al cliente**. Es exclusivo del desarrollador.

---

## Requisitos en el servidor del cliente

| Requisito | Versión mínima | Descarga |
|-----------|---------------|---------|
| Node.js LTS | 20.x o superior | https://nodejs.org |
| Acceso de red a SQL Server del cliente | — | — |

---

## Paso 1 — Preparar el `.env` del backend

Crear el archivo `backend-app/.env` con los valores del cliente:

```env
# Secreto JWT — cambiar por uno único por cliente (mínimo 32 chars aleatorios)
JWT_SECRET=CAMBIAR_POR_CLAVE_SECRETA_UNICA

# URL del frontend en producción (si backend y frontend corren en el mismo puerto, dejar vacío o quitar)
FRONTEND_URL=http://localhost:3000

# Conexión SQL Server del cliente
DB_HOST=IP_O_HOSTNAME_SERVIDOR
DB_PORT=1433
DB_USER=usuario_sql
DB_PASS=contraseña_sql
DB_NAME=nombre_base_de_datos
DB_INSTANCE=                  # opcional, si usa instancia nombrada
```

> **Generar un JWT_SECRET seguro:**
> ```powershell
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

---

## Paso 2 — Build del frontend

```powershell
cd frontend-app
npm ci
npm run build
# Output: frontend-app/dist/frontend-app/browser/
```

---

## Paso 3 — Copiar el frontend al backend

```powershell
# Crear la carpeta destino
New-Item -ItemType Directory -Force -Path "backend-app\public\browser"

# Copiar el build del frontend
Copy-Item -Recurse -Force "frontend-app\dist\frontend-app\browser\*" "backend-app\public\browser\"
```

---

## Paso 4 — Build del backend

```powershell
cd backend-app
npm ci
npm run build
# Output: backend-app/dist/
```

---

## Paso 5 — Instalar solo dependencias de producción

```powershell
cd backend-app
npm ci --omit=dev
```

---

## Paso 6 — Estructura de la carpeta de entrega

Copiar al servidor del cliente la siguiente estructura:

```
ENTREGA/
├── dist/                   ← backend compilado  (backend-app/dist/)
├── node_modules/           ← dependencias producción (backend-app/node_modules/)
├── public/
│   └── browser/            ← frontend compilado (frontend-app/dist/frontend-app/browser/)
├── data/                   ← carpeta vacía (auth.db se crea automáticamente al iniciar)
├── .env                    ← variables de entorno del cliente (NO subir a git)
├── package.json            ← backend-app/package.json (para referencia de scripts)
└── iniciar.bat             ← script de arranque (ver abajo)
```

---

## Paso 7 — Script de arranque (`iniciar.bat`)

Crear en la raíz de la carpeta de entrega:

```bat
@echo off
echo Iniciando aplicación...
node dist/main.js
pause
```

Para que arranque como servicio en segundo plano (opcional, requiere `pm2`):

```bat
@echo off
npm install -g pm2
pm2 start dist/main.js --name "app-cliente"
pm2 save
pm2 startup
```

---

## Paso 8 — Verificar que funciona

1. Abrir terminal en la carpeta de entrega.
2. Ejecutar: `node dist/main.js`
3. Abrir en el navegador: `http://localhost:3000`
4. Debe aparecer la pantalla de login.
5. Iniciar sesión con `admin@local` y la contraseña maestra.

---

## Paso 9 — Crear el primer usuario del cliente

1. Ingresar como `admin@local`.
2. Ir a **Administración → Usuarios**.
3. Crear el usuario del cliente con su email y contraseña.
4. Asignar los módulos que tiene contratados (checkboxes).
5. Si es cliente SaaS: activar el toggle **Es suscripción (SaaS)**.

---

## Paso 10 — Generar licencia inicial (solo clientes SaaS)

En tu máquina (donde está `licensing-tool/`):

```powershell
cd licensing-tool
node generar-key.js --userId=UUID_DEL_USUARIO --username=email@cliente.com --meses=12
```

- Obtener el `UUID` del usuario desde el panel de Licencias en la app.
- Enviar la key generada al cliente.
- El cliente la aplica en **Administración → Licencias**.

---

## Cambio de puerto (opcional)

Por defecto el backend corre en el puerto `3000`. Para cambiar el puerto:

En `.env`:
```env
PORT=8080
```

En `dist/main.js` (o `src/main.ts` antes de compilar), el puerto se lee con:
```typescript
await app.listen(process.env.PORT ?? 3000);
```

---

## Notas de seguridad

- El archivo `.env` contiene credenciales sensibles. **No incluirlo en repositorios**.
- La `private-key.pem` de `licensing-tool/` **nunca se entrega** al cliente.
- Cambiar `JWT_SECRET` por cliente (cada cliente debe tener su propio secreto).
- La carpeta `data/` contiene `auth.db` (SQLite). Hacer backup periódico de ese archivo.
