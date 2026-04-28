import { SetMetadata } from '@nestjs/common';
import type { UserRol } from '../entities/user.entity';

export const ROLES_KEY = 'roles';
/** Restringe acceso por rol (ej. `@Roles('admin')`). */
export const Roles = (...roles: UserRol[]) => SetMetadata(ROLES_KEY, roles);
