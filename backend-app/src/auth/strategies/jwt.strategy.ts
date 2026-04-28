import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload } from '../services/auth.service';
import { UsersService } from '../services/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'change-me-in-env',
    });
  }

  /**
   * Tras verificar firma y vigencia del JWT, comprueba que el `jti` coincida
   * con el almacenado en BD (sesión única). Si el usuario inició sesión en
   * otro lado, este token queda invalidado.
   */
  async validate(payload: JwtPayload) {
    const user = await this.users.findById(payload.sub);
    if (!user || !user.activo) {
      throw new UnauthorizedException('Usuario inactivo o inexistente.');
    }
    if (!user.currentTokenJti || user.currentTokenJti !== payload.jti) {
      throw new UnauthorizedException(
        'Sesión iniciada en otro dispositivo o cerrada.',
      );
    }

    // Validación de suscripción y reloj para usuarios SaaS.
    if (user.rol !== 'admin' && user.esSuscripcion) {
      if (!user.fechaExpiracion || new Date(user.fechaExpiracion) < new Date()) {
        throw new UnauthorizedException('Suscripción expirada.');
      }
    }
    const now = new Date();
    if (user.lastSeenAt && now.getTime() < user.lastSeenAt.getTime() - 86_400_000) {
      throw new UnauthorizedException('Reloj del servidor manipulado.');
    }
    // Actualizar lastSeenAt periódicamente (cada minuto) para no escribir en cada request.
    if (!user.lastSeenAt || now.getTime() - user.lastSeenAt.getTime() > 60_000) {
      await this.users.touchLastSeen(user.id, now);
    }
    return user;
  }
}
