import { Component, ElementRef, HostListener, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { PaoService } from 'src/app/services/pao.service';
import { SesionService } from 'src/app/services/session/sesion.service';
import { BscAvanceComponent } from 'src/app/components/forms/bsc/bsc-avance/bsc-avance.component';
import { BscIndicadoresComponent } from 'src/app/components/forms/bsc/bsc-indicadores/bsc-indicadores.component';
import { EventEmitterService } from 'src/app/services/session/event-emitter.service';
import { BscService } from 'src/app/services/bsc.service';
import { MeroService } from 'src/app/services/mero.service';
import Swal from 'sweetalert2';
import { ActivatedRoute, Router } from '@angular/router';
import { IDropdownSettings } from 'ng-multiselect-dropdown';
import { HttpParams } from '@angular/common/http';
import { DomSanitizer } from '@angular/platform-browser';
import { FormasService } from 'src/app/services/formas.service';
import jspdf from 'jspdf';
import html2canvas from 'html2canvas';
import { isString, toInteger } from '@ng-bootstrap/ng-bootstrap/util/util';
import * as Highcharts from 'highcharts';
import HighchartsMore from 'highcharts/highcharts-more.src';
import HighchartsSolidGauge from 'highcharts/modules/solid-gauge';
import SolidGauge from 'highcharts/modules/solid-gauge';
import { Location } from '@angular/common';

// Inicializa los módulos para que Highcharts los reconozca
HighchartsMore(Highcharts);
SolidGauge(Highcharts);
declare var $: any;
declare let alertify: any;
@Component({
  selector: 'app-dynamic-form',
  templateUrl: './dynamic-form.component.html',

  styleUrls: ['./dynamic-form.component.css']
})





export class DynamicFormComponent implements OnInit, OnDestroy {




  @ViewChild('inputUploadForm') inputUploadForm: ElementRef;
  @ViewChild(BscAvanceComponent) BscAvanceComponent: BscAvanceComponent;
  @ViewChild(BscAvanceComponent) BscIndicadoresComponent: BscIndicadoresComponent;

  qtd: any[] = [];
  userList: any = [];
  dynamicList: any = [];
  mensajeConfirmacion: any = [];
  result;
  @Input() form_template_set: Array<any>;
  @Input() form_url_set: string;
  @Input() form_method_set: string;
  @Input() form_dynamic?: boolean;
  @Input() form_log?: boolean;
  @Input() form_calcule?: string = '';
  @Input() form_confirmeSecurity_set?: boolean;
  @Input() form_authentication?: boolean = true;
  @Input() form_send?: boolean = true;
  @Input() form_back?: boolean = false;
  @Input() myStyleRow?: string = '';
  @Input() form_texto_boton?: string = '';
  @Input() form_columns?;
  @Input() form_condiciones?;
  @Input() form_condiciones_tab?;
  @Input() form_print?: boolean = false;
  @ViewChild('iframeElement') iframe!: ElementRef;
  textoBotonView: string = 'Enviar Información';
  parent: any = [];
  files: any = [];
  subselected: string = '';


  myFormGroup: FormGroup;
  formTemplate: any;
  nombreAmbito;
  isLoading: boolean = true;

  dropdownSettings: IDropdownSettings = {};
  counterGetOptions = 0;


  modal_form_data = null;
  // datatabla
  dtOptions: any = {};
  objCondiciones = [];
  objCondiciones_tab = [];

  operadores: { [key: string]: (a, b) => boolean } = {
    '==': (a, b) => a == b,
    '===': (a, b) => a === b,
    '!=': (a, b) => a != b,
    '!==': (a, b) => a !== b,
    '<': (a, b) => a < b,
    '<=': (a, b) => a <= b,
    '>': (a, b) => a > b,
    '>=': (a, b) => a >= b
  };

  constructor(private location: Location, private FormasService: FormasService, private sanitizer: DomSanitizer, private EventEmitterService: EventEmitterService, private router: Router, private route: ActivatedRoute, private MeroService: MeroService, private PaoService: PaoService, private SesionService: SesionService, private eventEmitterService: EventEmitterService, private BscService: BscService) {
    this.myFormGroup = new FormGroup({});
    this.parent = [];
    this.myFormGroup.reset();

    if (this.eventEmitterService.guardFirmaDigitalVar == undefined) {
      this.eventEmitterService.guardFirmaDigitalVar = this.eventEmitterService.guardFirmaDigitalFunction.subscribe((item) => {
        this.callFuntionSetValuesFirma(item);
      });
    }

  }
  onItemSelect(option, data, label) {
    console.log(option)
    console.log(data)


  }

  getPromoStyles(myStyleCol?) {



    if (myStyleCol != undefined) {
      return myStyleCol;
    } else {
      return this.myStyleRow;
    }
  }
  validColumns() {

    if (this.form_columns == null || this.form_columns == undefined) {
      this.form_columns = [{ "id": "0" }];
    }
  }
  filterDataForm(columnActually) {
    let data;
    if (columnActually == 0) {
      data = this.formTemplate;
    } else {
      data = this.formTemplate.filter(form_elem => form_elem.row == columnActually);
    }
    return data;

  }
  convertNumArray(num) {
    let numberArray: number[] = Array.from({ length: num }, (_, index) => index);
    return numberArray;
  }
  contarEstrella(label, valor) {
    this.myFormGroup.controls[label].setValue(valor);
  }
  getEstrella(label) {
    let num = 0;
    if (this.myFormGroup.value[label] > 0 && this.myFormGroup.value[label] != undefined) {
      num = this.myFormGroup.value[label]
    }
    return num;
  }

  ngOnInit(): void {
    // console.log("llego ?");
    // console.log(this.form_template_set);

    // valida los urloptions y separa todas las peticiones
    if (this.form_log) this.isLoading = false;
    let objUrlOptions = [];
    this.form_template_set.forEach(input_template => {
      if (input_template.type.includes('matriz')) {
        if (input_template.type.includes('matriz-tipo')) {
          input_template.matriz.forEach(input_template_matriz => {
            if (input_template_matriz.type == 'select') {
              if (input_template_matriz.urlOptions != 'api/') objUrlOptions.push(input_template_matriz.urlOptions)
            }
          });
        } else {
          if (input_template.type.includes('select')) {
            if (input_template.urlOptions) {
              if (input_template.urlOptions != 'api/') objUrlOptions.push(input_template.urlOptions)
            }
          }
        }

      } else {
        if (input_template.type.includes('select') || input_template.type.includes('picklist')) {
          if (input_template.urlOptions) {
            if (input_template.urlOptions != 'api/') objUrlOptions.push(input_template.urlOptions)
          }
        } else {
          if (input_template.type.includes('table') || input_template.type.includes('tree')) {
            if (input_template.urlOptions) {
              if (input_template.urlOptions != 'api/') objUrlOptions.push(input_template.urlOptions)
            }
          }
        }
      }
    })
    let objGetUrlOptions = []
    if (objUrlOptions.length > 0) {
      let uniqueArray = [...new Set(objUrlOptions)].filter(item => typeof item === 'string');
      // console.log(uniqueArray);


      uniqueArray.forEach(element => {
        this.PaoService.getDynamicOptions(element, this.form_authentication).subscribe({
          next: data => {
            objGetUrlOptions.push({ 'url': element, 'data': Object(data) })
            if (objGetUrlOptions.length == uniqueArray.length) {
              this.continueOnInit(objGetUrlOptions);
            }
          },
          error: error => {
            if (error.status == 404 || error.status == 0) { alertify.error("Valide su conexión a la red o la conexión VPN"); }
            this.counterGetOptions++;
            alertify.error("Error al cargar las opciones fallo servicio.");
            console.error(error);
            if (this.form_log) this.continueOnInit(objGetUrlOptions);
          }
        })
      });
    } else {
      console.log('no hay servicios para reyenado todo ok');
      this.continueOnInit([]);
    }


  }
  continueOnInit(objGetUrlOptions) {
    this.dropdownSettings = {
      singleSelection: false,
      idField: 'Id',
      textField: 'Descripcion',
      searchPlaceholderText: "Buscar",
      selectAllText: 'Seleccionar Todo',
      unSelectAllText: 'Deseleccionar Todo',
      itemsShowLimit: 3,
      allowSearchFilter: true
    };

    // console.log("pintando");
    this.formTemplate = this.form_template_set;
    this.myFormGroup = new FormGroup({});

    this.parent = [];
    this.myFormGroup.reset();
    this.validColumns()
    // console.log('continua');
    let group = {}


    this.form_template_set.forEach(input_template => {
      if (input_template.type.includes('graph')) {
        let configChart: any = input_template.config[0];
        try {
          setTimeout(() => {
            // const colors = Highcharts.getOptions().colors;
            Highcharts.chart('container' + input_template.label, configChart as any);
          }, 4000);
        } catch (error) {
          console.log("error graficos");

          console.log(error);
        }
      } else {
        if (input_template.type.includes('matriz')) {
          if (input_template.type.includes('matriz-tipo')) {
            input_template.matriz.forEach(input_template_matriz => {
              group[input_template_matriz.label] = new FormControl('');
              if (input_template_matriz.type == 'select') {

                objGetUrlOptions.forEach(element => {
                  if (element.url == input_template_matriz.urlOptions) {
                    input_template_matriz.options = Object(element.data);
                  }
                });
              }
            });
          } else {
            input_template.matriz.forEach(input_template_matriz => {
              group[input_template_matriz.label] = new FormControl('');
            });

            if (input_template.type.includes('select')) {
              if (input_template.urlOptions) {
                objGetUrlOptions.forEach(element => {
                  if (element.url == input_template.urlOptions) {
                    input_template.options = Object(element.data);
                  }
                });
              }
            }
          }
        } else {
          group[input_template.label] = new FormControl('');
          if (input_template.type.includes('select')) {
            if (input_template.urlOptions) {
              objGetUrlOptions.forEach(element => {
                if (element.url == input_template.urlOptions) {
                  input_template.options = Object(element.data);
                }
              });
            }

          } else {
            if (input_template.type.includes('picklist')) {
              input_template.source = [];
              input_template.target = [];
              if (input_template.urlOptions) {
                console.log("PICKLIST");

                objGetUrlOptions.forEach(element => {
                  if (element.url == input_template.urlOptions) {
                    input_template.source = Object(element.data);
                  }
                });
              }
            } else {
              if (input_template.type.includes('table') || input_template.type.includes('tree')) {
                if (input_template.urlOptions) {

                  objGetUrlOptions.forEach(element => {
                    if (element.url == input_template.urlOptions) {

                      input_template.options = Object(element.data);
                      // this.datosConvertidos = this.convertData(input_template.options[0]['datos'])


                      if (input_template.name.includes('datatable')) {
                        input_template.dtOptions = {
                          lengthChange: false,
                          info: false,
                          pagingType: 'full_numbers',
                          pageLength: 5,
                          processing: true,
                          dom: '<"top"lf>rt<"bottom"Bip>',
                          buttons: [],
                          language: {
                            processing: "Procesando...",
                            search: "Buscar:",
                            lengthMenu: "Mostrar _MENU_ elementos",
                            info: "Mostrando desde _START_ al _END_ de _TOTAL_ elementos",
                            infoEmpty: "Mostrando ningún elemento.",
                            infoFiltered: "(filtrado _MAX_ elementos total)",
                            infoPostFix: "",
                            loadingRecords: "Cargando registros...",
                            zeroRecords: "No se encontraron registros",
                            emptyTable: "No hay datos disponibles en la tabla",
                            paginate: {
                              first: "Primero",
                              previous: "Anterior",
                              next: "Siguiente",
                              last: "Último"
                            },
                            aria: {
                              sortAscending: ": Activar para ordenar la tabla en orden ascendente",
                              sortDescending: ": Activar para ordenar la tabla en orden descendente"
                            }
                          }
                        };
                      } else {
                        input_template.dtOptions = {
                          paging: false, // Desactivar paginación
                          searching: false, // Desactivar búsqueda
                          lengthChange: false, // Desactivar cambio de longitud
                          info: false, // Establecer el límite de filas por página
                          // Resto de tu configuración personalizada si es necesario...
                        };
                      }
                    }
                  });


                }

              }
            }
          }


        }
      }

    })
    this.myFormGroup = new FormGroup(group);
    this.isLoading = false;



    if (this.eventEmitterService.PaoVar == undefined) {
      this.eventEmitterService.PaoVar = this.eventEmitterService.PaoFunction.subscribe((item) => {
        this.callFuntionLoadValues(item);
      });
    }
    if (this.eventEmitterService.ClearVar == undefined) {
      this.eventEmitterService.ClearVar = this.eventEmitterService.ClearValueFunction.subscribe((item) => {
        this.callFuntionClear();
      });
    }
    if (this.eventEmitterService.formVar == undefined) {
      this.eventEmitterService.formVar = this.eventEmitterService.formFunction.subscribe((item) => {
        this.callFuntionSetValuesIndiferent(item);
      });
    }


  }


  pulsar(e) {
    if (e.which === 13 && !e.shiftKey) {
      e.preventDefault();
      console.log('prevented');
      return false;
    }
  }
  autochecks(prefijo) {
    this.form_template_set.forEach(element => {
      if (element.type.includes('check')) {
        if (element.grupo) {
          if (element.grupo.includes(prefijo)) {
            this.myFormGroup.controls[element.label].setValue(true);
          }
        }
      }
      if (element.type.includes('matriz')) {
        element.matriz.forEach(element2 => {
          if (element2.type == 'check') {
            if (element2.grupo) {
              if (element2.grupo.includes(prefijo)) {
                this.myFormGroup.controls[element2.label].setValue(true);
              }
            }
          }
        });
      }
    });
  }

  ngOnDestroy() {
    this.myFormGroup = new FormGroup({});
    this.parent = [];
    this.myFormGroup.reset();
    location.reload();
  }
  callFuntionSetValuesFirma(item) {
    Object.keys(item).forEach((key) => {
      this.myFormGroup.controls[key].setValue(item[key]);
      this.formTemplate.forEach(element => {
        if (element.label == key) {
          element['value'] = item[key];
        }
      })
    })
  }
  callFuntionSetValuesIndiferent(item) {
    //pensado para formulas
    Object.keys(item).forEach((key) => {
      this.formTemplate.forEach(element => {


        if (element.type.includes('matriz')) {
          element.matriz.forEach(element2 => {
            if (element2.type == 'check' && element2.label == key) {
              if (item[key] == "0") {
                item[key] = false;
              }
              if (item[key] == "1") {
                item[key] = true;
              }
            }
          });
        }
        
        
        if (element.type == 'date') {
          if (element.numberFormat) {
            if (element.numberFormat && item[key]) {
              let raw = item[key].toString();
              if (raw.length === 8) {
                let conGuiones = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
                item[key] = conGuiones; // <- aquí ya es string formato yyyy-MM-dd
              }
            }
            // Si es Date (como "Fri May 30 2025..."), conviértelo a yyyy-MM-dd
            if (item[key] instanceof Date) {
              let d = item[key];
              let yyyy = d.getFullYear();
              let mm = String(d.getMonth() + 1).padStart(2, '0');
              let dd = String(d.getDate()).padStart(2, '0');
              item[key] = `${yyyy}-${mm}-${dd}`;
            }
          }
        }
      });

      if (this.myFormGroup.controls[key]) {
        setTimeout(() => {
          this.myFormGroup.controls[key].setValue(item[key]);
          let elementocambio = this.formTemplate.find(item => item.label === key);
          this.condiciones(elementocambio)
          this.condiciones_tab(elementocambio, elementocambio.value)
          this.detectIsparent(key, item[key])
        }, 500);
      }
    })
  }
  callFuntionLoadValues(item) {
    // console.log(this.formTemplate);
    console.log("llegaron valores ??")
    Object.keys(item).forEach((key) => {

      this.formTemplate.forEach(element => {


        if (element.label == key && element.isParent) {
          this.isParent(element, item[key])
        }
        if (element.label == key && element.type == 'multiselect') {
          if (this.esObjetoOArray(item[key])) {
            item[key] = JSON.parse(item[key]);
          }
        }

        if (element.type.includes('matriz')) {
          element.matriz.forEach(element2 => {


            if (element2.type == 'check' && element2.label == key) {
              // console.log(element);
              // console.log(element2);
              // console.log(key);
              // console.log(item[key]);


              if (item[key] == "0") {
                item[key] = false;
              }
              if (item[key] == "1") {
                item[key] = true;
              }
            }
          });
        }
        if (element.type.includes('autoCompleteDynamic') && element.label == key) {
          this.PaoService.getDymanicAutocomplete(item[key], element.autocomplete, this.form_authentication).subscribe({
            next: data => {
              let descripcionObj;
              Object(data).forEach(element => {
                if (element.usuario && item[key] == element.usuario) {
                  descripcionObj = element.Nombre;
                } else {
                  if (element.value && item[key] == element.value) {
                    descripcionObj = element.description;
                  }
                }
              });
              element['list'] = descripcionObj;
            },
            error: error => {
              if (error.status == 404 || error.status == 0) { alertify.error("Valide su conexión a la red o la conexión VPN"); }
              if (error.status == 401) { this.SesionService.cerrarSesion() }
              console.log("Error al cargar los filtros");
            }
          })
        }

        if (element.type.includes('autoCompleteUser') && element.label == key) {
          this.PaoService.getUsers(item[key], this.form_authentication).subscribe({
            next: data => {
              let descripcionObj;

              Object(data).forEach(element => {
                if (element.usuario && element.usuario == item[key]) {
                  descripcionObj = element.Nombre;
                } else {
                  if (element.value && element.value == item[key]) {
                    descripcionObj = element.description;
                  }
                }
              });
              element['list'] = descripcionObj;
            },
            error: error => {
              if (error.status == 404 || error.status == 0) { alertify.error("Valide su conexión a la red o la conexión VPN"); }
              if (error.status == 401) { this.SesionService.cerrarSesion() }
              console.log("Error al cargar los filtros");
            }
          })
        }
        console.log("revisando");
        if (element.type == 'date') {
          if (element.numberFormat) {
            if (element.numberFormat && item[key]) {
              let raw = item[key].toString();
              if (raw.length === 8) {
                let conGuiones = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
                item[key] = conGuiones; // <- aquí ya es string formato yyyy-MM-dd
              }
            }
            // Si es Date (como "Fri May 30 2025..."), conviértelo a yyyy-MM-dd
            if (item[key] instanceof Date) {
              let d = item[key];
              let yyyy = d.getFullYear();
              let mm = String(d.getMonth() + 1).padStart(2, '0');
              let dd = String(d.getDate()).padStart(2, '0');
              item[key] = `${yyyy}-${mm}-${dd}`;
            }
          }
        }
      });
      if (this.myFormGroup.controls[key]) {
        setTimeout(() => {
          // console.log(this.myFormGroup.controls[key]);
          this.myFormGroup.controls[key].setValue(item[key]);
          let elementocambio = this.formTemplate.find(item => item.label === key);
          this.condiciones(elementocambio)
          this.condiciones_tab(elementocambio, elementocambio.value)
          this.detectIsparent(key, item[key])
        }, 1000);
      }
    })


  }
  esObjetoOArray(texto): boolean {

    try {
      const objeto = JSON.parse(texto);
      return typeof objeto === "object" && objeto !== null;
    } catch (error) {
      return false;
    }
  }
  detectIsparent(key, value) {
    this.form_template_set.forEach(element2 => {
      if (element2.type == 'select' || element2.type == 'sub-select') {
        if (element2.label == key || element2.name == key) {
          if (element2.isParent) {
            this.parent.push({ label: element2.name, value: value })
          }
        }
      }
    })
  }
  callFuntionClear() {
    this.myFormGroup.reset();
    this.parent = [];
  }
  searchUser(event, key) {
    this.formTemplate.forEach(element => {
      if (element.label == key) {
        element['list'] = null;
        element['inputSearching'] = key;
      } else {
        if (element['inputSearching']) {
          element['inputSearching'] = null;
        }
      }


    });

    let inputValue = event.target.value;
    if (inputValue.length > 2) {
      this.PaoService.getUsers(inputValue, this.form_authentication).subscribe({
        next: data => {
          this.userList = data;
        },
        error: error => {
          if (error.status == 404 || error.status == 0) { alertify.error("Valide su conexión a la red o la conexión VPN"); }
          if (error.status == 401) { this.SesionService.cerrarSesion() }
          console.log("Error al cargar los filtros");
        }
      })
    }
  }
  searchDynamic(event, url, key) {
    this.formTemplate.forEach(element => {
      if (element.label == key) {
        element['list'] = null;
        element['inputSearching'] = key;
      } else {
        if (element['inputSearching']) {
          element['inputSearching'] = null;
        }
      }
    });

    let inputValue = event.target.value;
    if (inputValue.length > 2) {
      this.PaoService.getDymanicAutocomplete(inputValue, url, this.form_authentication).subscribe({
        next: data => {
          // console.log(data);
          this.dynamicList = data;
        },
        error: error => {
          if (error.status == 404 || error.status == 0) { alertify.error("Valide su conexión a la red o la conexión VPN"); }
          if (error.status == 401) { this.SesionService.cerrarSesion() }
          console.log("Error al cargar los filtros");
        }
      })
    }
  }
  sendListOpbejct(key, item) {

    let valueObj;
    let descripcionObj;
    let val = this.myFormGroup.value[key];
    if (item.usuario) {
      valueObj = item.usuario;
      descripcionObj = item.Nombre;
    } else {
      if (item.value) {
        valueObj = item.value;
        descripcionObj = item.description;
      }
    }
    this.myFormGroup.controls[key].setValue(valueObj);
    let elementocambio = this.formTemplate.find(item => item.label === key);
    this.condiciones(elementocambio)
    this.condiciones_tab(elementocambio)

    this.result = this.myFormGroup.value;
    this.formTemplate.forEach(element => {
      if (element.label == key) {
        element['list'] = descripcionObj;
        element['inputSearching'] = null;
      }
    });
  }
  onSubmit() {
    if (!this.form_log) {
      this.isLoading = true;
    }
    let error = 0;
    this.result = this.myFormGroup.value;

    Object.keys(this.result).forEach((key) => {
      if (this.result[key] == "" || this.result[key] == "undefined") {
        this.result[key] = 0;
      }
    })


    this.form_template_set.forEach(input_template => {
      let keysrow = Object.keys(input_template);

      let campo = input_template.name;
      if (input_template.required) {
        if (input_template.type == 'file') {
          if (this.files.length > 0) {
            let dataFile = [];
            this.files.forEach(file => {
              if (file.label == input_template.label) {
                dataFile = file.file;
              }
            });
            if (dataFile.length > 0) {
              this.result[input_template.label] = dataFile;
            } else {
              alertify.error('El campo ' + campo + ' es requerido.');
              error += 1;
            }
          } else {
            alertify.error('El campo ' + campo + ' es requerido.');
            error += 1;
          }
        } else {

          if (input_template.type == 'multiselect') {

            if (this.result[input_template.label] === 0) {
              error += 1;
              alertify.error('El campo ' + campo + ' es requerido.');
            }
          } else {
            if (input_template.type == 'estrella') {
              let conter = 0;
              if (this.result[input_template.label] > 0 && this.result[input_template.label] != undefined) {
                conter = 1;
              }
              if (conter == 0) {
                alertify.error('El campo ' + campo + ' es requerido.');
                error += 1;
              }
            } else {
              if (this.result[input_template.label].length === 0) {


                alertify.error('El campo ' + campo + ' es requerido.');
                error += 1;
              } else {
                if (input_template.type == 'number' || input_template.type == 'checkbox' || input_template.type == 'checkbox-der' || input_template.type == 'checkboxnumber') {
                  // nose
                } else {
                  if (!this.result[input_template.label].length && this.result[input_template.label] <= 0) {
                    alertify.error('El campo ' + campo + ' es requerido.');
                    error += 1;
                  } else {
                    if (input_template.type == 'email') {
                      if (!this.result[input_template.label].includes("@")) {
                        alertify.error('El campo ' + campo + ' no contiene una estructura de correo valido.');
                        error += 1;
                      }
                    }
                  }
                }
              }
            }

          }
        }


      } else {
        if (input_template.type == 'number' || input_template.type == 'checkbox' || input_template.type == 'checkbox-der' || input_template.type == 'checkboxnumber') {
          // nose
        } else {
          if (input_template.type == 'file') {
            if (this.files.length > 0) {
              let dataFile = [];
              this.files.forEach(file => {
                if (file.label == input_template.label) {
                  dataFile = file.file;
                }
              });
              this.result[input_template.label] = dataFile;
            }
          } else {
            if (input_template.type.includes('matriz')) {
              input_template.matriz.forEach(element => {
                if (this.result[element.label] === 0 && element.type == 'number') {
                  this.result[element.label] = 0;
                } else {
                  if (this.result[element.label] === 0 && element.type == 'check') {
                    this.result[element.label] = 0;
                  } else {
                    if (this.result[element.label] == undefined || this.result[element.label] == null || !this.result[element.label]) {
                      this.result[element.label] = null;
                    }
                  }
                }
              });
            } else {
              if (input_template.type == 'hidden') {
                this.result[input_template.label] = input_template.value;
              } else {
                if (input_template.type == 'formula') {
                  this.result[input_template.label] = input_template.formula;
                } else {
                  if (this.result[input_template.label] === 0 || !this.result[input_template.label]) {
                    this.result[input_template.label] = null;
                  }
                }
              }
            }
          }
        }
      }




      if (input_template.type === "checkboxnumber") {
        if (this.result[input_template.label]) {
          this.result[input_template.label] = 1;
        } else {
          this.result[input_template.label] = 0;
        }
      }
      if (input_template.type === "date") {
        if (input_template.numberFormat) {
          this.result[input_template.label] = this.result[input_template.label].replace(/-/g, '').replace(/\//g, '');
        }
      }




      keysrow.forEach(element => {
        if (element == 'list') {
          if (input_template.list != null) {
            console.log(input_template.list);
          } else {
            alertify.error('El campo ' + campo + ' debe ser seleccionado!.');
            error += 1;
          }
        }
      });
    });



    if (error == 0) {
      if (this.form_dynamic) {
        let ArrayResult = [];

        Object.keys(this.result).forEach((key, value, i) => {
          ArrayResult.push({ IdVariable: key, Valor: this.result[key] })
        })
        if (this.form_url_set != '') {
          this.sendHttp(this.form_url_set, ArrayResult, this.form_method_set);
        } else {
          alertify.error("Verifique que los campos obligarotios esten llenos.");
        }
      } else {
        if (this.form_url_set != '') {
          if (this.form_url_set == "/api/mero/insumos") {
            //validacion mero
            this.MeroService.getValidCodInsumo(this.result['codigoinsumosinco']).subscribe({
              next: data => {
                this.sendHttp(this.form_url_set, this.result, this.form_method_set)
              },
              error: error => {
                if (error.status == 404 || error.status == 0) { alertify.error("Valide su conexión a la red o la conexión VPN"); }
                if (error.status == 401) { this.SesionService.cerrarSesion() }
                console.error(error);
                alertify.error("El codigo del insumo no es valido.");
              }
            })
          } else {
            this.sendHttp(this.form_url_set, this.result, this.form_method_set)
          }
        } else {
          alertify.error("Verifique que los campos obligarotios esten llenos.");
        }
      }
    } else {
      this.isLoading = false;
    }
  }

  sendHttp(form_url_set, form_body, form_method_set) {

    if (this.form_confirmeSecurity_set) {
      Swal.fire({
        showClass: {
          popup: 'animate__animated animate__fadeInDown'
        },
        hideClass: {
          popup: 'animate__animated animate__fadeOutUp'
        },
        title: '¿Está seguro?',
        text: "¡La información enviada no podra ser alterada luego de continuar!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: 'var(--bg-conaltura)',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Ok, Continuar!'
      }).then((resultado) => {
        if (resultado.isConfirmed) {
          this.sendHttpToServices(form_url_set, form_body, form_method_set)
        }
      })
    } else {
      this.sendHttpToServices(form_url_set, form_body, form_method_set)
    }
  }
  sendHttpToServices(form_url_set, form_body, form_method_set) {
    if (this.mensajeConfirmacion.length > 0) {
      this.isLoading = false;
      let confirmMensajecounter = 0;
      this.mensajeConfirmacion.forEach(element => {
        Swal.fire({
          showClass: {
            popup: 'animate__animated animate__fadeInDown'
          },
          hideClass: {
            popup: 'animate__animated animate__fadeOutUp'
          },
          title: 'Advertencia',
          text: element.label,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: 'var(--bg-conaltura)',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Ok, Continuar!'
        }).then((resultado) => {
          if (resultado.isConfirmed) {
            confirmMensajecounter++;
            if (confirmMensajecounter == this.mensajeConfirmacion.length) {
              this.isLoading = true;
              this.sendDataForm(form_url_set, form_body, form_method_set);
            }
          }
        })
      });
    } else {
      this.sendDataForm(form_url_set, form_body, form_method_set);
    }

  }
  sendDataForm(form_url_set, form_body, form_method_set) {
    // console.log(this.mensajeConfirmacion);
    // this.form_log = true;
    if (this.form_log) {
      console.log(form_url_set);
      console.log(form_body);
      console.log(form_method_set);
      console.log(this.form_authentication);
    } else {
      this.PaoService.setDynamicAuth(form_url_set, form_body, form_method_set, this.form_authentication).subscribe({
        next: data => {
          this.isLoading = false;
          this.eventEmitterService.callFuntionGuardUrlNext(true);
          if (this.form_dynamic) {

            alertify.success("Registro enviado Correctamente.");
            this.eventEmitterService.callFuntionLoadTableAvance();
            this.myFormGroup.reset();
          } else {
            alertify.success("Registro enviado Correctamente.");
            if (window.self !== window.top) {
              if (data.toString().includes('back_')) {
                setTimeout(() => {
                  let enlace = document.createElement("a");
                  enlace.href = data.toString().replace('back_', '');
                  // enlace.target = "_blank"; // Para abrir en una nueva pestaña
                  document.body.appendChild(enlace);
                  enlace.click();
                }, 2000);
              } else {
                if (data.toString().includes("msg:")) {
                  alertify.success(data.toString().replace('msg:', ''));
                } else {
                  window.parent.location.reload();
                }
              }
            } else {
              if (data.toString().includes('#')) {
                this.router.navigateByUrl(data.toString().replace('#', ''));
              } else {
                if (data.toString().includes("http")) {
                  window.open(data.toString(), '_blank')
                } else {
                  if (data.toString().includes("msg:")) {
                    alertify.success(data.toString().replace('msg:', ''));
                    this.myFormGroup.reset();
                  } else {
                    setTimeout(() => {
                      location.reload()
                    }, 2000);
                  }
                }
              }

            }

          }
        },
        error: error => {
          if (error.status == 404 || error.status == 0) { alertify.error("Valide su conexión a la red o la conexión VPN"); }
          this.isLoading = false;
          console.error(error);
          if (error.status == 401) {
            this.SesionService.cerrarSesion()
          } else {
            if (error.error.includes("|")) {
              let varErrors = error.error.split('|')
              varErrors.forEach(element => {
                alertify.error('El campo ' + element + ' es requerido.');
              });
            } else {
              Swal.fire({
                showClass: {
                  popup: 'animate__animated animate__fadeInDown'
                },
                hideClass: {
                  popup: 'animate__animated animate__fadeOutUp'
                },
                text: "Hubo un error intente nuevamente.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#145160',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Ver mas detalles',
                cancelButtonText: 'Cerrar'
              }).then((result) => {
                if (result.isConfirmed) {
                  Swal.fire({
                    icon: 'question',
                    showClass: {
                      popup: 'animate__animated animate__fadeInDown'
                    },
                    hideClass: {
                      popup: 'animate__animated animate__fadeOutUp'
                    },
                    text: error.error
                  })
                }
              })
            }
          }
        }
      })
    }
  }
  searchClearInput(label2) {
    this.result = this.myFormGroup.value;

    this.form_template_set.forEach(element => {
      if (element.parent == label2) {
        this.result[element.label] = '';
        this.myFormGroup.controls[element.label].setValue("");
        this.searchClearInput(element.label);
      }
    });
  }
  isParent(form, value) {

    let label = form.label;
    this.result = this.myFormGroup.value;
    this.form_template_set.forEach(element => {
      if (element.parent == label) {
        this.result[element.label] = '';
        this.myFormGroup.controls[element.label].setValue("");
        this.searchClearInput(element.label);
      }
    });

    if (form.isParent) {
      let noRepit = 0;
      this.parent.forEach(element => {
        if (element.label == form.label) {
          if (!form.isSon) {
            noRepit = 0;
            this.parent = [];
          } else {
            element.value = value;
            noRepit = 1;
          }
        }
      });
      if (noRepit == 0) {
        this.parent.push({ label: form.label, value: value })
        // console.log(this.parent);

      }
    }
  }
  openModalAmbito() {
    $("#modalAddAmbito").modal("show");
  }


  nuevoAmbito() {
    if (this.nombreAmbito && this.nombreAmbito != "" && this.nombreAmbito.length > 0) {
      this.BscService.nuevoAmbito(this.eventEmitterService.callFuntionLoadBsc(), this.nombreAmbito).subscribe({
        next: data => {
          alertify.success("Registro enviado Correctamente.");
          location.reload()
        },
        error: error => {
          if (error.status == 404 || error.status == 0) { alertify.error("Valide su conexión a la red o la conexión VPN"); }
          if (error.status == 401) { this.SesionService.cerrarSesion() }
          alertify.error("Hubo un error intente nuevamente.");
        }
      })
    } else {
      alertify.error("Verifique que los campos obligarotios esten llenos.");
    }
  }

  handleUpload(id, extencionesValidas, event) {
    const file = event.target.files[0];
    let extensionShort = file.name.match(/\.[0-9a-z]+$/i)[0].replace('.', '').toLowerCase();
    if (file.size < 5242880) {
      if (extencionesValidas && extencionesValidas.length > 0) {
        let validExtencion = 0;
        extencionesValidas.forEach(element => {
          if (element.toLowerCase() == extensionShort.toLowerCase()) {
            validExtencion = 1;
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
              let nombreFile1 = file.name;
              let extencionFile1 = extensionShort;
              let base64File1 = reader.result;

              if (this.files.length == 0) {
                this.files.push(
                  {
                    "label": id,
                    "file": [{
                      "AdjuntoBase64": base64File1,
                      "AjuntoNombre": nombreFile1,
                      "AjuntoExtension": extencionFile1
                    }]
                  }
                )
              } else {
                this.files.forEach((value, index) => {
                  if (value.label == id) this.files.splice(index, 1);
                });
                this.files.push(
                  {
                    "label": id,
                    "file": [{
                      "AdjuntoBase64": base64File1,
                      "AjuntoNombre": nombreFile1,
                      "AjuntoExtension": extencionFile1
                    }]
                  }
                )
              }
            }
          }
        });
        if (validExtencion == 0) {
          alertify.error("El archivo no cuenta con una extension valida.");
          setTimeout(() => {
            $("#" + id).val("");
          }, 1000);
        }
      } else {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          let nombreFile1 = file.name;
          let extencionFile1 = extensionShort;
          let base64File1 = reader.result;

          if (this.files.length == 0) {
            this.files.push(
              {
                "label": id,
                "file": [{
                  "AdjuntoBase64": base64File1,
                  "AjuntoNombre": nombreFile1,
                  "AjuntoExtension": extencionFile1
                }]
              }
            )
          } else {
            this.files.forEach((value, index) => {
              if (value.label == id) this.files.splice(index, 1);
            });
            this.files.push(
              {
                "label": id,
                "file": [{
                  "AdjuntoBase64": base64File1,
                  "AjuntoNombre": nombreFile1,
                  "AjuntoExtension": extencionFile1
                }]
              }
            )
          }
        }
      }
    } else {
      alertify.error("El archivo supera el peso de 5 MB.");
    }

  }

  calculatorValue(label, count?) {
    setTimeout(() => {
      let result = this.myFormGroup.value;

      let ok = 0

      if (this.form_calcule != '' && Number(result[label]) >= 0) {
        ok = 1;
      } else {
        if (this.form_calcule != '' && result[label] != "" && result[label] != undefined && result[label] != null) {
          ok = 1;
        }
      }

      if (ok != 0) {
        let body = {};
        body[label] = result[label]
        this.PaoService.setDynamicAuth(this.form_calcule, body, 'post', this.form_authentication).subscribe({
          next: data => {
            Object(data)[0]['valores'].forEach(element => {
              setTimeout(() => {
                this.EventEmitterService.callFuntionSetValuesIndiferent(element)
              }, 1000);
            });
            if (!count) {
              alertify.success("Campo Autoguardado");
            }
          },
          error: error => {
            if (error.status == 404 || error.status == 0) { alertify.error("Valide su conexión a la red o la conexión VPN"); }
            console.error(error)
          }
        })
      }
    }, 3000);
  }
  partirUrl(url, position) {
    let urlResponse = url;
    if (url.includes("|")) {
      urlResponse = url.split("|")[position];
    }
    return urlResponse;
  }

  updateValue(controlName: string, newValue: string) {
    const numericValue = parseFloat(newValue.replace(/[^0-9.-]/g, ''));
    if (!isNaN(numericValue)) {
      this.myFormGroup.controls[controlName].setValue(numericValue);
    } else {
      this.myFormGroup.controls[controlName].setValue(null); // O un valor por defecto si lo deseas
    }
  }
  openModalInputForm(url) {

    this.modal_form_data = null;
    $("#modalBotonModalForm").modal('show');
    setTimeout(() => {
      this.modal_form_data = url;
    }, 1000);
    // window.frames['iframe-list-form-dynamic'].location.reload();
    // document.getElementById('FrameID').contentWindow.location.reload(true);
  }


  // tabla dinamica 
  trackByFn(item) {
    return item;
  }
  asIsOrder() {
    return 0;
  }
  objConvert(item) {
    // console.log(item);

    let obj = [];
    obj = Object.keys(item).map(key => ({ key: key, value: item[key] }))

    // delete key visible
    obj.forEach((value, index) => {
      if (value.key == 'id_registro_llave') obj.splice(index, 1);
    });
    // console.log(obj);

    return obj;
  }

  isEdit(id) {
    let edit = false;
    return edit;
  }
  validDato(dato) {
    let detalle = 'text';
    if (typeof dato === 'string') {
      if (dato.includes('#/')) {
        detalle = 'url';
      } else {
        if (dato.includes('#')) {
          detalle = 'color';
        }
      }
    } else {
      if (typeof dato === 'number') {
        detalle = 'number';
      }
    }
    return detalle;
  }

  // tabla dinamica 
  fnrecorrer() {
    let bandera = true;
    let divs = Array.from(document.getElementsByClassName('itemsElement'));
    let totalHeight = 0;
    let maxHeight = 1200; // Altura máxima deseada para cada conjunto
    let col_limit_index = "12";
    let col_index = 0;
    let col_count = 0;
    const regex = /(\d+)/g;
    for (let i = 0; i < divs.length; i++) {
      let div = divs[i];
      if (div instanceof HTMLElement) {

        let bandera_col = true;
        const otherClasses = div.classList;
        for (let index = 0; index < otherClasses.length; index++) {
          const element = otherClasses[index];
          if (element.includes("col-")) {
            let obj_col = element.match(regex);
            if (obj_col[0] != col_limit_index) {

              col_count += 1;
              col_index += parseInt(obj_col[0]);
              if (col_count > 1) {
                if (col_index.toString() == col_limit_index) {
                  col_index = 0;
                  col_count = 0;
                }
                bandera_col = false;
              }
            } else {
              col_index = 0;
              col_count = 0;
            }
          }
        }

        if (bandera_col) {
          let divHeight = div.offsetHeight;
          let marginTop = parseInt(window.getComputedStyle(div).marginTop);
          let marginBottom = parseInt(window.getComputedStyle(div).marginBottom);

          let totalDivHeight = divHeight + marginTop + marginBottom;

          console.log(totalHeight);

          if (totalHeight + totalDivHeight <= maxHeight) {
            totalHeight += totalDivHeight;
          } else {
            let excessHeight = maxHeight - totalHeight;
            if (excessHeight == 0) {
              totalHeight = divHeight + marginTop + marginBottom;
            } else {
              if (i > 0) {
                let prevDiv = divs[i - 1];
                if (prevDiv instanceof HTMLElement) {
                  let prevMarginBottom = parseInt(window.getComputedStyle(prevDiv).marginBottom);
                  prevDiv.style.marginBottom = `${prevMarginBottom + excessHeight}px`;
                  bandera = false;
                  break
                }
              }
            }

          }
        }
      }
    }
    return bandera;
  }

  downloadPage() {
    let pdfHeight = 1180; // Altura deseada para cada página del PDF

    while (!this.fnrecorrer()) {
      console.log("reinicielo");

    }

    // let margin = 10; // Margen deseado
    let margin = 0; // Margen deseado
    let elements = document.getElementsByClassName('pepe315');
    Array.from(elements).forEach((data: Element) => {

      if (data instanceof HTMLElement) {

        html2canvas(data, {
          scrollY: -window.scrollY,
          width: data.offsetWidth,
          height: data.offsetHeight,
          useCORS: true
        }).then((canvas) => {
          // let imgWidth = data.offsetWidth;
          let imgWidth = canvas.width;
          // let imgHeight = (canvas.height * imgWidth) / canvas.width;
          let imgHeight = canvas.height;;

          const totalParts = Math.ceil(imgHeight / pdfHeight);
          console.log(imgHeight);

          const remainingHeight = imgHeight % pdfHeight !== 0 ? imgHeight % pdfHeight : pdfHeight;
          let spaceAvailable = pdfHeight; // Espacio disponible en la página actual

          const pdf = new jspdf({
            orientation: "p",
            unit: "mm",
            format: [imgWidth + (2 * margin), pdfHeight + (2 * margin)] // Agregar el margen al formato del PDF
          });

          for (let i = 0; i < totalParts; i++) {

            const partHeight = (i === totalParts - 1) ? remainingHeight : pdfHeight;

            const sourceY = (i * pdfHeight * canvas.height) / imgHeight;
            const canvasSource = document.createElement('canvas');
            canvasSource.width = imgWidth + (2 * margin); // Agregar el margen a la anchura del lienzo
            canvasSource.height = partHeight + (2 * margin); // Agregar el margen a la altura del lienzo

            const ctxSource = canvasSource.getContext('2d');
            ctxSource.fillStyle = "white"; // Cambiar el color del fondo si se desea
            ctxSource.fillRect(0, 0, canvasSource.width, canvasSource.height); // Rellenar con un fondo si se desea

            const marginLeft = 10; // Margen izquierdo
            const marginRight = 10; // Margen derecho
            const marginTop = 10; // Margen superior
            const marginBottom = 10; // Margen inferior

            ctxSource.drawImage(
              canvas,
              0, sourceY, imgWidth, partHeight,
              marginLeft, marginTop, imgWidth - (marginLeft + marginRight), partHeight - (marginTop + marginBottom)
            );

            const partImgData = canvasSource.toDataURL("image/jpeg");

            pdf.addImage(partImgData, 'JPEG', margin, margin, imgWidth, partHeight); // Agregar el margen a la coordenada de la imagen
            console.log(partHeight);

            if (i < totalParts - 1) {
              pdf.addPage();
            }
            spaceAvailable += partHeight;
          }

          pdf.save("Documento.pdf");
        });
      }
    });
  }

  condiciones(form_elem) {

    if (form_elem.condiciones) {

      let result = this.myFormGroup.value;
      let val = result[form_elem.label];

      if (this.form_condiciones) {
        if (this.form_condiciones.length > 0) {
          let operador = '==';
          this.form_condiciones.forEach(element => {
            if (element.operador) operador = element.operador;

            if (element.campovalidacion == form_elem.label) {
              let entro = 0;
              element.valorcongruente.forEach(valideVal => {
                if (typeof (val) == 'object') {


                  val.forEach(elementval => {
                    let id = elementval;
                    if (elementval.id) id = elementval.id;
                    if (elementval.Id) id = elementval.Id;
                    if (this.operadores[operador] && this.operadores[operador](valideVal, id)) {

                      if (element.mensaje) {
                        this.mensajeConfirmacion.push({ label: element.mensaje, value: element.campovalidacion });
                        entro = 1;
                      } else {
                        element.acciones.forEach(labels => {
                          this.objCondiciones.push(labels);
                          entro = 1;
                        });
                      }
                    }
                  });
                } else {
                  // if(valideVal == val){
                  if (this.operadores[operador] && this.operadores[operador](valideVal, val)) {

                    if (element.mensaje) {
                      this.mensajeConfirmacion.push({ label: element.mensaje, value: element.campovalidacion });
                      entro = 1;
                    } else {
                      element.acciones.forEach(labels => {
                        this.objCondiciones.push(labels);
                        entro = 1;

                      });
                    }
                  }
                }

              });
              if (entro == 0) {
                if (element.mensaje) {
                  if (this.mensajeConfirmacion.length > 0) {
                    this.mensajeConfirmacion = this.mensajeConfirmacion.filter(label => label.value !== element.campovalidacion);
                  }
                } else {
                  element.acciones.forEach(label => {
                    let id = label;
                    this.objCondiciones = this.objCondiciones.filter(label => label !== id)
                  });
                }


              }
            }
          });
        }
      }

    }
    // console.log(this.objCondiciones);
    console.log(this.mensajeConfirmacion);
  }
  condiciones_tab(form_elem, value?) {
    if (form_elem.condiciones) {
      console.log(form_elem.label + "==>" + value);
      let val = value;
      if (value != undefined && value != null) {
        this.form_template_set.forEach(input_template => {
          if (input_template.type == 'boton-tab' && input_template.label != form_elem.label) {
            this.condiciones_tab(input_template, null);
          }
        });
      }


      if (this.form_condiciones_tab) {
        if (this.form_condiciones_tab.length > 0) {
          let operador = '==';
          this.objCondiciones_tab = [];
          if (this.form_condiciones_tab.operador) operador = this.form_condiciones_tab.operador;
          this.form_condiciones_tab.forEach(element => {
            console.log(element.campovalidacion + "==>" + form_elem.label);
            if (element.campovalidacion == form_elem.label) {
              let entro = 0;


              element.valorcongruente.forEach(valideVal => {
                if (this.operadores[operador] && this.operadores[operador](valideVal, val)) {
                  element.acciones.forEach(labels => {
                    this.objCondiciones_tab.push(labels);
                    entro = 1;
                  });
                }
              });
              if (entro == 0) {
                element.acciones.forEach(label => {
                  let id = label;
                  this.objCondiciones_tab = this.objCondiciones_tab.filter(label => label !== id)
                });
              }
            }
          });
        }
      }
    }
  }
  fnCondicion(form_elem) {
    let bandera = 1;
    if (this.objCondiciones.length == 0) {
      bandera = 1;
    } else {
      this.objCondiciones.forEach(element => {
        if (element == form_elem.label) {
          this.myFormGroup.controls[element].setValue(null);
          bandera = 0;
          // console.log(element + "==>" + bandera);

        }
      });
    }
    return {
      'display': bandera > 0 ? 'block' : 'none', // Cambia el color de fondo
    };
  }
  fnCondicion_tab(form_elem) {
    // console.log(this.objCondiciones_tab);

    let bandera = 1;
    if (this.objCondiciones_tab.length == 0) {
      bandera = 1;
    } else {
      this.objCondiciones_tab.forEach(element => {
        if (element == form_elem.label) {
          // this.myFormGroup.controls[element].setValue(null);
          bandera = 0;
        }
      });
    }
    return {
      'position': bandera > 0 ? 'static' : 'absolute',
      'left': bandera > 0 ? 'auto' : '-9999px',
      // Cambia el color de fondo
    };
  }
  reloadIframe(): void {
    if (this.iframe && this.iframe.nativeElement) {
      console.log("reload iframe");

      const iframeNative = this.iframe.nativeElement as HTMLIFrameElement;
      let val = iframeNative.src;
      iframeNative.src = null;
      setTimeout(() => {
        iframeNative.src = val; // Recargar el iframe reiniciando su `src`.
      }, 1000);
    }
  }
  goBack() {
    this.location.back();
  }
  onPickListChange(event, form_elem) {
    // Actualizar el formControl con los elementos seleccionados
    this.myFormGroup.controls[form_elem.label].setValue(form_elem.target);
    // Ejecutar lógica de condiciones si aplica
    this.condiciones(form_elem);
  }

}
