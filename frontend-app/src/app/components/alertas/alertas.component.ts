import {
  Component, OnInit, OnDestroy, AfterViewInit,
  signal, computed, inject, effect, ViewChild, ElementRef,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  AlertasService, AlertaInventario, AlertaVentaVsStock, TendenciaVentas, ResumenAlertas,
} from '../../services/alertas.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

type TabName = 'inventario' | 'ventas' | 'tendencias';

@Component({
  selector: 'app-alertas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CurrencyPipe, DecimalPipe],
  templateUrl: './alertas.component.html',
  styleUrls: ['./alertas.component.css'],
})
export class AlertasComponent implements OnInit, AfterViewInit, OnDestroy {
  private svc = inject(AlertasService);

  constructor() {
    // Re-renderizar el donut de inventario cada vez que cambie cualquier filtro
    effect(() => {
      const data = this.alertasFiltradas();
      if (this.chartInv) {
        this.actualizarChartInventario(data);
      }
    });
    // Re-renderizar chart de ventas cuando cambia el filtro de bodegas
    effect(() => {
      const _ = this.ventasFiltradas();
      if (this.chartVent) {
        setTimeout(() => this.renderChartVentasVsStock(), 50);
      }
    });
  }

  // Auto-refresh cada 2 minutos
  private readonly REFRESH_INTERVAL_MS = 2 * 60 * 1000;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  // ── State ─────────────────────────────────────────────────────────────
  tabActiva = signal<TabName>('inventario');
  cargando  = signal(false);
  error     = signal<string | null>(null);
  notifMsg  = signal<string | null>(null);
  notifError = signal<string | null>(null);
  hayDatosNuevos = signal(false);

  // Datos pendientes de aplicar (refresh silencioso)
  private _pendingInv: AlertaInventario[] = [];
  private _pendingVentas: AlertaVentaVsStock[] = [];
  private _pendingTendencias: TendenciaVentas[] = [];

  resumen   = signal<ResumenAlertas | null>(null);
  alertasInv = signal<AlertaInventario[]>([]);
  ventasVsStock = signal<AlertaVentaVsStock[]>([]);
  tendencias = signal<TendenciaVentas[]>([]);

  filtroBodegas   = signal<string[]>([]);
  mostrarFiltroBodegas = signal(false);
  filtroTipo      = signal<'' | 'sin_stock' | 'bajo_minimo' | 'sobre_maximo'>('');
  filtroSeveridad = signal('');
  soloAlertasTendencias = signal(true);

  // ── Sort state por tabla ──────────────────────────────────────────────
  sortInv  = signal<{ col: string; dir: 'asc' | 'desc' }>({ col: 'referencia', dir: 'asc' });
  sortVent = signal<{ col: string; dir: 'asc' | 'desc' }>({ col: 'deficit',    dir: 'desc' });
  sortTend = signal<{ col: string; dir: 'asc' | 'desc' }>({ col: 'cobertura_dias', dir: 'asc' });

  // ── Charts ────────────────────────────────────────────────────────────
  @ViewChild('chartInvCanvas')  chartInvCanvas!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('chartVentCanvas') chartVentCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartTendCanvas') chartTendCanvas!: ElementRef<HTMLCanvasElement>;

  private chartInv?: Chart;
  private chartVent?: Chart;
  private chartTend?: Chart;

  // ── Computed ──────────────────────────────────────────────────────────
  // Set de bodegas seleccionadas para lookups O(1)
  private bodegaSet = computed(() => new Set(this.filtroBodegas()));

  alertasFiltradas = computed(() => {
    let list = this.alertasInv();
    const bs = this.bodegaSet();
    // Si hay bodegas disponibles pero ninguna seleccionada → mostrar vacío (filtro activo sin selección)
    if (this.bodegas().length > 0 && bs.size === 0) return [];
    if (bs.size > 0) list = list.filter(a => bs.has(a.bodega_id));
    if (this.filtroTipo())      list = list.filter(a => a.tipo === this.filtroTipo());
    if (this.filtroSeveridad()) list = list.filter(a => a.severidad === this.filtroSeveridad());
    return list;
  });

  ventasFiltradas = computed(() => {
    const bs = this.bodegaSet();
    if (bs.size === 0) return this.ventasVsStock();
    return this.ventasVsStock().filter(v => bs.has(v.bodega_id));
  });

  // O(n) — un solo recorrido usando Map, muestra todas las bodegas
  bodegas = computed(() => {
    const map = new Map<string, string>();
    for (const a of this.alertasInv()) {
      if (!map.has(a.bodega_id)) map.set(a.bodega_id, a.bodega);
    }
    return [...map.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  // KPIs calculados desde los datos ya filtrados (respetan el filtro de bodega)
  kpiFiltrados = computed(() => {
    const inv = this.alertasFiltradas();
    const vent = this.ventasFiltradas();
    const tend = this.tendencias();
    return {
      sin_stock:                 inv.filter(a => a.tipo === 'sin_stock').length,
      bajo_minimo:               inv.filter(a => a.tipo === 'bajo_minimo').length,
      sobre_maximo:              inv.filter(a => a.tipo === 'sobre_maximo').length,
      deficit_ventas:            vent.length,
      productos_cobertura_critica: tend.filter(t => t.cobertura_dias < 15).length,
      valor_riesgo_total:        inv.reduce((s, a) => s + a.valor_riesgo, 0),
    };
  });

  totalValorRiesgo = computed(() => this.kpiFiltrados().valor_riesgo_total);

  totalValorDeficit = computed(() =>
    this.ventasFiltradas().reduce((s, v) => s + v.valor_en_riesgo, 0)
  );

  // ── Listas ordenadas (filtradas + sort) ───────────────────────────────
  alertasOrdenadas = computed(() => {
    const { col, dir } = this.sortInv();
    return this.sortList(this.alertasFiltradas(), col, dir);
  });

  ventasOrdenadas = computed(() => {
    const { col, dir } = this.sortVent();
    return this.sortList(this.ventasFiltradas(), col, dir);
  });

  tendenciasOrdenadas = computed(() => {
    const { col, dir } = this.sortTend();
    return this.sortList(this.tendencias(), col, dir);
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────
  ngOnInit() {
    this.cargarDatos();
    this.refreshTimer = setInterval(() => this.refreshSilencioso(), this.REFRESH_INTERVAL_MS);
  }

  ngAfterViewInit() {
    // Los charts se renderizan después de que lleguen los datos
  }

  ngOnDestroy() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.chartInv?.destroy();
    this.chartVent?.destroy();
    this.chartTend?.destroy();
  }

  // ── Data loading ──────────────────────────────────────────────────────
  cargarDatos() {
    this.cargando.set(true);
    this.error.set(null);

    // Cargar alertas inventario
    this.svc.getAlertasInventario().subscribe({
      next: data => {
        this.alertasInv.set(data);
        // Pre-seleccionar exactamente PRINCIPAL CUNDINAMARCA y PRINCIPAL ANTIOQUIA
        if (this.filtroBodegas().length === 0) {
          const EXACTAS = new Set(['principal cundinamarca', 'principal antioquia']);
          const inicial = this.bodegas()
            .filter(b => EXACTAS.has(b.label.trim().toLowerCase()))
            .map(b => b.id);
          if (inicial.length > 0) this.filtroBodegas.set(inicial);
        }
        setTimeout(() => this.renderChartInventario(), 100);
      },
      error: e => this.error.set(e.message || 'Error cargando alertas de inventario'),
    });

    // Cargar ventas vs stock
    this.svc.getVentasVsStock().subscribe({
      next: data => {
        this.ventasVsStock.set(data);
        setTimeout(() => this.renderChartVentasVsStock(), 100);
      },
      error: () => {},
    });

    // Cargar tendencias
    this.svc.getTendencias(this.soloAlertasTendencias()).subscribe({
      next: data => {
        this.tendencias.set(data);
        setTimeout(() => this.renderChartTendencias(), 100);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  // ── Refresh silencioso (no interrumpe la vista) ─────────────────────
  private fingerprint(data: { item_id?: string; referencia?: string }[]): string {
    return `${data.length}|${data[0]?.item_id ?? data[0]?.referencia ?? ''}|${data[data.length - 1]?.item_id ?? data[data.length - 1]?.referencia ?? ''}`;
  }

  refreshSilencioso() {
    let invDone = false, ventDone = false, tendDone = false;
    let newInv: AlertaInventario[] = [];
    let newVentas: AlertaVentaVsStock[] = [];
    let newTendencias: TendenciaVentas[] = [];

    const checkDone = () => {
      if (!invDone || !ventDone || !tendDone) return;
      const changed =
        this.fingerprint(newInv)       !== this.fingerprint(this.alertasInv()) ||
        this.fingerprint(newVentas)    !== this.fingerprint(this.ventasVsStock()) ||
        this.fingerprint(newTendencias) !== this.fingerprint(this.tendencias());
      if (changed) {
        this._pendingInv       = newInv;
        this._pendingVentas    = newVentas;
        this._pendingTendencias = newTendencias;
        this.hayDatosNuevos.set(true);
      }
    };

    this.svc.getAlertasInventario().subscribe({
      next: d => { newInv = d; invDone = true; checkDone(); },
      error: () => { invDone = true; checkDone(); },
    });
    this.svc.getVentasVsStock().subscribe({
      next: d => { newVentas = d; ventDone = true; checkDone(); },
      error: () => { ventDone = true; checkDone(); },
    });
    this.svc.getTendencias(this.soloAlertasTendencias()).subscribe({
      next: d => { newTendencias = d; tendDone = true; checkDone(); },
      error: () => { tendDone = true; checkDone(); },
    });
  }

  aplicarDatosNuevos() {
    this.alertasInv.set(this._pendingInv);
    this.ventasVsStock.set(this._pendingVentas);
    this.tendencias.set(this._pendingTendencias);
    this.hayDatosNuevos.set(false);
    setTimeout(() => {
      this.renderChartInventario();
      this.renderChartVentasVsStock();
      this.renderChartTendencias();
    }, 100);
  }

  // ── Ordenamiento de tablas ────────────────────────────────────────────
  private sortList<T>(list: T[], col: string, dir: 'asc' | 'desc'): T[] {
    return [...list].sort((a, b) => {
      const av = (a as any)[col], bv = (b as any)[col];
      const cmp = typeof av === 'string'
        ? av.localeCompare(bv, 'es', { sensitivity: 'base' })
        : (av ?? 0) - (bv ?? 0);
      return dir === 'asc' ? cmp : -cmp;
    });
  }

  ordenar(tabla: 'inv' | 'vent' | 'tend', col: string) {
    const sig = tabla === 'inv' ? this.sortInv : tabla === 'vent' ? this.sortVent : this.sortTend;
    const cur = sig();
    sig.set({ col, dir: cur.col === col && cur.dir === 'asc' ? 'desc' : 'asc' });
  }

  sortIcon(sortState: { col: string; dir: string }, col: string): string {
    if (sortState.col !== col) return 'bi-arrow-down-up opacity-25';
    return sortState.dir === 'asc' ? 'bi-sort-up' : 'bi-sort-down';
  }

  cambiarTab(tab: TabName) {
    this.tabActiva.set(tab);
    setTimeout(() => {
      if (tab === 'inventario') this.renderChartInventario();
      if (tab === 'ventas')     this.renderChartVentasVsStock();
      if (tab === 'tendencias') this.renderChartTendencias();
    }, 50);
  }

  recargarTendencias() {
    this.svc.getTendencias(this.soloAlertasTendencias()).subscribe({
      next: data => {
        this.tendencias.set(data);
        setTimeout(() => this.renderChartTendencias(), 100);
      },
    });
  }

  // ── Email ─────────────────────────────────────────────────────────────
  enviarNotificacion() {
    this.notifMsg.set(null);
    this.notifError.set(null);
    this.svc.notificar().subscribe({
      next: r => {
        if (r.enviados > 0) {
          this.notifMsg.set(`✅ Email enviado a ${r.enviados} usuario(s): ${r.destinatarios.join(', ')}`);
        } else {
          this.notifMsg.set('ℹ️ Sin alertas críticas o SMTP no configurado — email omitido.');
        }
      },
      error: e => this.notifError.set(`Error: ${e.message}`),
    });
  }

  // ── Charts ────────────────────────────────────────────────────────────
  private renderChartInventario() {
    const canvas = this.chartInvCanvas?.nativeElement;
    if (!canvas || this.alertasFiltradas().length === 0) return;

    this.chartInv?.destroy();

    const data = this.alertasFiltradas();
    const sinStock = data.filter(a => a.tipo === 'sin_stock').length;
    const bajoMin  = data.filter(a => a.tipo === 'bajo_minimo').length;
    const sobreMax = data.filter(a => a.tipo === 'sobre_maximo').length;

    this.chartInv = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Sin Stock', 'Bajo Mínimo', 'Sobre Máximo'],
        datasets: [{
          data: [sinStock, bajoMin, sobreMax],
          backgroundColor: ['#dc3545', '#fd7e14', '#0d6efd'],
          borderWidth: 2,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          title: { display: false },
        },
      },
    });
  }

  /** Actualiza los datos del donut sin destruir/recrear el chart (animación suave) */
  private actualizarChartInventario(data: AlertaInventario[]) {
    if (!this.chartInv) return;
    const sinStock = data.filter(a => a.tipo === 'sin_stock').length;
    const bajoMin  = data.filter(a => a.tipo === 'bajo_minimo').length;
    const sobreMax = data.filter(a => a.tipo === 'sobre_maximo').length;
    this.chartInv.data.datasets[0].data = [sinStock, bajoMin, sobreMax];
    this.chartInv.update();
  }

  private renderChartVentasVsStock() {
    const canvas = this.chartVentCanvas?.nativeElement;
    const data   = this.ventasFiltradas().slice(0, 10);
    if (!canvas || data.length === 0) return;

    this.chartVent?.destroy();

    this.chartVent = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.map(v => v.referencia),
        datasets: [
          {
            label: 'Stock Disponible',
            data: data.map(v => v.stock_disponible),
            backgroundColor: '#198754',
          },
          {
            label: 'Demanda Pedidos',
            data: data.map(v => v.demanda_pedidos),
            backgroundColor: '#dc3545',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: 'Top 10 — Stock vs Demanda' },
        },
        scales: {
          y: { beginAtZero: true },
        },
      },
    });
  }

  private renderChartTendencias() {
    const canvas = this.chartTendCanvas?.nativeElement;
    const data   = this.tendencias().filter(t => t.alerta).slice(0, 12);
    if (!canvas || data.length === 0) return;

    this.chartTend?.destroy();

    this.chartTend = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.map(t => t.referencia),
        datasets: [
          {
            label: 'Venta Mes Actual',
            data: data.map(t => t.ventas_mes_actual),
            backgroundColor: '#0d6efd',
            order: 1,
          },
          {
            label: 'Promedio 3 Meses',
            data: data.map(t => t.promedio_3m),
            type: 'line',
            borderColor: '#fd7e14',
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 4,
            order: 0,
          },
          {
            label: 'Stock Actual',
            data: data.map(t => t.stock_actual),
            backgroundColor: '#198754',
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: 'Tendencias — Productos en Alerta' },
        },
        scales: {
          y: { beginAtZero: true },
        },
      },
    });
  }

  // ── Filtro Bodega Multiselect ─────────────────────────────────────────
  toggleBodega(id: string) {
    const actual = this.filtroBodegas();
    this.filtroBodegas.set(
      actual.includes(id) ? actual.filter(b => b !== id) : [...actual, id]
    );
  }

  seleccionarTodasBodegas() {
    this.filtroBodegas.set(this.bodegas().map(b => b.id));
  }

  deseleccionarTodasBodegas() {
    this.filtroBodegas.set([]);
  }

  etiquetaBodegas(): string {
    const sel = this.filtroBodegas().length;
    const total = this.bodegas().length;
    if (sel === 0 || sel === total) return 'Todas las bodegas';
    if (sel === 1) {
      const b = this.bodegas().find(b => b.id === this.filtroBodegas()[0]);
      return b?.label ?? '1 bodega';
    }
    return `${sel} bodegas seleccionadas`;
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  badgeClase(severidad: string): string {
    return { critica: 'danger', alta: 'warning', media: 'info' }[severidad] ?? 'secondary';
  }

  badgeTipo(tipo: string): string {
    return { sin_stock: 'danger', bajo_minimo: 'warning', sobre_maximo: 'primary' }[tipo] ?? 'secondary';
  }

  tipoLabel(tipo: string): string {
    return { sin_stock: 'Sin Stock', bajo_minimo: 'Bajo Mínimo', sobre_maximo: 'Sobre Máximo' }[tipo] ?? tipo;
  }

  tendenciaIcono(t: string): string {
    return { creciente: '📈', estable: '➡️', decreciente: '📉' }[t] ?? '';
  }

  coberturaClase(dias: number): string {
    if (dias < 15) return 'danger';
    if (dias < 30) return 'warning';
    return 'success';
  }
}
