/**
 * Lista canónica de módulos de la aplicación. Cada item representa una sección
 * del sidebar / route que el admin puede habilitar a un usuario por checkbox.
 *
 * Mantén esta lista sincronizada con `app.routes.ts` y con la sidebar del
 * `app.html` (cada `nav-item` debería tener su `data-module` correspondiente).
 */
export interface ModuleDef {
  id: string;
  label: string;
  icon: string;
}

export const APP_MODULES: ModuleDef[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
  { id: 'alertas', label: 'Alertas', icon: 'bi-bell-fill' },
  { id: 'maestras', label: 'Maestras', icon: 'bi-grid-3x3-gap-fill' },
  { id: 'inventario', label: 'Inventario', icon: 'bi-box-seam' },
  { id: 'ventas', label: 'Ventas', icon: 'bi-cart-check' },
  { id: 'compras', label: 'Compras', icon: 'bi-truck' },
  { id: 'cartera', label: 'Cartera', icon: 'bi-wallet2' },
  { id: 'terceros', label: 'Terceros', icon: 'bi-people-fill' },
  { id: 'tables', label: 'Explorar Tablas', icon: 'bi-table' },
  { id: 'queries', label: 'Consultas SQL', icon: 'bi-code-square' },
  { id: 'bulk-upload', label: 'Carga Masiva', icon: 'bi-cloud-arrow-up' },
  { id: 'siesa-xml', label: 'XML Siesa', icon: 'bi-filetype-xml' },
  { id: 'siesa-xml/comprobantes', label: 'Comprobantes XML', icon: 'bi-file-earmark-code' },
  { id: 'financiero/conciliacion', label: 'Conciliación DIAN', icon: 'bi-file-earmark-check' },
];
