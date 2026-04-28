import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRES_MODULE_KEY } from '../decorators/requires-module.decorator';
import type { User } from '../entities/user.entity';

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string>(
      REQUIRES_MODULE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const user = context.switchToHttp().getRequest().user as User | undefined;
    if (!user) throw new ForbiddenException('No autorizado.');
    if (user.rol === 'admin') return true;
    const allowed = user.modulosPermitidos ?? [];
    if (allowed.includes('*') || allowed.includes(required)) return true;
    throw new ForbiddenException(
      `No tiene acceso al módulo "${required}".`,
    );
  }
}
