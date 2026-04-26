import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-detalle-pedido',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container py-4">
      <button class="btn btn-link mb-3" (click)="volver()"><i class="bi bi-arrow-left"></i> Volver</button>
      <h3 class="mb-3"><i class="bi bi-bag me-2 text-success"></i>Detalle de Pedido</h3>
      <div *ngIf="data()">
        <div class="row mb-3 g-2">
          <div class="col-md-3"><strong>Documento:</strong> {{ data().documento?.tipo_docto }} - {{ data().documento?.consecutivo }}</div>
          <div class="col-md-2"><strong>Fecha:</strong> {{ data().documento?.fecha | date:'dd/MM/yyyy' }}</div>
          <div class="col-md-4"><strong>Cliente:</strong> {{ data().documento?.cliente }}</div>
          <div class="col-md-2"><strong>NIT:</strong> {{ data().documento?.nit }}</div>
          <div class="col-md-1"><strong>Sucursal:</strong> {{ data().documento?.sucursal || '-' }}</div>
          <div class="col-md-2"><strong>Motivo:</strong> {{ data().documento?.motivo || '-' }}</div>
          <div class="col-md-4"><strong>Desc. Motivo:</strong> {{ data().documento?.motivo_descripcion || '-' }}</div>
          <div class="col-md-2 text-end"><strong>Bruto:</strong> \${{ data().documento?.valor_bruto | number:'1.0-0' }}</div>
          <div class="col-md-2 text-end"><strong>Neto:</strong> \${{ data().documento?.valor_neto | number:'1.0-0' }}</div>
        </div>
        <div *ngIf="data().lineas?.length > 0">
          <table class="table table-sm table-hover">
            <thead class="table-light">
              <tr>
                <th>Referencia</th>
                <th>Producto</th>
                <th>Bodega</th>
                <th class="text-end">Cantidad</th>
                <th class="text-end">Precio</th>
                <th class="text-end">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let l of data().lineas">
                <td><code>{{ l.referencia }}</code></td>
                <td>{{ l.producto }}</td>
                <td>{{ l.bodega }}</td>
                <td class="text-end">{{ l.cantidad }}</td>
                <td class="text-end">\${{ l.precio | number:'1.0-0' }}</td>
                <td class="text-end fw-semibold">\${{ l.valor_total | number:'1.0-0' }}</td>
              </tr>
            </tbody>
          </table>
          <button class="btn btn-outline-success mt-2" (click)="exportarExcel()"><i class="bi bi-file-earmark-excel"></i> Exportar a Excel</button>
        </div>
        <div *ngIf="!data().lineas?.length" class="text-center py-3 text-muted">
          <i class="bi bi-info-circle me-1"></i>Este pedido no tiene líneas
        </div>
      </div>
      <div *ngIf="loading()" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
    </div>
  `
})
export class DetallePedidoComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  data = signal<any>(null);
  loading = signal(false);

  ngOnInit() {
    const rowid = this.route.snapshot.paramMap.get('rowid');
    if (rowid) {
      this.loading.set(true);
      this.http.get<any>(`http://localhost:3000/api/ventas/pedidos/${rowid}`).subscribe({
        next: (r) => { this.data.set(r); this.loading.set(false); },
        error: () => this.loading.set(false)
      });
    }
  }

  volver() {
    this.router.navigate(['/ventas'], { queryParams: { tab: 'pedidos' } });
  }

  exportarExcel() {
    // TODO: Implementar exportación a Excel
    alert('Exportar a Excel (pendiente)');
  }
}
