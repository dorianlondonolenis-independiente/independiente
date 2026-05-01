import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AlertaInventario {
  item_id: string;
  referencia: string;
  producto: string;
  bodega_id: string;
  bodega: string;
  existencia: number;
  disponible: number;
  nivel_min: number;
  nivel_max: number;
  comprometida: number;
  por_entrar: number;
  tipo: 'bajo_minimo' | 'sin_stock' | 'sobre_maximo';
  severidad: 'critica' | 'alta' | 'media';
  costo_unitario: number;
  valor_riesgo: number;
}

export interface AlertaVentaVsStock {
  item_id: string;
  referencia: string;
  producto: string;
  bodega_id: string;
  bodega: string;
  stock_disponible: number;
  demanda_pedidos: number;
  deficit: number;
  pedidos_afectados: number;
  valor_en_riesgo: number;
}

export interface TendenciaVentas {
  item_id: string;
  referencia: string;
  producto: string;
  ventas_mes_actual: number;
  ventas_mes_anterior: number;
  ventas_hace_2_meses: number;
  promedio_3m: number;
  stock_actual: number;
  cobertura_dias: number;
  tendencia: 'creciente' | 'estable' | 'decreciente';
  alerta: boolean;
}

export interface ResumenAlertas {
  sin_stock: number;
  bajo_minimo: number;
  sobre_maximo: number;
  deficit_ventas: number;
  productos_cobertura_critica: number;
  valor_riesgo_total: number;
}

@Injectable({ providedIn: 'root' })
export class AlertasService {
  private http = inject(HttpClient);
  private readonly api = 'http://localhost:3000/api/alertas';

  getResumen(): Observable<ResumenAlertas> {
    return this.http.get<ResumenAlertas>(`${this.api}/resumen`);
  }

  getAlertasInventario(bodega?: string): Observable<AlertaInventario[]> {
    const qs = bodega ? `?bodega=${encodeURIComponent(bodega)}` : '';
    return this.http.get<AlertaInventario[]>(`${this.api}/inventario${qs}`);
  }

  getVentasVsStock(): Observable<AlertaVentaVsStock[]> {
    return this.http.get<AlertaVentaVsStock[]>(`${this.api}/ventas-vs-stock`);
  }

  getTendencias(soloAlertas = false): Observable<TendenciaVentas[]> {
    return this.http.get<TendenciaVentas[]>(
      `${this.api}/tendencias?soloAlertas=${soloAlertas}`
    );
  }

  notificar(): Observable<{ enviados: number; destinatarios: string[] }> {
    return this.http.post<{ enviados: number; destinatarios: string[] }>(
      `${this.api}/notificar`, {}
    );
  }
}
