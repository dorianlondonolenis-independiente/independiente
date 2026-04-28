import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { LoginDto } from '../dtos/login.dto';
import { User } from '../entities/user.entity';
import { UsersService } from './users.service';

export interface JwtPayload {
  sub: string; // user id
  jti: string; // token unique id (sesión única)
  username: string;
  rol: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.users.findByUsername(dto.username);
    if (!user || !user.activo) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    // Validación de suscripción (admin nunca expira).
    if (user.rol !== 'admin' && user.esSuscripcion) {
      if (!user.fechaExpiracion || new Date(user.fechaExpiracion) < new Date()) {
        throw new ForbiddenException(
          'La suscripción del usuario expiró. Contacte al administrador.',
        );
      }
    }

    // Anti-manipulación de reloj: el reloj nunca puede retroceder más de 1 día.
    const now = new Date();
    if (user.lastSeenAt && now.getTime() < user.lastSeenAt.getTime() - 86_400_000) {
      throw new ForbiddenException('Reloj del servidor manipulado.');
    }

    // Generar nuevo token (sesión única: invalida el anterior).
    const jti = uuidv4();
    const payload: JwtPayload = {
      sub: user.id,
      jti,
      username: user.username,
      rol: user.rol,
    };
    const token = await this.jwt.signAsync(payload);

    await this.users.setCurrentTokenJti(user.id, jti);
    await this.users.touchLastSeen(user.id, now);

    return {
      token,
      user: this.users.toPublic(user),
    };
  }

  async logout(user: User) {
    await this.users.setCurrentTokenJti(user.id, null);
  }
}
