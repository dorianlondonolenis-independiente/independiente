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
import { KardexComponent } from './components/kardex/kardex.component';
import { TercerosComponent } from './components/terceros/terceros.component';
import { BulkUploadComponent } from './components/bulk-upload/bulk-upload.component';
import { SiesaXmlComponent } from './components/siesa-xml/siesa-xml.component';

export const routes: Routes = [
  {
    path: 'dashboard',
    component: DashboardComponent
  },
  {
    path: 'tables',
    component: TablesListComponent
  },
  {
    path: 'queries',
    component: QueriesListComponent
  },
  {
    path: 'maestras',
    component: MaestrasDashboardComponent
  },
  {
    path: 'maestras/producto/nuevo',
    component: ProductoWizardComponent
  },
  {
    path: 'inventario',
    component: InventarioComponent
  },
  {
    path: 'ventas',
    component: VentasComponent
  },
  {
    path: 'compras',
    component: ComprasComponent
  },
  {
    path: 'cartera',
    component: CarteraComponent
  },
  {
    path: 'kardex',
    component: KardexComponent
  },
  {
    path: 'terceros',
    component: TercerosComponent
  },
  {
    path: 'bulk-upload',
    component: BulkUploadComponent
  },
  {
    path: 'siesa-xml',
    component: SiesaXmlComponent
  },
  {
    path: 'test',
    component: ListTableDynamicComponent
  },
  {
    path: 'table/:endpoint',
    component: ListTableDynamicComponent
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


