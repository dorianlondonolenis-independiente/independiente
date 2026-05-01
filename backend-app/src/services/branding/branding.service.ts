import { Injectable, Logger } from '@nestjs/common';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

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

@Injectable()
export class BrandingService {
  private readonly logger = new Logger(BrandingService.name);
  private readonly filePath = join(process.cwd(), 'branding.json');

  getBranding(): Branding {
    try {
      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath, 'utf-8');
        return { ...DEFAULTS, ...JSON.parse(raw) };
      }
    } catch (e: any) {
      this.logger.warn('No se pudo leer branding.json, usando valores por defecto: ' + e.message);
    }
    return { ...DEFAULTS };
  }

  updateBranding(partial: Partial<Branding>): Branding {
    const current = this.getBranding();
    const updated = { ...current, ...partial };
    try {
      writeFileSync(this.filePath, JSON.stringify(updated, null, 2), 'utf-8');
      this.logger.log('Branding actualizado');
    } catch (e: any) {
      this.logger.error('Error guardando branding.json: ' + e.message);
      throw new Error('No se pudo guardar la configuración de branding');
    }
    return updated;
  }
}
