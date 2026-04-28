/**
 * Genera el par de llaves Ed25519 para firmar licencias.
 * - private-key.pem -> queda solo aquí (gitignored).
 * - public-key.pem  -> se copia al backend/src/auth/license-public-key.ts
 *
 * Uso:
 *   node init-keys.js
 *
 * Solo se debe correr UNA VEZ. Si se regenera, todas las keys ya emitidas
 * dejan de ser válidas.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PRIV = path.join(__dirname, 'private-key.pem');
const PUB = path.join(__dirname, 'public-key.pem');

if (fs.existsSync(PRIV) || fs.existsSync(PUB)) {
  console.error('ERROR: Ya existen llaves. Borra private-key.pem / public-key.pem si quieres regenerar.');
  console.error('Hacerlo invalida TODAS las keys ya emitidas.');
  process.exit(1);
}

const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
fs.writeFileSync(PRIV, privateKey.export({ type: 'pkcs8', format: 'pem' }));
fs.writeFileSync(PUB, publicKey.export({ type: 'spki', format: 'pem' }));

console.log('OK. Llaves generadas:');
console.log(' - ' + PRIV + '  (PRIVADA, NO COMMITEAR)');
console.log(' - ' + PUB + '   (pública, copiar al backend)');
console.log('\nLuego pega el contenido de public-key.pem en:');
console.log('  backend-app/src/auth/license-public-key.ts');
