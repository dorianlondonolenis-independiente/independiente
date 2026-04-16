import { Injectable, signal } from '@angular/core';

export interface TablePrefs {
  pageSize?: number;
  recordLimit?: number;
  hiddenColumns?: string[];
}

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly PREFIX = 'unoee_';

  // Reactive signals that the app can bind to
  darkMode = signal(this.getBool('darkMode', false));
  sidebarCollapsed = signal(this.getBool('sidebarCollapsed', false));

  // --- Generic localStorage helpers ---

  private getKey(key: string): string {
    return this.PREFIX + key;
  }

  private getBool(key: string, fallback: boolean): boolean {
    const v = localStorage.getItem(this.getKey(key));
    return v === null ? fallback : v === 'true';
  }

  private getJson<T>(key: string, fallback: T): T {
    try {
      const v = localStorage.getItem(this.getKey(key));
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  }

  private setVal(key: string, value: any): void {
    localStorage.setItem(this.getKey(key), typeof value === 'string' ? value : JSON.stringify(value));
  }

  // --- Dark Mode ---

  toggleDarkMode(): boolean {
    const next = !this.darkMode();
    this.darkMode.set(next);
    this.setVal('darkMode', next);
    return next;
  }

  // --- Sidebar ---

  toggleSidebar(): boolean {
    const next = !this.sidebarCollapsed();
    this.sidebarCollapsed.set(next);
    this.setVal('sidebarCollapsed', next);
    return next;
  }

  // --- Favorites ---

  getFavorites(): string[] {
    return this.getJson<string[]>('favorites', []);
  }

  toggleFavorite(tableName: string): boolean {
    const favs = this.getFavorites();
    const idx = favs.indexOf(tableName);
    if (idx >= 0) {
      favs.splice(idx, 1);
    } else {
      favs.unshift(tableName);
      if (favs.length > 20) favs.pop();
    }
    this.setVal('favorites', favs);
    return idx < 0; // returns true if added
  }

  isFavorite(tableName: string): boolean {
    return this.getFavorites().includes(tableName);
  }

  // --- Recientes ---

  getRecent(): string[] {
    return this.getJson<string[]>('recent', []);
  }

  addRecent(tableName: string): void {
    const list = this.getRecent().filter(t => t !== tableName);
    list.unshift(tableName);
    if (list.length > 10) list.pop();
    this.setVal('recent', list);
  }

  // --- Table Preferences ---

  getTablePrefs(tableName: string): TablePrefs {
    return this.getJson<TablePrefs>(`table_${tableName}`, {});
  }

  setTablePrefs(tableName: string, prefs: Partial<TablePrefs>): void {
    const current = this.getTablePrefs(tableName);
    this.setVal(`table_${tableName}`, { ...current, ...prefs });
  }

  // --- Last visited ---

  getLastTable(): string | null {
    return localStorage.getItem(this.getKey('lastTable'));
  }

  setLastTable(tableName: string): void {
    this.setVal('lastTable', tableName);
  }
}
