import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createPublicKey, verify } from 'crypto';
import { Repository } from 'typeorm';
import { LicenseKey } from '../entities/license-key.entity';
import { LICENSE_PUBLIC_KEY_PEM } from '../license-public-key';
import { UsersService } from './users.service';

interface LicensePayload {
  v: number; // versión del formato
  keyId: string;
  userId: string;
  username: string;
  issuedAt: string; // ISO
  expiresAt: string; // ISO
}

@Injectable()
export class LicenseService {
  private readonly publicKey = createPublicKey(LICENSE_PUBLIC_KEY_PEM);

  constructor(
    @InjectRepository(LicenseKey, 'auth')
    private readonly repo: Repository<LicenseKey>,
    private readonly users: UsersService,
  ) {}

  /**
   * Decodifica una key (formato `payloadB64Url.signatureB64Url`) verificando la
   * firma Ed25519 con la llave pública embebida.
   */
  private decodeAndVerify(rawKey: string): LicensePayload {
    const parts = rawKey.trim().split('.');
    if (parts.length !== 2) {
      throw new BadRequestException('Formato de key inválido.');
    }
    const [payloadB64, sigB64] = parts;
    let payloadJson: string;
    let signature: Buffer;
    try {
      payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
      signature = Buffer.from(sigB64, 'base64url');
    } catch {
      throw new BadRequestException('Key con codificación inválida.');
    }
    const payloadBuf = Buffer.from(payloadJson, 'utf8');
    // Ed25519: verify(null, data, key, signature)
    const ok = verify(null, payloadBuf, this.publicKey, signature);
    if (!ok) {
      throw new BadRequestException('Firma de la key inválida.');
    }
    let payload: LicensePayload;
    try {
      payload = JSON.parse(payloadJson);
    } catch {
      throw new BadRequestException('Payload de la key no es JSON válido.');
    }
    if (
      typeof payload.keyId !== 'string' ||
      typeof payload.userId !== 'string' ||
      typeof payload.expiresAt !== 'string'
    ) {
      throw new BadRequestException('Payload incompleto.');
    }
    return payload;
  }

  async aplicar(userId: string, rawKey: string) {
    const payload = this.decodeAndVerify(rawKey);

    // El userId del payload debe coincidir con el usuario al que se aplica.
    if (payload.userId !== userId) {
      throw new BadRequestException(
        'La key no fue emitida para este usuario.',
      );
    }

    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    if (user.rol === 'admin') {
      throw new BadRequestException(
        'No se aplican licencias al administrador maestro (acceso ilimitado).',
      );
    }

    // Anti-reuso: si el keyId ya fue aplicado, rechazar.
    const usada = await this.repo.findOne({ where: { keyId: payload.keyId } });
    if (usada) {
      throw new ConflictException('Esta key ya fue aplicada anteriormente.');
    }

    const expiresAt = new Date(payload.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) {
      throw new BadRequestException('Fecha de expiración inválida.');
    }
    if (expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('La key ya está vencida.');
    }

    await this.repo.save(
      this.repo.create({
        keyId: payload.keyId,
        userId: payload.userId,
        username: payload.username ?? user.username,
        issuedAt: new Date(payload.issuedAt),
        expiresAt,
        rawKey,
      }),
    );

    await this.users.setExpiracion(userId, expiresAt);
    return {
      ok: true,
      fechaExpiracion: expiresAt,
      keyId: payload.keyId,
    };
  }

  async historial(userId: string) {
    return this.repo.find({
      where: { userId },
      order: { appliedAt: 'DESC' },
    });
  }
}
