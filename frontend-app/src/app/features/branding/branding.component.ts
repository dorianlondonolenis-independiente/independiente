import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BrandingService, Branding } from '../../services/branding.service';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-branding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './branding.component.html',
  styleUrls: ['./branding.component.css'],
})
export class BrandingComponent implements OnInit {
  private brandingService = inject(BrandingService);
  private auth = inject(AuthService);
  private router = inject(Router);

  form = signal<Branding>({ ...this.brandingService.branding() });
  saving = signal(false);
  saved = signal(false);
  error = signal('');

  ngOnInit(): void {
    // Clonar los valores actuales del branding para el formulario
    this.form.set({ ...this.brandingService.branding() });
  }

  update(field: keyof Branding, value: string): void {
    this.form.update(f => ({ ...f, [field]: value }));
  }

  async save(): Promise<void> {
    this.saving.set(true);
    this.saved.set(false);
    this.error.set('');

    const token = this.auth.token();
    if (!token) {
      this.error.set('No hay sesión activa. Inicia sesión nuevamente.');
      this.saving.set(false);
      return;
    }

    try {
      await this.brandingService.save(this.form(), token);
      this.saved.set(true);
      setTimeout(() => this.saved.set(false), 3000);
    } catch (e: any) {
      this.error.set('Error guardando cambios: ' + (e?.message ?? 'desconocido'));
    } finally {
      this.saving.set(false);
    }
  }

  resetPreview(): void {
    this.form.set({ ...this.brandingService.branding() });
  }

  preview(): void {
    const b = this.form();
    const root = document.documentElement;
    root.style.setProperty('--color-primary', b.primaryColor);
    root.style.setProperty('--color-secondary', b.secondaryColor);
    root.style.setProperty('--color-accent', b.accentColor);
    root.style.setProperty('--color-navbar-bg', b.navbarBg);
    root.style.setProperty('--color-navbar-text', b.navbarText);
    root.style.setProperty('--color-sidebar-bg', b.sidebarBg);
    root.style.setProperty('--color-sidebar-text', b.sidebarText);
  }
}
