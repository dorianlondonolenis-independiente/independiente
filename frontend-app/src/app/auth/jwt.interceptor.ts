import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Interceptor JWT: añade `Authorization: Bearer <token>` a cada request al API
 * y, si recibe 401, fuerza logout y redirige a /login.
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const isApi = req.url.startsWith(auth.apiUrl);
  const authReq =
    token && isApi
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && isApi && !req.url.endsWith('/auth/login')) {
        auth.forceLogout();
      }
      return throwError(() => err);
    }),
  );
};
