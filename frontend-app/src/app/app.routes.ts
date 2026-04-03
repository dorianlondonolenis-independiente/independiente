import { Routes } from '@angular/router';
import { ApiViewerComponent } from './features/api-viewer/api-viewer.component';

export const routes: Routes = [
  {
    path: 'api-viewer/:endpoint',
    component: ApiViewerComponent,
  },
  {
    path: 'api-viewer/:endpoint/:id',
    component: ApiViewerComponent,
  },
  {
    path: '',
    redirectTo: 'api-viewer/metadata/database',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'api-viewer/metadata/database',
  },
];
