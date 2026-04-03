import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TablerosUsuariosComponent } from './components/administracion/tableros-usuarios/tableros-usuarios.component';
import { TablerosComponent } from './components/administracion/tableros/tableros.component';
import { DbComponent } from './components/consultas/db/db.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { DynamicBoardComponent } from './components/dynamic-board/dynamic-board.component';
import { BscAvanceComponent } from './components/forms/bsc/bsc-avance/bsc-avance.component';
import { BscIndicadoresComponent } from './components/forms/bsc/bsc-indicadores/bsc-indicadores.component';
import { BscMasterComponent } from './components/forms/bsc/bsc-master/bsc-master.component';
import { ControllingAvanceComponent } from './components/forms/controlling/controlling-avance/controlling-avance.component';
import { DynamicFormComponent } from './components/forms/dynamic-form/dynamic-form.component';
import { FormulariosComponent as FormulariosComponent} from './components/forms/formularios/formularios.component';
import { FormulariosComponent as AdminformulariosComponents } from './components/administracion/formularios/formularios.component';
import { IndicadorCreateComponent } from './components/forms/indicadores/indicador-create/indicador-create.component';
import { IndicadorDetailComponent } from './components/forms/indicadores/indicador-detail/indicador-detail.component';
import { IndicadorSeguridadComponent } from './components/forms/indicadores/indicador-seguridad/indicador-seguridad.component';
import { IndicadoresResumenVariablesComponent } from './components/forms/indicadores/indicadores-resumen-variables/indicadores-resumen-variables.component';
import { IndicadoresSeguridadVariablesComponent } from './components/forms/indicadores/indicadores-seguridad-variables/indicadores-seguridad-variables.component';
import { IndicadoresComponent } from './components/forms/indicadores/indicadores.component';
import { InsumoComponent } from './components/forms/mero/insumo/insumo.component';
import { MaestraInsumosMeroComponent } from './components/forms/mero/maestra-insumos-mero/maestra-insumos-mero.component';
import { BuscadorPaoComponent } from './components/forms/paos/buscador-pao/buscador-pao.component';
import { ConfirmarPaoComponent } from './components/forms/paos/confirmar-pao/confirmar-pao.component';
import { CrearActividadPaoComponent } from './components/forms/paos/crear-actividad-pao/crear-actividad-pao.component';
import { CrearAvancePaoComponent } from './components/forms/paos/crear-avance-pao/crear-avance-pao.component';
import { CrearPaoComponent } from './components/forms/paos/crear-pao/crear-pao.component';
import { LibreriaPaoComponent } from './components/forms/paos/libreria-pao/libreria-pao.component';
import { MaestraAreaComponent } from './components/forms/paos/maestra-area/maestra-area.component';
import { MaestrasDependenciaComponent } from './components/forms/paos/maestras-dependencia/maestras-dependencia.component';
import { MaestrasDireccionComponent } from './components/forms/paos/maestras-direccion/maestras-direccion.component';
import { MaestrasSedeComponent } from './components/forms/paos/maestras-sede/maestras-sede.component';
import { PaoVerComponent } from './components/forms/paos/pao-ver/pao-ver.component';
import { PermisosPaoComponent } from './components/forms/paos/permisos-pao/permisos-pao.component';
import { HomeComponent } from './components/home/home.component';
import { IframeComponent } from './components/iframe/iframe.component';
import { LoginComponent } from './components/login/login.component';
import { LogoutComponent } from './components/logout/logout.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { PdfPrivateComponent } from './components/visor/pdf-private/pdf-private.component';
import { FormularioColumnasComponent } from './components/administracion/formulario-columnas/formulario-columnas.component';
import { FormularioUsuariosComponent } from './components/administracion/formulario-usuarios/formulario-usuarios.component';
import { FlujosComponent } from './components/administracion/flujos/flujos.component';
import { FlujosListaComponent } from './components/administracion/flujos-lista/flujos-lista.component';
import { NodeRecursiveComponent } from './components/administracion/mipi/node-recursive/node-recursive.component';
import { TestDynamicFormComponent } from './components/forms/test-dynamic-form/test-dynamic-form.component';
import { ListTableComponent } from './components/formas/list-table/list-table.component';
import { DetailFormComponent } from './components/formas/detail-form/detail-form.component';
import { CreateFormComponent } from './components/formas/create-form/create-form.component';
import { DataFormComponent } from './components/formas/data-form/data-form.component';
import { FirmaConalturaComponent } from './outsideComponents/firma-conaltura/firma-conaltura.component';
import { SiteFormsComponent } from './outsideComponents/sites/site-forms/site-forms.component';
import { SiteListsComponent } from './outsideComponents/sites/site-lists/site-lists.component';
import { CanDeactivateGuard } from './guards/can-deactivate.guard';
import { DynamicTableComponent } from './components/forms/dynamic-table/dynamic-table.component';
import { ListTableDynamicComponent } from './components/formas/list-table-dynamic/list-table-dynamic.component';
import { TestDynamicTableComponent } from './components/forms/test-dynamic-table/test-dynamic-table.component';
import { DynamicViewsComponent } from './components/forms/dynamic-views/dynamic-views.component';
import { LoginSDAComponent } from './components/login-sda/login-sda.component';
import { IndicadorCreateV2Component } from './components/forms/indicadores/indicador-create-v2/indicador-create-v2.component';
import { IndicadoresV2Component } from './components/forms/indicadores/indicadores-v2/indicadores-v2.component';
import { IndicadorDetailV2Component } from './components/forms/indicadores/indicador-detail-v2/indicador-detail-v2.component';



const routes: Routes = [
  {
    path:'',
    component:DashboardComponent,
    children :[
      {path: 'home', component: HomeComponent},
      {path: 'admin-tableros', component: TablerosComponent},
      {path: 'admin-tableros/:idtablero', component: TablerosUsuariosComponent},
      {path: 'admin-formularios', component: AdminformulariosComponents},
      {path: 'admin-formularios/columnas/:idformulario', component: FormularioColumnasComponent},
      {path: 'admin-formularios/usuarios/:idformulario', component: FormularioUsuariosComponent},
      
      {path: 'admin-mipi', component: NodeRecursiveComponent},
      {path: 'notfound', component: NotFoundComponent},
      {path: 'test-form', component: TestDynamicFormComponent},
      {path: 'test-table', component: TestDynamicTableComponent},

      {path: 'pao', component: CrearPaoComponent},
      {path: 'pao-actividad', component: CrearActividadPaoComponent},
      {path: 'pao-avance', component: CrearAvancePaoComponent},
      {path: 'ver-pao', component: PaoVerComponent},
      {path: 'pao-permisos', component: PermisosPaoComponent},
      {path: 'pao-libreria', component: LibreriaPaoComponent},
      {path: 'pao-maestra-sede', component: MaestrasSedeComponent},
      {path: 'pao-maestra-direccion', component: MaestrasDireccionComponent},
      {path: 'pao-maestra-dependencia', component: MaestrasDependenciaComponent},
      {path: 'pao-maestra-area', component: MaestraAreaComponent},
      {path: 'pao-buscador', component: BuscadorPaoComponent},
      {path: 'pao-aprobacion', component: ConfirmarPaoComponent},
      
      
      {path: 'bsc-master', component: BscMasterComponent},
      {path: 'bsc-indicador', component: BscIndicadoresComponent},
      {path: 'bsc-avance', component: BscAvanceComponent},
      
      {path: 'controlling-avance', component: ControllingAvanceComponent},
      {path: 'board/:idTablero', component: DynamicBoardComponent },
      {path: 'admin-flujo/:idFormulario', component: FlujosComponent },
      {path: 'list-flujo/:idFormulario', component: FlujosListaComponent },
      {path: 'list-flujo', component: FlujosListaComponent },
      {path: 'consulta-database', component: DbComponent },
      
      {path: 'formas/list/:idFormulario', component: ListTableComponent },
      {path: 'formas/form/detail/:idFormulario', component: DetailFormComponent },
      {path: 'formas/list-dinamico/:idFormulario', component: ListTableDynamicComponent },
      {path: 'formas/views-dinamico/:idView', component: DynamicViewsComponent },
      {path: 'formas/form/create', component: CreateFormComponent },
      {path: 'formas/form/:idFormulario/diligenciar', component: DataFormComponent,canDeactivate: [CanDeactivateGuard], },
      {path: 'indicadores-seguridad', component: IndicadorSeguridadComponent },
      {path: 'indicadores-seguridad/:idIndicador/variables', component: IndicadoresSeguridadVariablesComponent },
      {path: 'indicadores', component: IndicadorCreateComponent },
      {path: 'indicadores-v2', component: IndicadorCreateV2Component },
      {path: 'indicadores-resumen', component: IndicadoresResumenVariablesComponent },
      {path: 'indicadores-sostenibilidad', component: IndicadoresComponent, children:[
        {path: '', component: IndicadorDetailComponent},   
      ]},
      {path: 'indicadores-sostenibilidad-v2', component: IndicadoresV2Component, children:[
        {path: '', component: IndicadorDetailV2Component},   
      ]},
      {path: 'insumo', component: InsumoComponent},
      {path: 'visor-pdf', component: PdfPrivateComponent},
      {path: 'formulario/:idFormulario', component: FormulariosComponent},
      {path: 'maestra-insumos-mero', component: MaestraInsumosMeroComponent},
      {path: 'logout', component: LogoutComponent},
    ]
  },
  {path: 'login', component: LoginComponent},
  {path: 'login-sda', component: LoginSDAComponent},
  {path: 'obrasSostenible', component: IframeComponent},
  {path: 'firma-conaltura', component: FirmaConalturaComponent},
  {path: 'site/forms/page/:idFormulario', component: SiteFormsComponent},

  {path: 'outside/formas/:idFormulario/diligenciar', component: DataFormComponent },
  {path: 'outside/formas/list/:idFormulario', component: ListTableComponent },
  {path: 'outside/formas/list-dinamico/:idFormulario', component: ListTableDynamicComponent },
  {path: 'outside/formas/views-dinamico/:idView', component: DynamicViewsComponent },
  {path: 'site/forms/list', component: SiteListsComponent},
  // {path: '', pathMatch: 'full',redirectTo: '/home' },
  { path: '**', pathMatch: 'full',redirectTo: 'login' }
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, {scrollPositionRestoration: 'enabled', onSameUrlNavigation: 'reload',useHash: true})
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
