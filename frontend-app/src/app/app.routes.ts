import { Routes } from '@angular/router';
import { ListTableDynamicComponent } from './components/list-table-dynamic/list-table-dynamic.component';
import { TablesListComponent } from './components/tables-list/tables-list.component';
import { QueriesListComponent } from './components/queries-list/queries-list.component';
import { MaestrasDashboardComponent } from './components/maestras-dashboard/maestras-dashboard.component';
import { ProductoWizardComponent } from './components/producto-wizard/producto-wizard.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { InventarioComponent } from './components/inventario/inventario.component';
import { VentasComponent } from './components/ventas/ventas.component';
import { ComprasComponent } from './components/compras/compras.component';
import { CarteraComponent } from './components/cartera/cartera.component';
import { TercerosComponent } from './components/terceros/terceros.component';
import { BulkUploadComponent } from './components/bulk-upload/bulk-upload.component';
import { SiesaXmlComponent } from './components/siesa-xml/siesa-xml.component';
import { AlertasComponent } from './components/alertas/alertas.component';

// Importar componentes de detalle
import { DetalleFacturaComponent } from './features/ventas/detalle-factura.component';
import { DetallePedidoComponent } from './features/ventas/detalle-pedido.component';
import { DetalleRemisionComponent } from './features/ventas/detalle-remision.component';
import { DetalleDevolucionComponent } from './features/ventas/detalle-devolucion.component';
import { ConciliacionVentasComponent } from './features/financiero/conciliacion-ventas.component';
import { ComprobantesXmlComponent } from './features/siesa-xml/comprobantes-xml.component';

// Auth
import { LoginComponent } from './auth/login/login.component';
import { authGuard, adminGuard, moduleGuard } from './auth/auth.guards';
import { UsuariosComponent } from './features/admin/usuarios.component';
import { LicenciaComponent } from './features/admin/licencia.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
  },
  {
    path: 'ventas/factura/:rowid',
    component: DetalleFacturaComponent,
    canActivate: [authGuard, moduleGuard],
    data: { module: 'ventas' },
  },
  {
    path: 'ventas/pedido/:rowid',
    component: DetallePedidoComponent,
    canActivate: [authGuard, moduleGuard],
    data: { module: 'ventas' },
  },
  {
    path: 'ventas/remision/:rowid',
    component: DetalleRemisionComponent,
    canActivate: [authGuard, moduleGuard],
    data: { module: 'ventas' },
  },
  {
    path: 'ventas/devolucion/:rowid',
    component: DetalleDevolucionComponent,
    canActivate: [authGuard, moduleGuard],
    data: { module: 'ventas' },
  },
  {
    path: 'financiero/conciliacion',
    component: ConciliacionVentasComponent,
    canActivate: [authGuard, moduleGuard],
    data: { module: 'financiero/conciliacion' },
  },
  {
    path: 'tables',
    component: TablesListComponent,
    canActivate: [authGuard, moduleGuard],
    data: { module: 'tables' },
  },
  {
    path: 'queries',
    component: QueriesListComponent,
    canActivate: [authGuard, moduleGuard],
    data: { module: 'queries' },
  },
  {
    path: 'maestras',
    component: MaestrasDashboardComponent,
    canActivate: [authGuard, moduleGuard],
    data: { module: 'maestras' },
  },
  {
    path: 'maestras/producto/nuevo',
    component: ProductoWizardComponent,
    canActivate: [authGuard, moduleGuard],
    data: { module: 'maestras' },
  },
  {
    path: 'alertas',
    component: AlertasComponent,
    canActivate: [authGuard, moduleGuard],
    data: { module: 'alertas' },
  },
  {
    path: 'inventario',
    component: InventarioComponent,
    canActivate: [authGuard, moduleGuard],
    data: { module: 'inventario' },
  },
  {
    path: 'ventas',
    component: VentasComponent,
    canActivate: [authGuard, moduleGuard],
    data: { module: 'ventas' },
  },
  {
    path: 'compras',
    component: ComprasComponent,
    canActivate: [authGuard, moduleGuard],
    data: { module: 'compras' },
  },
  {
    path: 'cartera',
    component: CarteraComponent,
    canActivate: [authGuard, moduleGuard],
    data: { module: 'cartera' },
  },
  {
    path: 'terceros',
    component: TercerosComponent,
    canActivate: [authGuard, moduleGuard],
    data: { module: 'terceros' },
  },
  {
    path: 'bulk-upload',
    component: BulkUploadComponent,
    canActivate: [authGuard, moduleGuard],
    data: { module: 'bulk-upload' },
  },
  {
    path: 'siesa-xml',
    component: SiesaXmlComponent,
    canActivate: [authGuard, moduleGuard],
    data: { module: 'siesa-xml' },
  },
  {
    path: 'siesa-xml/comprobantes',
    component: ComprobantesXmlComponent,
    canActivate: [authGuard, moduleGuard],
    data: { module: 'siesa-xml/comprobantes' },
  },
  {
    path: 'admin/usuarios',
    component: UsuariosComponent,
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'admin/licencia',
    component: LicenciaComponent,
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'test',
    component: ListTableDynamicComponent,
    canActivate: [authGuard],
  },
  {
    path: 'table/:endpoint',
    component: ListTableDynamicComponent,
    canActivate: [authGuard, moduleGuard],
    data: { module: 'tables' },
  },
  {
    path: 'table',
    redirectTo: 'table/metadata/tables',
    pathMatch: 'full'
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  }
];


