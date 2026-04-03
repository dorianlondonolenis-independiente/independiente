import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import Swal from 'sweetalert2';
import { FlatTreeControl } from '@angular/cdk/tree';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
// import { AdmincconalturaService } from 'src/app/services/admincconaltura.service';
import { SesionService } from 'src/app/services/session/sesion.service';
import { Subject } from 'rxjs';
declare var $: any;

interface FileNode {
  nombre: string;
  tipo?: string;
  urllink?: string;
  urllinkext?: string;
  idregistro?: string;
  contenido?: FileNode[];
  estadoflujo?: FileNode[];
}

interface ExampleFlatNode {
  expandable: boolean;
  nombre: string;
  level: number;
}


@Component({
  selector: 'app-node-recursive-dynamico',
  templateUrl: './node-recursive.component.html',
  styleUrls: ['./node-recursive.component.css']
})
export class NodeRecursiveComponent implements OnInit, OnChanges {

  @Input() buscadorTree?: boolean = false;
  @Input() objTree: FileNode[];
  objTree2: FileNode[] = [
    {
      nombre: 'Cargando ...',
      contenido: [
        { nombre: '...' },
      ]
    }
  ];
  obj_flujo = '';
  obj_flujo_file;


  objDataInforme = [];
  registro;
  dtOptionsDetail: any = {};
  treeNode;

  private _transformer = (node: FileNode, level: number) => {
    return {
      expandable: !!node.contenido && node.contenido.length > 0,
      nombre: node.nombre,
      urllink: node.urllink,
      urllinkext: node.urllinkext,
      idregistro: node.idregistro,
      level: level,
      estadoflujo: node.estadoflujo,
    };
  }

  treeControl = new FlatTreeControl<ExampleFlatNode>(
    node => node.level, node => node.expandable);

  treeFlattener = new MatTreeFlattener(
    this._transformer, node => node.level, node => node.expandable, node => node.contenido);

  dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);
  dtTrigger: Subject<any> = new Subject();
  constructor(private NavbarSesionService: SesionService, protected sanitizer: DomSanitizer) {
    this.dataSource.data = this.objTree2;
  }

  hasChild = (_: number, node: ExampleFlatNode) => node.expandable;
  getLevel = (node: ExampleFlatNode) => node.level;

  isExpandable = (node: ExampleFlatNode) => node.expandable;

  getChildren = (node: FileNode): FileNode[] => node.contenido;

  // hasChild = (_: number, _nodeData: ExampleFlatNode) => _nodeData.expandable;

  hasNoContent = (_: number, _nodeData: ExampleFlatNode) => _nodeData.nombre === '';



  ngOnInit() {
  }
  ngOnChanges() {
    console.log(this.objTree);

    this.dataSource.data = this.objTree;
  }
  openModal(nombre, url, ext?) {
    console.log(url);

    this.obj_flujo_file = null;
    this.obj_flujo = null;
    if (ext && ext != "") {
      window.open(ext, "_blank");
    } else {
      $("#viewFileModal").modal('show');
      setTimeout(() => {
        this.obj_flujo = nombre;
        if (nombre) {
          if (nombre.includes('.xls')) {
            this.obj_flujo_file = this.sanitizer.bypassSecurityTrustResourceUrl('https://view.officeapps.live.com/op/embed.aspx?src=' + url);
          } else {
            this.obj_flujo_file = this.sanitizer.bypassSecurityTrustResourceUrl(url);
          }
        } else {
          this.obj_flujo_file = url;
        }
        this.badIframe(this.obj_flujo_file,ext)
      }, 3000);

    }
  }
  closeModal() {
    $("#viewFileModal").modal('hide');
  }
  closeLogModal() {
    $("#viewFileLogModal").modal('hide');
  }

  revealEstructure(){
    // this.isLoading=true;
    if(this.treeNode){
      this.treeControl.collapseAll()
      for (let i = 0; i < this.treeControl.dataNodes.length; i++) {
        if(this.treeControl.dataNodes[i].nombre.toLowerCase().includes(this.treeNode.toLowerCase())){
          this.treeControl.expand(this.treeControl.dataNodes[i])
          const startIndex = this.treeControl.dataNodes.indexOf(this.treeControl.dataNodes[i]) - 1;
          let currentLevel = this.getLevel(this.treeControl.dataNodes[i]);


          for (let i = startIndex; i >= 0; i--) {
            const currentNode = this.treeControl.dataNodes[i];
            if (this.getLevel(currentNode) < currentLevel) {
              this.treeControl.expand(currentNode)
              currentLevel = this.getLevel(currentNode);
            }
          }
          
        }
      }
    }else{
      this.treeControl.expandAll()
    }
    // this.isLoading=false;
  }
  badIframe(iframe,ext) {
    return new Promise(resolve => {
      fetch(iframe)
        .then(res => {
          if (res.ok) {
            console.log("no fallo")
            resolve(false);
          } else {
            console.log("fallo")
            if (ext && ext != "") {
              window.open(ext, "_blank");
              this.closeModal();
              this.closeLogModal();
            }
            resolve(true);
          }
        })
        .catch(() => resolve(true));
    });
  }

  
  // loadData(registro){
  //   this.objDataInforme=[];
  //   this.AdmincconalturaService.getHistoryRegistro(registro).subscribe({
  //     next: data => {
  //       $("#viewFileLogModal").modal('show');
  //       // console.log(data);
  //       let pack = [];
  //       Object(data).forEach(element => {
  //         if(element.anexo.length > 0){
  //           element.anexo.forEach(element => {
  //             element['tipoobj']='Anexo';
  //             pack.push(element)
  //           });
  //         }
  //         if(element.archivo.length > 0){
  //           element.archivo.forEach(element => {
  //             element['tipoobj']='Principal';
  //             pack.push(element)
  //           });
  //         }


  //       });
  //       this.objDataInforme = pack;



  //       this.dtOptionsDetail = {
  //         pagingType: 'full_numbers' ,
  //         pageLength: 10 ,
  //         processing: true,
  //         scrollX: true,
  //         dom:  '<"top"lf>rt<"bottom"Bip>',
  //         buttons: [

  //           {extend: 'excel', text: 'Descargar EXCEL',className: 'btn',filename:'Descarga'}
  //         ]
  //       };
  //     },
  //     error: error => {
  //       if (error.status == 401) { this.NavbarSesionService.cerrarSesion() }


  //       Swal.fire({
  //         showClass: {
  //           popup: 'animate__animated animate__fadeInDown'
  //         },
  //         hideClass: {
  //           popup: 'animate__animated animate__fadeOutUp'
  //         },
  //         text: "No se pudo cargar el item.",
  //         icon: 'warning',
  //         showCancelButton: true,
  //         confirmButtonColor: '#145160',
  //         cancelButtonColor: '#6c757d',
  //         confirmButtonText: 'Ver mas detalles',
  //         cancelButtonText: 'Cerrar'
  //       }).then((result) => {
  //         if (result.isConfirmed) {
  //           Swal.fire({
  //             icon: 'question',
  //             showClass: {
  //               popup: 'animate__animated animate__fadeInDown'
  //             },
  //             hideClass: {
  //               popup: 'animate__animated animate__fadeOutUp'
  //             },
  //             text: error.error
  //           })
  //         }
  //       })
  //       console.error(error)
  //     }
  //   })
  // }
}
