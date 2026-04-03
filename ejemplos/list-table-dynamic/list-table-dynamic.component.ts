import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { AdministracionService } from 'src/app/services/administracion.service';
import { BoardService } from 'src/app/services/board.service';
import { FormasService } from 'src/app/services/formas.service';
import { FormularioService } from 'src/app/services/formulario.service';
import { SesionService } from 'src/app/services/session/sesion.service';

declare var $: any;
declare let alertify: any;
import Swal from 'sweetalert2';

@Component({
  selector: 'app-list-table-dynamic',
  templateUrl: './list-table-dynamic.component.html',
  styleUrls: ['./list-table-dynamic.component.css']
})
export class ListTableDynamicComponent implements OnInit {

  idFormulario;
  dataTable;
  isLoading: boolean = true;
  constructor(private FormasService: FormasService, private FormularioService: FormularioService, private SesionService: SesionService, private router: Router, private route: ActivatedRoute, private BoardService: BoardService, private AdministracionService: AdministracionService) {

  }

  ngOnInit(): void {
    this.route.params.subscribe(
      (params: Params) => {
        this.idFormulario = params['idFormulario'];

        let url = window.location.href;
        let param = '';
        if (url.includes('?')) {
          param = '?' + url.split('?')[1]
        }
        this.callFormulario(param)
      })
  }
  callFormulario(param?) {
    let params = '';
    this.FormasService.getListForma(this.idFormulario, param).subscribe({
      next: data => {
        this.isLoading = false;
        
        this.dataTable = data;
      },
      error: error => {
        if (error.status == 404 || error.status == 0) { alertify.error("Valide su conexión a la red o la conexión VPN"); }
        this.isLoading = false;
        if (error.status == 401) { this.SesionService.cerrarSesion() }
        if(error.error.includes('Execution Timeout Expired')) { 
          alertify.warning("El Servicio no se encuentra disponible, intente nuevamente en breve.");
        }else{
          alertify.error(error.error);
        }
      }
    })
  }
  

}
