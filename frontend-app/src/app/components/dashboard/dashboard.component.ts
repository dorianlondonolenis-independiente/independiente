import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface MaestraGroup {
  key: string;
  label: string;
  tables: { name: string; label: string; description: string; rowCount: number }[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container-fluid py-4 px-4">
      <!-- Welcome header -->
      <div class="welcome-banner mb-4">
        <div class="row align-items-center">
          <div class="col-lg-8">
            <h1 class="mb-1 text-white fw-bold">Panel de Control</h1>
            <p class="mb-0 text-white-50">Gestión integral de la base de datos UnoEE &mdash; Inventario, Terceros y Comercial</p>
          </div>
          <div class="col-lg-4 text-lg-end mt-3 mt-lg-0">
            <span class="badge-live"><i class="bi bi-broadcast me-1"></i>Conectado a SQL Server</span>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-lg-3" *ngFor="let stat of stats()">
          <div class="stat-card" [style.border-left-color]="stat.color" (click)="navigate(stat.route)">
            <div class="stat-icon" [style.background]="stat.color + '18'" [style.color]="stat.color">
              <i [class]="stat.icon"></i>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ formatNumber(stat.value) }}</span>
              <span class="stat-label">{{ stat.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="row g-3 mb-4">
        <div class="col-12">
          <h5 class="section-title"><i class="bi bi-lightning-fill text-warning me-2"></i>Acciones Rápidas</h5>
        </div>
        <div class="col-sm-6 col-md-4 col-xl-3" *ngFor="let action of quickActions">
          <div class="action-card" (click)="navigate(action.route)">
            <div class="action-icon" [style.background]="action.gradient">
              <i [class]="action.icon"></i>
            </div>
            <div class="action-text">
              <strong>{{ action.label }}</strong>
              <small>{{ action.description }}</small>
            </div>
            <i class="bi bi-chevron-right action-arrow"></i>
          </div>
        </div>
      </div>

      <!-- Maestras overview -->
      <div class="row g-3" *ngIf="maestras().length > 0">
        <div class="col-12">
          <h5 class="section-title"><i class="bi bi-grid-3x3-gap-fill text-primary me-2"></i>Resumen de Maestras</h5>
        </div>
        <div class="col-md-6 col-xl-3" *ngFor="let grupo of maestras()">
          <div class="maestra-card">
            <div class="maestra-header">
              <i [class]="getGroupIcon(grupo.key)" class="me-2"></i>
              {{ grupo.label }}
              <span class="badge bg-white bg-opacity-25 ms-auto">{{ grupo.tables.length }}</span>
            </div>
            <div class="maestra-body">
              <div *ngFor="let tabla of grupo.tables"
                   class="maestra-row" (click)="navigate('/table/' + tabla.name)">
                <span class="maestra-name">{{ tabla.label }}</span>
                <span class="maestra-count">{{ formatNumber(tabla.rowCount) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading()" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="text-muted mt-2">Cargando estadísticas...</p>
      </div>
    </div>
  `,
  styles: [`
    /* Welcome banner */
    .welcome-banner {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      border-radius: 16px;
      padding: 28px 32px;
      position: relative;
      overflow: hidden;
    }
    .welcome-banner::after {
      content: '';
      position: absolute;
      top: -50%;
      right: -10%;
      width: 300px;
      height: 300px;
      background: radial-gradient(circle, rgba(233,69,96,0.15), transparent 70%);
      border-radius: 50%;
    }
    .badge-live {
      background: rgba(46,204,113,0.2);
      color: #2ecc71;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 0.82rem;
      font-weight: 600;
      border: 1px solid rgba(46,204,113,0.3);
    }

    /* Stats */
    .stat-card {
      background: #fff;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      border-left: 4px solid;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .stat-card:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(0,0,0,0.1); }
    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
      flex-shrink: 0;
    }
    .stat-info { display: flex; flex-direction: column; }
    .stat-value { font-size: 1.4rem; font-weight: 700; color: #212529; line-height: 1.2; }
    .stat-label { font-size: 0.78rem; color: #6c757d; font-weight: 500; }

    /* Section title */
    .section-title {
      font-size: 1rem;
      font-weight: 700;
      color: #212529;
      margin-bottom: 4px;
    }

    /* Quick actions */
    .action-card {
      background: #fff;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .action-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.1); }
    .action-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      color: #fff;
      flex-shrink: 0;
    }
    .action-text { display: flex; flex-direction: column; flex: 1; }
    .action-text strong { font-size: 0.88rem; color: #212529; }
    .action-text small { font-size: 0.75rem; color: #6c757d; }
    .action-arrow { color: #ced4da; font-size: 0.9rem; }
    .action-card:hover .action-arrow { color: #0d6efd; }

    /* Maestras */
    .maestra-card {
      background: #fff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .maestra-header {
      padding: 14px 16px;
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      color: #fff;
      font-weight: 600;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
    }
    .maestra-body { padding: 4px 0; }
    .maestra-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      cursor: pointer;
      transition: background 0.15s;
      border-bottom: 1px solid #f0f2f5;
    }
    .maestra-row:last-child { border-bottom: none; }
    .maestra-row:hover { background: #f7f9fc; }
    .maestra-name { font-size: 0.85rem; color: #495057; }
    .maestra-count {
      font-size: 0.82rem;
      font-weight: 700;
      color: #0d6efd;
      background: #e8f4fd;
      padding: 2px 10px;
      border-radius: 20px;
    }
  `]
})
export class DashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);

  isLoading = signal(true);
  maestras = signal<MaestraGroup[]>([]);
  stats = signal<{ label: string; value: number; icon: string; color: string; route: string }[]>([]);

  quickActions = [
    { label: 'Inventario', description: 'Stock por bodega y producto', icon: 'bi bi-box-seam', gradient: 'linear-gradient(135deg, #e94560, #c23152)', route: '/inventario' },
    { label: 'Ventas', description: 'Pedidos y facturación', icon: 'bi bi-cart-check', gradient: 'linear-gradient(135deg, #198754, #146c43)', route: '/ventas' },
    { label: 'Compras', description: 'Órdenes de compra', icon: 'bi bi-truck', gradient: 'linear-gradient(135deg, #fd7e14, #e06b0a)', route: '/compras' },
    { label: 'Cartera', description: 'CxC y CxP — Saldos abiertos', icon: 'bi bi-wallet2', gradient: 'linear-gradient(135deg, #0dcaf0, #0aa2c0)', route: '/cartera' },
    { label: 'Kardex', description: 'Movimientos de inventario', icon: 'bi bi-arrow-left-right', gradient: 'linear-gradient(135deg, #0d6efd, #0d57d8)', route: '/kardex' },
    { label: 'Terceros', description: 'Clientes, proveedores, empleados', icon: 'bi bi-people-fill', gradient: 'linear-gradient(135deg, #6f42c1, #5a32a3)', route: '/terceros' },
    { label: 'Maestras', description: 'Gestión de datos maestros', icon: 'bi bi-grid-3x3-gap-fill', gradient: 'linear-gradient(135deg, #20c997, #199d76)', route: '/maestras' },
    { label: 'Nuevo Producto', description: 'Wizard para crear ítem', icon: 'bi bi-plus-lg', gradient: 'linear-gradient(135deg, #6610f2, #520dc2)', route: '/maestras/producto/nuevo' },
  ];

  ngOnInit() {
    this.http.get<MaestraGroup[]>('http://localhost:3000/api/maestras').subscribe({
      next: (data) => {
        this.maestras.set(data);
        this.buildStats(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  private buildStats(data: MaestraGroup[]) {
    const totalRegistros = data.reduce((sum, g) => sum + g.tables.reduce((s, t) => s + t.rowCount, 0), 0);
    const totalTablas = data.reduce((sum, g) => sum + g.tables.length, 0);
    const itemsGroup = data.find(g => g.key === 'inventario');
    const tercerosGroup = data.find(g => g.key === 'terceros');

    const items = itemsGroup?.tables.find(t => t.name === 't120_mc_items')?.rowCount || 0;
    const terceros = tercerosGroup?.tables.find(t => t.name === 't200_mm_terceros')?.rowCount || 0;

    this.stats.set([
      { label: 'Productos', value: items, icon: 'bi bi-box-seam', color: '#e94560', route: '/table/t120_mc_items' },
      { label: 'Terceros', value: terceros, icon: 'bi bi-people-fill', color: '#0d6efd', route: '/table/t200_mm_terceros' },
      { label: 'Tablas Maestras', value: totalTablas, icon: 'bi bi-grid-3x3-gap', color: '#198754', route: '/maestras' },
      { label: 'Total Registros', value: totalRegistros, icon: 'bi bi-database', color: '#6f42c1', route: '/tables' },
    ]);
  }

  navigate(route: string) {
    this.router.navigate([route]);
  }

  getGroupIcon(key: string): string {
    const icons: Record<string, string> = {
      inventario: 'bi bi-box-seam',
      terceros: 'bi bi-people',
      comercial: 'bi bi-cart4',
      configuracion: 'bi bi-gear',
    };
    return icons[key] || 'bi bi-folder';
  }

  formatNumber(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n?.toLocaleString('es-CO') || '0';
  }
}
