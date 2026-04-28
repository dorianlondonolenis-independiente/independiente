import { SetMetadata } from '@nestjs/common';

export const REQUIRES_MODULE_KEY = 'requiresModule';
/**
 * Indica que el endpoint requiere que el usuario tenga acceso al módulo dado
 * (verificado contra `user.modulosPermitidos`).
 */
export const RequiresModule = (moduleId: string) =>
  SetMetadata(REQUIRES_MODULE_KEY, moduleId);
