import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'user';
  activo: boolean;
  esSuscripcion: boolean;
  fechaExpiracion: string | null;
  modulosPermitidos: string[];
  lastLoginAt?: string | null;
}

const TOKEN_KEY = 'app.auth.token';
const USER_KEY = 'app.auth.user';

/** localStorage no existe durante SSR; estos helpers evitan crashear ahí. */
const safeStorage = {
  get(key: string): string | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
  remove(key: string) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly apiUrl = 'http://localhost:3000/api';

  // Estado reactivo basado en signals
  private _token = signal<string | null>(safeStorage.get(TOKEN_KEY));
  private _user = signal<AuthUser | null>(this.readStoredUser());

  readonly token = this._token.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token() && !!this._user());
  readonly isAdmin = computed(() => this._user()?.rol === 'admin');

  private readStoredUser(): AuthUser | null {
    const raw = safeStorage.get(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  login(username: string, password: string): Observable<{ token: string; user: AuthUser }> {
    return this.http
      .post<{ token: string; user: AuthUser }>(`${this.apiUrl}/auth/login`, {
        username,
        password,
      })
      .pipe(
        tap((res) => {
          safeStorage.set(TOKEN_KEY, res.token);
          safeStorage.set(USER_KEY, JSON.stringify(res.user));
          this._token.set(res.token);
          this._user.set(res.user);
        }),
      );
  }

  refreshMe(): Observable<AuthUser> {
    return this.http
      .post<AuthUser>(`${this.apiUrl}/auth/me`, {})
      .pipe(
        tap((u) => {
          safeStorage.set(USER_KEY, JSON.stringify(u));
          this._user.set(u);
        }),
      );
  }

  logout(redirect = true) {
    const token = this._token();
    if (token) {
      // Best-effort: notificar al backend para invalidar la sesión.
      this.http.post(`${this.apiUrl}/auth/logout`, {}).subscribe({
        next: () => {},
        error: () => {},
      });
    }
    safeStorage.remove(TOKEN_KEY);
    safeStorage.remove(USER_KEY);
    this._token.set(null);
    this._user.set(null);
    if (redirect) this.router.navigate(['/login']);
  }

  /** Cierre de sesión inmediato sin pegar al backend (p.ej. tras 401). */
  forceLogout() {
    safeStorage.remove(TOKEN_KEY);
    safeStorage.remove(USER_KEY);
    this._token.set(null);
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  hasModule(moduleId: string): boolean {
    const u = this._user();
    if (!u || !u.activo) return false;
    if (u.rol === 'admin') return true;
    const list = u.modulosPermitidos ?? [];
    return list.includes('*') || list.includes(moduleId);
  }
}
