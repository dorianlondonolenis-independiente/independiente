import { Routes } from '@angular/router';
import { ListTableDynamicComponent } from './components/list-table-dynamic/list-table-dynamic.component';
import { TablesListComponent } from './components/tables-list/tables-list.component';
import { QueriesListComponent } from './components/queries-list/queries-list.component';

export const routes: Routes = [
  {
    path: 'tables',
    component: TablesListComponent
  },
  {
    path: 'queries',
    component: QueriesListComponent
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
    redirectTo: 'tables',
    pathMatch: 'full'
  }
];


