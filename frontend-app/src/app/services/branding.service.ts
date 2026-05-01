import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface Branding {
  appName: string;
  appSubtitle: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  navbarBg: string;
  navbarText: string;
  sidebarBg: string;
  sidebarText: string;
  emailSenderName: string;
  emailHeaderColor: string;
  emailFooterText: string;
}

const DEFAULTS: Branding = {
  appName: 'Independiente',
  appSubtitle: 'Sistema de Gestión Empresarial',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#1a237e',
  secondaryColor: '#0d47a1',
  accentColor: '#1565c0',
  navbarBg: '#1a237e',
  navbarText: '#ffffff',
  sidebarBg: '#1a237e',
  sidebarText: '#ffffff',
  emailSenderName: 'Alertas Inventario',
  emailHeaderColor: '#1a237e',
  emailFooterText: 'Alertas Inventario · Monitoreo automático cada 10 minutos',
};

@Injectable({ providedIn: 'root' })
export class BrandingService {
  private readonly apiUrl = 'http://localhost:3000/api/config/branding';

  branding = signal<Branding>({ ...DEFAULTS });

  constructor(private http: HttpClient) {}

  async load(): Promise<void> {
    try {
      const data = await firstValueFrom(this.http.get<Branding>(this.apiUrl));
      this.branding.set({ ...DEFAULTS, ...data });
      this.applyCssVars(this.branding());
      this.applyTitle(this.branding().appName);
    } catch {
      // fallback a defaults si el backend no responde
      this.applyCssVars(DEFAULTS);
    }
  }

  async save(partial: Partial<Branding>, token: string): Promise<Branding> {
    const updated = await firstValueFrom(
      this.http.put<Branding>(this.apiUrl, partial, {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    this.branding.set({ ...DEFAULTS, ...updated });
    this.applyCssVars(this.branding());
    this.applyTitle(this.branding().appName);
    return this.branding();
  }

  private applyCssVars(b: Branding): void {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', b.primaryColor);
    root.style.setProperty('--color-secondary', b.secondaryColor);
    root.style.setProperty('--color-accent', b.accentColor);
    root.style.setProperty('--color-navbar-bg', b.navbarBg);
    root.style.setProperty('--color-navbar-text', b.navbarText);
    root.style.setProperty('--color-sidebar-bg', b.sidebarBg);
    root.style.setProperty('--color-sidebar-text', b.sidebarText);
  }

  private applyTitle(name: string): void {
    if (typeof document !== 'undefined') {
      document.title = name;
    }
  }
}
