# Licensing Tool (interno)

Herramienta de uso EXCLUSIVO interno para firmar keys de extensión de suscripción.

> **NUNCA distribuir esta carpeta al cliente.** La llave privada queda solo aquí.

## Setup (una sola vez)

```bash
cd licensing-tool
node init-keys.js
```

Esto genera:

- `private-key.pem` — **NO commitear**, ya está en `.gitignore`.
- `public-key.pem` — Copiar su contenido (texto entre BEGIN/END PUBLIC KEY) a `backend-app/src/auth/license-public-key.ts`, dentro de la constante `LICENSE_PUBLIC_KEY_PEM`.

> Si regeneras las llaves invalidas TODAS las keys ya emitidas a clientes existentes.

## Generar una key para un cliente

1. El admin del cliente te pasa el `userId` (UUID que aparece en la pantalla de Licencia del usuario al que quieres extender).
2. Tú corres:

```bash
node generar-key.js --userId=8f12-aaaa-... --username=cliente@empresa.com --meses=6
node generar-key.js --userId=8f12-aaaa-... --dias=30
node generar-key.js --userId=8f12-aaaa-... --hasta=2027-04-30
```

3. Se imprime una cadena `payload.firma`. Cópiala completa y envíasela al cliente por email o WhatsApp.
4. El cliente entra a su app → módulo **Licencia** → pega la key → **Aplicar**.

## Cómo se garantiza que la key no se puede falsificar

- Las keys se firman con **Ed25519** usando `private-key.pem` (que solo está en tu máquina).
- El backend del cliente solo tiene la llave pública embebida; **no puede firmar**, solo verificar.
- Cada key incluye un `keyId` único; si alguien intenta aplicarla dos veces, el sistema la rechaza.
- El `userId` está dentro del payload firmado; una key emitida para Cliente A no funciona en Cliente B.
- El sistema detecta manipulación del reloj del servidor (rechaza si retroceden más de 24 h).
