import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'table/:endpoint',
    renderMode: RenderMode.Client
  },
  {
    path: 'queries',
    renderMode: RenderMode.Client
  },
  {
    path: 'tables',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
