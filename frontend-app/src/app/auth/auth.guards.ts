import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
  UrlTree,
  ActivatedRouteSnapshot,
} from '@angular/router';
import { AuthService } from './auth.service';

/** Solo deja pasar si hay sesión activa. */
export const authGuard: CanActivateFn = (): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/login']);
};

/** Solo deja pasar a admins. */
export const adminGuard: CanActivateFn = (): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated() && auth.isAdmin()) return true;
  return router.createUrlTree(['/dashboard']);
};

/**
 * Bloquea acceso a una ruta si el usuario no tiene su módulo activo.
 * Usar en `data: { module: 'ventas' }`.
 */
export const moduleGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
  const moduleId = route.data?.['module'] as string | undefined;
  if (!moduleId) return true;
  if (auth.hasModule(moduleId)) return true;
  return router.createUrlTree(['/dashboard']);
};
