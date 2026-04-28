/**
 * Llave pública Ed25519 embebida en el binario del cliente. Solo permite
 * VERIFICAR firmas; no permite generarlas. La llave privada queda exclusiva
 * en el generador interno (`licensing-tool/`), nunca se distribuye.
 */
export const LICENSE_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAxxwgz1mXLZfFiUuVGPc6/oOkr4ilpKZovIbQI0N84r4=
-----END PUBLIC KEY-----`;
