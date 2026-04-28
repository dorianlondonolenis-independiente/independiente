import { Component, signal, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs/operators';
import { ApiViewerService } from './services/api-viewer.service';
import { PreferencesService } from './services/preferences.service';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = 'Independiente';
  private apiService = inject(ApiViewerService);
  private router = inject(Router);
  prefs = inject(PreferencesService);
  auth = inject(AuthService);

  // Visible solo cuando hay sesión y la ruta NO es /login
  isAuthLayout = computed(() => {
    const url = this.router.url;
    return this.auth.isAuthenticated() && !url.startsWith('/login');
  });

  // Estado del dropdown de usuario en la topbar
  userMenuOpen = signal(false);

  sidebarCollapsed = this.prefs.sidebarCollapsed;
  darkMode = this.prefs.darkMode;

  // Breadcrumbs
  breadcrumbs = signal<{ label: string; url?: string }[]>([]);

  // Favorites & Recientes
  favorites = signal<string[]>(this.prefs.getFavorites());
  recentTables = signal<string[]>(this.prefs.getRecent());
  showFavSection = signal(true);
  showRecentSection = signal(true);

  // Global Search
  searchTerm = '';
  searchResults = signal<any[]>([]);
  searchTotal = signal(0);
  isSearching = signal(false);
  showSearchResults = signal(false);
  private searchTimeout: any = null;

  // Route name map for breadcrumbs
  private routeLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    maestras: 'Maestras',
    inventario: 'Inventario',
    ventas: 'Ventas',
    compras: 'Compras',
    cartera: 'Cartera',
    terceros: 'Terceros',
    tables: 'Explorar Tablas',
    queries: 'Consultas SQL',
    table: 'Tabla',
    'bulk-upload': 'Carga Masiva',
    'siesa-xml': 'XML Siesa',
  };

  ngOnInit() {
    // Apply dark mode class on init
    this.applyDarkMode(this.darkMode());

    // Si tenemos un token guardado, validarlo contra el backend al arrancar.
    // Si el backend responde 401 (token expirado / sesión invalidada), el
    // interceptor JWT llama forceLogout() y nos manda a /login.
    if (this.auth.token()) {
      this.auth.refreshMe().subscribe({
        next: () => {},
        error: () => {},
      });
    }

    // Update breadcrumbs on navigation
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe(event => {
      this.buildBreadcrumbs(event.urlAfterRedirects || event.url);
      // Refresh favorites in case they changed in a child component
      this.favorites.set(this.prefs.getFavorites());
    });
  }

  private applyDarkMode(dark: boolean) {
    document.body.classList.toggle('dark-mode', dark);
  }

  toggleDarkMode() {
    const next = this.prefs.toggleDarkMode();
    this.applyDarkMode(next);
  }

  toggleSidebar() {
    this.prefs.toggleSidebar();
  }

  private buildBreadcrumbs(url: string) {
    const segments = url.split('/').filter(s => s);
    const crumbs: { label: string; url?: string }[] = [
      { label: 'Dashboard', url: '/dashboard' }
    ];

    let currentPath = '';
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      currentPath += '/' + seg;

      if (seg === 'dashboard') continue; // Already added

      if (seg === 'table' && segments[i + 1]) {
        const tableName = segments[i + 1];
        crumbs.push({ label: 'Tablas', url: '/tables' });
        crumbs.push({ label: tableName });
        // Track as recent
        this.prefs.addRecent(tableName);
        this.prefs.setLastTable(tableName);
        this.recentTables.set(this.prefs.getRecent());
        break;
      }

      const label = this.routeLabels[seg] || seg;
      if (i < segments.length - 1) {
        crumbs.push({ label, url: currentPath });
      } else {
        crumbs.push({ label });
      }
    }

    this.breadcrumbs.set(crumbs);
  }

  // --- Favorites ---
  removeFavorite(tableName: string, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.prefs.toggleFavorite(tableName);
    this.favorites.set(this.prefs.getFavorites());
  }

  // --- Global Search ---

  onSearchInput() {
    clearTimeout(this.searchTimeout);
    if (!this.searchTerm || this.searchTerm.length < 2) {
      this.searchResults.set([]);
      this.showSearchResults.set(false);
      return;
    }
    this.searchTimeout = setTimeout(() => this.executeSearch(), 400);
  }

  private executeSearch() {
    this.isSearching.set(true);
    this.showSearchResults.set(true);
    this.apiService.globalSearch(this.searchTerm).subscribe({
      next: (res) => {
        this.searchResults.set(res.results || []);
        this.searchTotal.set(res.total || 0);
        this.isSearching.set(false);
      },
      error: () => {
        this.searchResults.set([]);
        this.isSearching.set(false);
      }
    });
  }

  goToTable(tableName: string) {
    this.showSearchResults.set(false);
    this.searchTerm = '';
    this.router.navigate(['/table', tableName]);
  }

  closeSearch() {
    this.showSearchResults.set(false);
  }

  logout() {
    this.auth.logout();
  }
}
