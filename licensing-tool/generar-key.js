/**
 * Genera y firma una licencia Ed25519.
 *
 * Uso:
 *   node generar-key.js --userId=<uuid> --username=<email> --meses=6
 *   node generar-key.js --userId=<uuid> --username=<email> --dias=180
 *   node generar-key.js --userId=<uuid> --username=<email> --hasta=2027-04-30
 *
 * Imprime la cadena `payload.firma` lista para enviar al cliente.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, ...rest] = a.replace(/^--/, '').split('=');
      return [k, rest.join('=') || true];
    }),
);

const userId = args.userId || args.user;
const username = args.username || args.email || '';
let meses = args.meses ? Number(args.meses) : null;
let dias = args.dias ? Number(args.dias) : null;
const hasta = args.hasta || args.expiresAt || null;

if (!userId) {
  console.error('Falta --userId=<uuid del usuario en el cliente>');
  process.exit(1);
}
if (!meses && !dias && !hasta) {
  console.error('Falta --meses=N | --dias=N | --hasta=YYYY-MM-DD');
  process.exit(1);
}

const PRIV = path.join(__dirname, 'private-key.pem');
if (!fs.existsSync(PRIV)) {
  console.error('No existe private-key.pem. Corre primero `node init-keys.js`.');
  process.exit(1);
}
const privateKey = crypto.createPrivateKey(fs.readFileSync(PRIV));

const now = new Date();
let expiresAt;
if (hasta) {
  expiresAt = new Date(hasta);
  if (isNaN(expiresAt.getTime())) {
    console.error('--hasta inválido. Usa YYYY-MM-DD');
    process.exit(1);
  }
} else if (dias) {
  expiresAt = new Date(now.getTime() + dias * 86400000);
} else {
  expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + meses);
}

const payload = {
  v: 1,
  keyId: crypto.randomUUID(),
  userId: String(userId),
  username: String(username),
  issuedAt: now.toISOString(),
  expiresAt: expiresAt.toISOString(),
};
const payloadJson = JSON.stringify(payload);
const payloadBuf = Buffer.from(payloadJson, 'utf8');
const signature = crypto.sign(null, payloadBuf, privateKey);

const payloadB64 = payloadBuf.toString('base64url');
const sigB64 = signature.toString('base64url');
const key = `${payloadB64}.${sigB64}`;

console.log('=== KEY GENERADA ===');
console.log(key);
console.log('\n=== Detalle ===');
console.log(JSON.stringify(payload, null, 2));
console.log('\nEnvía SOLO la línea bajo "KEY GENERADA" al cliente.');
