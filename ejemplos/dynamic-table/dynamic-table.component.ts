import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostListener, Input, OnInit, ViewChild } from '@angular/core';
import { AdministracionService } from 'src/app/services/administracion.service';
import { SesionService } from 'src/app/services/session/sesion.service';
import * as FileSaver from 'file-saver';
import { MessageService, MenuItem } from 'primeng/api';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
declare var $: any;
declare let alertify: any;
import Swal from 'sweetalert2';
// import { Workbook } from 'exceljs';
import * as ExcelJS from 'exceljs/dist/exceljs.min.js';




interface Column {
  field: string;
  header: string;
  list: string;
  customExportHeader?: string;
  tooltip?: string;
}
interface ExportColumn {
  title: string;
  dataKey: string;
}


@Component({
  selector: 'app-dynamic-table',
  templateUrl: './dynamic-table.component.html',
  styleUrls: ['./dynamic-table.component.css']
})
export class DynamicTableComponent implements OnInit {

  @Input() dataTable;
  @Input() dataTableId?: string = '';
  datostabla = [];
  objFilters = [];
  columnaMenu!: Column[];
  cols!: Column[];
  selectedColumns!: Column[];
  exportColumns!: ExportColumn[];
  footerColumns: any[] = null;

  exportar: boolean = true;
  clumnasVisibles: boolean = true;
  buscador: boolean = true;
  persistenciaDatos: boolean = false;
  columnasBurcador: boolean = true;


  titulo;
  titulo_formulario;
  subtitulo;
  parrafo;
  hoja_adicionales = [];
  src_buton: string = '';
  botonesAdicionales = [];
  calculatedHeight: string;
  isLoading: boolean = true;
  itemsContextoMenu;
  columnasgrupo: any[] = null;
  encabezadosExcel;

  itemsContextoMenuInitial!: MenuItem[];
  uniqueId = 'iframe-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
  iconMap: { [key: string]: string } = {
    // Acciones
    'fa-edit': '✏️',
    'fa-trash': '🗑️',
    'fa-copy': '📄',
    'fa-save': '💾',
    'fa-download': '⬇️',
    'fa-upload': '⬆️',
    'fa-plus': '➕',
    'fa-minus': '➖',
    'fa-times': '❌',
    'fa-check': '✔️',

    // Navegación
    'fa-home': '🏠',
    'fa-user': '👤',
    'fa-users': '👥',
    'fa-search': '🔍',
    'fa-cog': '⚙️',
    'fa-wrench': '🔧',
    'fa-sign-out': '🚪',
    'fa-sign-in': '🔑',

    // Comunicación
    'fa-envelope': '✉️',
    'fa-phone': '📞',
    'fa-comment': '💬',
    'fa-comments': '🗨️',
    'fa-bell': '🔔',
    'fa-info-circle': 'ℹ️',
    'fa-question': '❓',
    'fa-exclamation': '❗',

    // Archivos
    'fa-file': '📄',
    'fa-file-alt': '📑',
    'fa-folder': '📁',
    'fa-folder-open': '📂',
    'fa-paperclip': '📎',

    // Estado
    'fa-check-circle': '✅',
    'fa-circle-check': '🟢',
    'fa-times-circle': '❌',
    'fa-exclamation-triangle': '⚠️',
    'fa-hourglass': '⌛',
    'fa-spinner': '🔄',
    'fa-sync': '🔃',
    'fa-exchange': '🔄',

    // Multimedia
    'fa-play': '▶️',
    'fa-pause': '⏸️',
    'fa-stop': '⏹️',
    'fa-forward': '⏩',
    'fa-backward': '⏪',
    'fa-volume-up': '🔊',
    'fa-volume-mute': '🔇',

    // Dinero
    'fa-dollar-sign': '💲',
    'fa-credit-card': '💳',
    'fa-shopping-cart': '🛒',
    'fa-wallet': '👛',

    // Fechas y tiempo
    'fa-calendar': '📅',
    'fa-clock': '⏰',

    // Otros
    'fa-lightbulb': '💡',
    'fa-star': '⭐',
    'fa-heart': '❤️',
    'fa-lock': '🔒',
    'fa-unlock': '🔓',
    'fa-map-marker': '📍',
    'fa-globe': '🌍',
  };
  styleMap: any = {
    // === Fondos ===
    'bg-conaltura': {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA1D81A' } }, // verde
      font: { color: { argb: 'FFFFFFFF' } } // blanco
    },
    'bg-light-white': {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } },
      font: { color: { argb: 'FF000000' } }
    },
    'bg-conaltura-dark': {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF145160' } },
      font: { color: { argb: 'FFFFFFFF' } }
    },
    'bg-conaltura-white': {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '9FA1D81A' } },
      font: { color: { argb: 'FF000000' } }
    },

    // === Texto ===
    'text-conaltura': {
      font: { color: { argb: 'FFA1D81A' } }
    },
    'text-conaltura-dark': {
      font: { color: { argb: 'FF145160' } }
    },
    'text-white': {
      font: { color: { argb: 'FFFFFFFF' } }
    },
    'text-black': {
      font: { color: { argb: 'FF000000' } }
    },

    // === Botones ===
    'btn-conaltura': {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA1D81A' } },
      font: { color: { argb: 'FFFFFFFF' } },
      border: {
        top: { style: 'thin', color: { argb: 'FFA1D81A' } },
        left: { style: 'thin', color: { argb: 'FFA1D81A' } },
        bottom: { style: 'thin', color: { argb: 'FFA1D81A' } },
        right: { style: 'thin', color: { argb: 'FFA1D81A' } }
      }
    },
    'btn-conaltura-dark': {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF145160' } },
      font: { color: { argb: 'FFFFFFFF' } },
      border: {
        top: { style: 'thin', color: { argb: 'FF145160' } },
        left: { style: 'thin', color: { argb: 'FF145160' } },
        bottom: { style: 'thin', color: { argb: 'FF145160' } },
        right: { style: 'thin', color: { argb: 'FF145160' } }
      }
    },

    // === Bordes outline ===
    'btn-outline-conaltura': {
      font: { color: { argb: 'FFA1D81A' } },
      border: {
        top: { style: 'thin', color: { argb: 'FFA1D81A' } },
        left: { style: 'thin', color: { argb: 'FFA1D81A' } },
        bottom: { style: 'thin', color: { argb: 'FFA1D81A' } },
        right: { style: 'thin', color: { argb: 'FFA1D81A' } }
      }
    },
    'btn-outline-conaltura-dark': {
      font: { color: { argb: 'FF145160' } },
      border: {
        top: { style: 'thin', color: { argb: 'FF145160' } },
        left: { style: 'thin', color: { argb: 'FF145160' } },
        bottom: { style: 'thin', color: { argb: 'FF145160' } },
        right: { style: 'thin', color: { argb: 'FF145160' } }
      }
    }
  };


  constructor(private sanitizer: DomSanitizer, private router: Router, private route: ActivatedRoute, private AdministracionService: AdministracionService, private SesionService: SesionService, private cd: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.loadData()
    this.calculateHeight();
  }


  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.calculateHeight();
  }

  calculateHeight() {
    let viewportHeight = window.innerHeight;
    let otherElementsHeight = viewportHeight - (document.getElementById("tableDynamic").getBoundingClientRect().top + 300); // Puedes ajustar este valor según lo que necesites restar
    this.calculatedHeight = `${otherElementsHeight}px`;
  }
  loadData() {
    let data = this.dataTable;

    let objActions = [];
    if (data[0]['contextoMenu']) {
      if (data[0]['contextoMenu'].length > 0) {
        data[0]['contextoMenu'].forEach(element => {
          let list = '';
          if (element.list) list = element.list;
          let arrAction = { list: list, label: element.label, icon: element.icon, command: () => this.viewProduct(element.url, this.columnaMenu) };
          objActions.push(arrAction)
        });
      }
    }
    this.itemsContextoMenu = objActions;
    this.exportar = data[0]['exportar'];
    this.clumnasVisibles = data[0]['columnasVisibles'];
    this.buscador = data[0]['buscador'];
    this.columnasBurcador = data[0]['columnasBurcador'];
    if (data[0]['descripcion']) this.titulo_formulario = data[0]['descripcion'];
    if (data[0]['titulo']) this.titulo = data[0]['titulo'];
    if (data[0]['subtitulo']) this.subtitulo = data[0]['subtitulo'];
    if (data[0]['parrafo']) this.parrafo = data[0]['parrafo'];
    if (data[0]['boton']) this.botonesAdicionales = data[0]['boton'];
    if (data[0]['persistenciaDatos']) this.persistenciaDatos = data[0]['persistenciaDatos'];
    if (data[0]['datos']) {
      if (data[0]['datos'].length > 0) {
        this.datostabla = data[0]['datos'];
        console.log("entro");
      }
    }
    if (data[0]['tiempoRecarga']) {
      if (data[0]['urlRecargaDatos']) {
        setInterval(() => {
          console.log("recargando datos..." + data[0]['tiempoRecarga']);
          this.getData(data[0]['urlRecargaDatos'])

        }, Number(data[0]['tiempoRecarga']) * 1000);
      }
    }

    let obj = data[0];
    Object.keys(obj).forEach(key => {
      // saltar las propiedades que no son "hojas adicionales"
      if (key.startsWith('datos') && key != 'datos') {       // sólo claves datos2, datos3…
        let arr = obj[key];
        if (Array.isArray(arr) && arr.length > 0) {
          this.hoja_adicionales.push({
            hoja_name: key,  // nombre de la hoja = nombre de la propiedad
            datos: arr       // los datos
          });
        }
      }
    });

    if (data[0]['encabezadosExcel']) {
      if (data[0]['encabezadosExcel'].length > 0) {
        this.encabezadosExcel = data[0]['encabezadosExcel'];
      }
    }
    if (data[0]['footerColumns']) {
      if (data[0]['footerColumns'].length > 0) {
        this.footerColumns = data[0]['footerColumns'];
      }
    }

    if (data[0]['columnasgrupo']) {

      this.columnasgrupo = data[0]['columnasgrupo'];

    }
    if (data[0]['columnas']) {
      if (data[0]['columnas'].length > 0) {
        let colsPrev = [];
        let objFiltersPrev = [];
        data[0]['columnas'].forEach(element => {
          if (element.id != 'evento') {
            let px = element.px;
            if (px == undefined || px == null || px == "") {
              px = "auto";
            }
            let clase = element.class;
            if (clase == undefined || clase == null || clase == "") {
              clase = "";
            }
            let style = element.style;
            if (style == undefined || style == null || style == "") {
              style = "";
            }
            let list = '';
            if (element.list) list = element.list;

            let tooltip = '';
            if (element.title) tooltip = element.title;
            colsPrev.push({ field: element.id, header: element.descripcion, customExportHeader: element.descripcion, px: px, class: clase, style: style, list: list, tooltip: tooltip });
            objFiltersPrev.push(element.id);
          }
        });
        this.cols = colsPrev;
        this.objFilters = objFiltersPrev;

      }
    }


    this.cd.markForCheck();
    this.selectedColumns = this.cols;
    if (this.clumnasVisibles) {
      this.loadColumnsSesion()

    }
    this.exportColumns = this.cols.map((col) => ({ title: col.header, dataKey: col.field }));
    this.isLoading = false;
  }
  loadColumnsSesion() {
    if (sessionStorage.getItem('list-dinamico-' + this.dataTableId) && sessionStorage.getItem('list-dinamico-' + this.dataTableId + 'Selected')) {
      if (sessionStorage.getItem('list-dinamico-' + this.dataTableId) == JSON.stringify(this.cols)) {
        this.selectedColumns = JSON.parse(sessionStorage.getItem('list-dinamico-' + this.dataTableId + 'Selected'));
      }
    } else {
      if (this.cols.length > 0) {
        sessionStorage.setItem('list-dinamico-' + this.dataTableId, JSON.stringify(this.cols));
        sessionStorage.setItem('list-dinamico-' + this.dataTableId + 'Selected', JSON.stringify(this.selectedColumns));
      }
    }
  }
  sendColumnsSesion() {
    if (sessionStorage.getItem('list-dinamico-' + this.dataTableId) && sessionStorage.getItem('list-dinamico-' + this.dataTableId + 'Selected')) {
      if (sessionStorage.getItem('list-dinamico-' + this.dataTableId) == JSON.stringify(this.cols)) {
        if (this.cols.length > 0) {
          sessionStorage.setItem('list-dinamico-' + this.dataTableId + 'Selected', JSON.stringify(this.selectedColumns));
        }
      }
    }

  }

  // exportPdf() {
  //   import('jspdf').then((jsPDF) => {
  //     import('jspdf-autotable').then((x) => {
  //       const doc = new jsPDF.default('p', 'px', 'a4');
  //       (doc as any).autoTable(this.exportColumns, this.datostabla);
  //       doc.save('datostabla.pdf');
  //     });
  //   });
  // }
  async exportPdf() {
    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF('l', 'px', 'a4'); // Hoja horizontal
    const startY = 20;
    const fontSize = 10;
    const cellPadding = 4;

    // 1️⃣ Calcular ancho de cada columna según contenido
    let colWidths = this.exportColumns.map(col => {
      const headerLength = col.title.length;
      const maxDataLength = Math.max(
        ...this.datostabla.map(row => (row[col.dataKey]?.toString().length || 0))
      );
      return Math.max(headerLength * 7, maxDataLength * 7);
    });

    // 2️⃣ Calcular ancho total de la tabla CON padding
    const totalTableWidthWithPadding = colWidths.reduce((acc, w) => acc + w + cellPadding * 2, 0);

    // 3️⃣ Ancho de la página sin márgenes
    const availablePageWidth = doc.internal.pageSize.getWidth();

    // 4️⃣ Factor de zoom out para todo (columnas + padding + fuente)
    const scaleFactor = availablePageWidth / totalTableWidthWithPadding;

    // 5️⃣ Aplicar zoom out a columnas, fuente y padding
    colWidths = colWidths.map(w => w * scaleFactor);
    const scaledFontSize = Math.max(Math.floor(fontSize * scaleFactor), 6);
    const scaledCellPadding = cellPadding * scaleFactor;

    console.log('Scale factor:', scaleFactor);
    console.log('Scaled font size:', scaledFontSize);
    console.log('Scaled cell padding:', scaledCellPadding);
    console.log('Scaled column widths:', colWidths);

    // 6️⃣ Construir tabla
    (doc as any).autoTable({
      head: [this.exportColumns.map((col, i) => ({
        content: col.title,
        styles: {
          cellWidth: colWidths[i],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: scaledFontSize,
          overflow: 'linebreak'
        }
      }))],
      body: this.datostabla.map(row =>
        this.exportColumns.map((col, i) => ({
          content: row[col.dataKey]?.toString() || '',
          styles: {
            cellWidth: colWidths[i],
            fontSize: scaledFontSize,
            overflow: 'linebreak'
          }
        }))
      ),
      startY,
      styles: { cellPadding: scaledCellPadding },
      headStyles: { fillColor: [26, 216, 26], textColor: 255 },
      theme: 'grid',
      pageBreak: 'auto',
      showHead: 'everyPage'
    });

    doc.save('datostabla.pdf');
  }





  async exportExcel() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Reporte");
    let startRow = 1;
    if (this.encabezadosExcel) {
      // 🔹 Ajustamos un poco el ancho de A1 para que no quede aplastado
      worksheet.getColumn(1).width = 12;
      worksheet.getRow(1).height = 34; // para que la imagen se vea mejor

      // 1️⃣ Cargar la imagen desde assets
      const response = await fetch("assets/img/bic-logo-1.png");
      const arrayBuffer = await response.arrayBuffer();
      const imageBuffer = new Uint8Array(arrayBuffer);

      // 2️⃣ Agregar la imagen al workbook
      const imageId = workbook.addImage({
        buffer: imageBuffer,
        extension: "png",
      });

      // 3️⃣ Insertar la imagen SOLO en la celda A1
      worksheet.addImage(imageId, {
        tl: { col: 1, row: 0 },  // esquina superior izquierda (celda A1)
        ext: { width: 32, height: 32 }, // tamaño en pixeles aprox.
      });

      // 4️⃣ Fusionar celdas B1:D1 para el título
      let maxFila = 1;
      this.encabezadosExcel.forEach(element => {
        if (element.celda == "A1") {
          worksheet.mergeCells("B1:D1");
          const titulo = worksheet.getCell("B1");
          titulo.value = element.valor;
          titulo.font = { size: 16, bold: true, color: { argb: '004085' } };
          titulo.alignment = { horizontal: 'center' };
        } else {
          if (element.celda.includes(":")) {
            worksheet.mergeCells(element.celda);
            const titulo = worksheet.getCell(element.celda.split(":")[0]);
            titulo.value = element.valor;
          } else {
            worksheet.getCell(element.celda).value = element.valor;
            // Extraer el número de fila de la referencia "A3", "B5", etc.
            const fila = parseInt(element.celda.replace(/[^0-9]/g, ""), 10);
            if (!isNaN(fila)) {
              maxFila = Math.max(maxFila, fila);
            }
          }
        }


      });
      if (this.encabezadosExcel[this.encabezadosExcel.length - 1].celda.includes(":")) {
        maxFila = this.encabezadosExcel.length;
      }

      startRow = maxFila + 2; // La tabla empieza justo después del último encabezado
    }


    // =========================
    // 2️⃣ Ahora empiezas con tu tabla en la fila 5
    // =========================


    // Encabezados
    const headers = this.cols.map(c => c.header);
    worksheet.insertRow(startRow, headers);

    // Aplicar estilos a la fila de encabezado
    const headerRow = worksheet.getRow(startRow);

    this.cols.forEach((col, colIndex) => {
      const cell = headerRow.getCell(colIndex + 1);
      cell.value = col.header;

      const colClass = col['class']; // viene de element.class

      if (colClass && this.styleMap[colClass]) {
        const style = this.styleMap[colClass];
        if (style.fill) cell.fill = style.fill;
        if (style.font) cell.font = style.font;
        if (style.alignment) cell.alignment = style.alignment;
        if (style.border) cell.border = style.border;
      } else {
        // Estilo por defecto si no hay clase mapeada
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFA1D81A' } // amarillo
        };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
    });

    // 🔹 Exportar filas con datos a Excel
    this.datostabla.forEach(rowData => {
      const row = worksheet.addRow([]);

      this.cols.forEach((col, colIndex) => {
        let valorOriginal = rowData[col.field];
        const cell = row.getCell(colIndex + 1);

        // ✅ Si es null/undefined, dejamos vacío
        if (valorOriginal == null) {
          cell.value = '';
          return;
        }

        // 🔹 Detectar si es string con símbolo $
        if (typeof valorOriginal === 'string' && valorOriginal.includes('$')) {
          // Limpiar: quitar $ y separadores de miles, convertir coma decimal a punto
          let cleaned = valorOriginal.replace(/\$/g, '').trim();
          // quita puntos de miles si hay coma decimal
          if (cleaned.includes(',') && cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
            cleaned = cleaned.replace(/\./g, '');
            cleaned = cleaned.replace(',', '.');
          } else {
            cleaned = cleaned.replace(/,/g, '');
          }

          const numero = Number(cleaned) || 0;
          cell.value = numero; // valor numérico real
          cell.numFmt = '"$"#,##0.00'; // formato dinero Excel
          cell.font = { color: { argb: '000000' } };

        } else {
          // 🔹 Si no es $, aplicamos tu lógica original
          switch (this.validDato(valorOriginal)) {
            case 'url':
              let tipo = this.partirUrl(valorOriginal, 1).toLowerCase();

              // Si es icono FA
              if (tipo.includes('fa-') || tipo.includes('fa fa-')) {
                tipo = tipo.replace("fas ", "").replace("fa ", "");
                const matchedKey = Object.keys(this.iconMap).find(key => tipo.includes(key));

                // Si encuentra algo, usa su valor; si no, un ícono por defecto
                const mappedIcon = matchedKey ? this.iconMap[matchedKey] : '❔';
                if (mappedIcon) {
                  cell.value = mappedIcon; // emoji/icono equivalente

                  if (valorOriginal.toLowerCase().includes("text-success")) {
                    cell.font = { color: { argb: 'FF008000' } };
                  }
                  if (valorOriginal.toLowerCase().includes("text-primary")) {
                    cell.font = { color: { argb: 'FF0000' } };
                  }
                  if (valorOriginal.toLowerCase().includes("text-warning")) {
                    cell.font = { color: { argb: 'FFFFFF00' } };
                  }
                  if (valorOriginal.toLowerCase().includes("text-danger")) {
                    cell.font = { color: { argb: 'FF0000' } };
                  }
                  if (valorOriginal.toLowerCase().includes("text-info")) {
                    cell.font = { color: { argb: 'FFADD8E6' } };
                  }
                  if (valorOriginal.toLowerCase().includes("text-white")) {
                    cell.font = { color: { argb: 'FFFFFFFF' } };
                  }
                  if (valorOriginal.toLowerCase().includes("text-black")) {
                    cell.font = { color: { argb: 'FF000000' } };
                  }
                  if (valorOriginal.toLowerCase().includes("text-conaltura")) {
                    cell.font = { color: { argb: 'FF90EE90' } };
                  }
                  if (valorOriginal.toLowerCase().includes("text-secondary")) {
                    cell.font = { color: { argb: 'FFD3D3D3' } };
                  }
                  if (valorOriginal.toLowerCase().includes("text-conaltura-dark")) {
                    cell.font = { color: { argb: 'FF006400' } };
                  }
                } else {
                  cell.value = tipo;
                  cell.font = { color: { argb: 'FF0000' } }; // rojo
                }
              } else {
                switch (tipo) {
                  case 'editar':
                    cell.value = '✏️ Editar';
                    cell.font = { color: { argb: 'FFA500' }, bold: true }; // naranja
                    break;
                  case 'copiar':
                    cell.value = '📄 Copiar';
                    cell.font = { color: { argb: 'FFA500' }, bold: true };
                    break;
                  case 'eliminar':
                    cell.value = '🗑 Eliminar';
                    cell.font = { color: { argb: 'FF0000' }, bold: true }; // rojo
                    break;
                  case 'preguntas':
                    cell.value = '❓ Preguntas';
                    cell.font = { color: { argb: '333333' }, bold: true };
                    break;
                  case 'roles':
                    cell.value = '👥 Roles';
                    cell.font = { color: { argb: '333333' }, bold: true };
                    break;
                  default:
                    cell.value = this.partirUrl(valorOriginal, 1);
                    cell.font = { bold: true };
                }
              }
              break;

            case 'color':
              cell.value = ''; // no texto, solo color
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: valorOriginal.replace('#', '') } // ej: "#FF0000" → "FF0000"
              };
              break;

            default:
              // texto normal u otros
              cell.value = valorOriginal ?? '';
              cell.font = { color: { argb: '000000' } };
              break;
          }
        }
      });
    });


    // Después de insertar todas las filas de datos:
    // Creamos un array con los valores del footer
    if (this.footerColumns && this.footerColumns.length > 0) {
      const footerRowData: any[] = [];

      this.cols.forEach(col => {
        if (this.hasFooter(col.field)) {
          footerRowData.push(this.getFooterValue(col.field));
        } else {
          footerRowData.push('');
        }
      });

      // Añadimos la fila de footer
      const footerRow = worksheet.addRow(footerRowData);

      // 🔹 Aplicamos estilos y formatos según footerColumns
      this.cols.forEach((col, index) => {
        const cell = footerRow.getCell(index + 1);
        const config = this.footerColumns.find(fc => fc.campo === col.field);

        if (config) {
          // Estilo base (gris y negrita)
          cell.font = { bold: true, color: { argb: '000000' } };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFFF' } // gris claro
          };
          cell.alignment = { vertical: 'middle' };

          // 🔹 Formatos según config.formato
          switch (config.formato) {
            case 'money':
              cell.numFmt = '"$"#,##0.00'; // formato moneda en Excel
              break;

            case 'number':
              cell.numFmt = '#,##0.00'; // formato numérico con decimales
              break;

            case 'integer':
              cell.numFmt = '#,##0'; // formato número entero
              break;

            case 'percent':
              cell.numFmt = '0.00%'; // porcentaje
              break;

            case 'text':
            default:
              // Forzamos a texto plano
              cell.value = cell.value?.toString() ?? '';
              cell.numFmt = '@'; // formato texto
              break;
          }
        }
      });
    }


    // 🔹 Ajuste automático de ancho de columnas
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value ? cell.value.toString() : '';
        maxLength = Math.max(maxLength, cellValue.length);
      });
      column.width = maxLength + 2; // margen extra
    });

    if (this.hoja_adicionales && this.hoja_adicionales.length > 0) {
      this.hoja_adicionales.forEach(hoja => {
        let datos = hoja.datos;
        let hojaName = hoja.hoja_name || 'Hoja';
        hojaName = hojaName.replace("datos", "");
        // Crear hoja
        let ws = workbook.addWorksheet(hojaName);

        // Solo si hay datos
        if (datos && datos.length > 0) {
          // Sacar las claves del primer objeto → encabezados
          let headers = Object.keys(datos[0]);
          ws.addRow(headers);

          // Insertar filas de datos
          datos.forEach(item => {
            ws.addRow(headers.map(key => item[key]));
          });

          // Estilo encabezado
          let headerRow = ws.getRow(1);
          headerRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFA1D81A' }
            };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          });

          // Ajuste de ancho de columnas
          ws.columns.forEach((column) => {
            let maxLength = 0;
            column.eachCell({ includeEmpty: true }, (cell) => {
              const cellValue = cell.value ? cell.value.toString() : '';
              maxLength = Math.max(maxLength, cellValue.length);
            });
            column.width = maxLength + 2;
          });
        }
      });
    }




    // 🔹 Exportar
    workbook.xlsx.writeBuffer().then((buffer: any) => {
      FileSaver.saveAs(
        new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        'tabla.xlsx'
      );
    });
  }

  validDato(dato) {
    let detalle = 'text';
    if (dato && dato != "") {
      if (dato.includes('#/') || dato.includes('%23/')) {
        detalle = 'url';
      } else {
        if (dato.includes('#') && dato.length <= 10) {
          detalle = 'color';
        }
      }
    }
    return detalle;
  }
  viewProduct(url, columna) {
    let destino = url.replace('{evento}', columna.evento).replace('/#', '').replace('#', '');
    if (url.includes("modal_")) {
      this.isLoading = true;
      this.src_buton = null;
      setTimeout(() => {
        this.isLoading = false;
        this.src_buton = url.replace('{evento}', columna.evento).replace("modal_", "");
        setTimeout(() => {
          $("#modalBotonModalTable").modal('show');
        }, 500);
      }, 1500);
    } else {
      if (url.includes("api_")) {
        this.isLoading = true;
        let url2 = url.replace("api_#", "");
        if (this.isJsonString(url2)) {
          this.isLoading = false;
          url2 = url2.replace('{evento}', columna.evento);
          this.clicApi(url2);
        } else {
          this.AdministracionService.getDirect(url.replace('{evento}', columna.evento).replace("api_#", "")).subscribe({
            next: data => {
              this.isLoading = false;
              alertify.success('Asignacion de datos exitosa');
              this.reloadOnlyData(data);
            },
            error: (err) => {
              this.isLoading = false;
              alertify.error("Asignacion de datos fallida");
            }
          })
        }

      } else {
        //#swall
        if (url.includes('swall_#/')) {
          let url2 = url.split("|")[0];
          url2 = url2.replace("swall_#/", "");
          let iconSwall = url2.split(";")[0].replace("icon:", "");
          let textoSwall = url2.split(";")[1].replace("texto:", "");
          let tituloSwall = url2.split(";")[2].replace("titulo:", "");
          Swal.fire({
            title: tituloSwall,
            text: textoSwall,
            icon: iconSwall,
            showClass: {
              popup: `
                animate__animated
                animate__fadeInUp
                animate__faster
              `
            },
            hideClass: {
              popup: `
                animate__animated
                animate__fadeOutDown
                animate__faster
              `
            }
          });
        } else {
          if (url.includes('swallform_#/')) {
            let url2 = url.split("|")[0];
            url2 = url2.replace("swallform_#/", "");
            url2 = url2.replace('{evento}', columna.evento);
            const config = this.parseConfig(url2)
            this.lanzarSwal(config);

          } else {
            this.router.navigateByUrl("/", { skipLocationChange: true }).then(() => {
              this.router.navigate([destino])
            });
          }
        }
      }
    }
  }
  partirUrl(url, position) {
    let urlResponse = url;
    if (url && url != "") {
      if (url.includes("|")) {
        urlResponse = url.split("|")[position];
        urlResponse = urlResponse.replace("modal_", "");
      }
    }
    return urlResponse;
  }
  enviarA(url, position) {
    let urlResponse = url;
    if (url && url != "") {
      if (url.includes("|")) {
        urlResponse = url.split("|")[position];
      }
      if (url.includes("modal_")) {
        this.isLoading = true;
        this.src_buton = null;
        let url2 = url.replace("modal_", "");
        setTimeout(() => {
          this.isLoading = false;
          this.src_buton = encodeURI(url2.split("|")[position]);
          setTimeout(() => {
            $("#modalBotonModalTable").modal('show');
          }, 500);
        }, 1500);


      } else {
        if (url.includes("api_")) {
          this.isLoading = true;
          let url2 = url.replace("api_#", "");
          let url3 = url.replace("api_#/", "")
          if (this.isJsonString(url3.split("|")[position])) {
            this.isLoading = false;
            this.clicApi(url3.split("|")[position]);
          } else {
            this.AdministracionService.getDirect(url2.split("|")[position]).subscribe({
              next: data => {
                this.isLoading = false;
                alertify.success('Asignacion de datos exitosa');
                if (url2.split("|")[position].includes("urlresponse=")) {
                  let urlResp = url2.split("|")[position].split("urlresponse=")[1];
                  this.getData(urlResp);
                } else {
                  this.reloadOnlyData(data);
                }
              },
              error: (err) => {
                this.isLoading = false;
                alertify.error("Asignacion de datos fallida");
              }
            })
          }
        } else {
          //#swall
          if (url.includes('swall_#/')) {
            let url2 = url.split("|")[0];
            url2 = url2.replace("swall_#/", "");
            let iconSwall = url2.split(";")[0].replace("icon:", "");
            let textoSwall = url2.split(";")[1].replace("texto:", "");
            let tituloSwall = url2.split(";")[2].replace("titulo:", "");
            Swal.fire({
              title: tituloSwall,
              text: textoSwall,
              icon: iconSwall,
              showClass: {
                popup: `
                  animate__animated
                  animate__fadeInUp
                  animate__faster
                `
              },
              hideClass: {
                popup: `
                  animate__animated
                  animate__fadeOutDown
                  animate__faster
                `
              }
            });

          } else {
            if (url.includes('swallform_#/')) {
              let url2 = url.split("|")[0];
              url2 = url2.replace("swallform_#/", "");
              const config = this.parseConfig(url2)
              this.lanzarSwal(config);

            } else {
              if (url.includes('/0/diligenciar')) {
                location.href = url;
              } else {
                let destinosplit = urlResponse.replace('/#/', '').replace('/#', '').replace('#/', '');
                if (destinosplit.includes('?')) {
                  let [baseUrl, queryString] = destinosplit.split('?');
                  let queryParams = queryString
                    .split('&') // Divide por cada par clave=valor
                    .reduce((acc, param) => {
                      const [key, value] = param.split('='); // Divide clave y valor
                      acc[key] = value; // Asigna clave y valor al objeto
                      return acc;
                    }, {} as { [key: string]: string });
                  this.router.navigateByUrl("/", { skipLocationChange: true }).then(() => {
                    this.router.navigate([baseUrl], { queryParams })
                  });

                } else {
                  let baseUrl = destinosplit;
                  this.router.navigateByUrl("/", { skipLocationChange: true }).then(() => {
                    this.router.navigate([baseUrl])
                  });
                }
              }
            }

          }

        }
      }
    }
  }
  verificarYExtraerIdFormulario(url: string): string | null {
    // Verificar si la URL es válida según las rutas definidas en el enrutador
    const ruta = this.router.config.find(r => r.path === url);
    if (!ruta) {
      return null; // La URL no es válida
    }

    // Extraer el valor de idFormulario de la URL
    const match = /\/(\d+)$/.exec(url); // Busca una secuencia de dígitos al final de la URL
    if (match) {
      return match[1]; // Devuelve el valor capturado del grupo de captura (\d+)
    } else {
      return null; // No se encontró un valor de idFormulario en la URL
    }
  }
  onFilter(event, dt) {
    console.log(event.filters);
  }
  parseStyle(styleString: string): { [key: string]: string } {
    return styleString.split(';').reduce((acc, item) => {
      const [key, value] = item.split(':');
      if (key && value) {
        acc[key.trim()] = value.trim();
      }
      return acc;
    }, {} as { [key: string]: string });
  }
  reloadOnlyData(data) {
    if (data[0]['datos']) {
      if (data[0]['datos'].length > 0) {
        this.datostabla = data[0]['datos'];
      }
    }
  }
  onCellRightClick(event: MouseEvent, col: Column, rowData: any) {
    event.preventDefault();
    this.itemsContextoMenuInitial = this.itemsContextoMenu.filter(item => item.list?.toString() == col.list?.toString());
  }


  lanzarSwal(configObj) {
    // construir inputs dinámicos
    let htmlInputs = '';
    configObj.campos.forEach((c, i) => {
      htmlInputs += `<input id="swal-${c.name}" class="swal2-input" placeholder="${c.label}">`;
    });



    Swal.fire({
      title: configObj.titulo || 'Formulario',
      html: htmlInputs,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Si, Guardar !",
      cancelButtonText: "No, cancelar !",
      preConfirm: () => {
        const values: any = {};
        configObj.campos.forEach((c: any) => {
          values[c.name] = (document.getElementById(`swal-${c.name}`) as HTMLInputElement).value;
        });
        return values;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        console.log('Valores recogidos:', result.value);


        if (configObj.urlresponse) {
          this.sendDirectPost(configObj.url, result.value, configObj.urlresponse);
        } else {
          this.sendDirectPost(configObj.url, result.value);
        }
      }
    });
  }
  parseConfig(config: string) {
    const parts = config.split(';');
    const result: any = { campos: [] };

    parts.forEach(p => {
      const [key, value] = p.split(':');
      if (key.startsWith('campo')) {
        result.campos.push({ name: key, label: value });
      } else {
        result[key] = value;
      }
    });

    return result;
  }
  sendDirectPost(url, body, urlresponse?) {
    // this.isLoading = true;
    this.AdministracionService.postDirect(url, body).subscribe({
      next: data => {
        // this.isLoading = false;
        alertify.success('Asignacion de datos exitosa');
        if (urlresponse) {
          this.getData(urlresponse);
        }
      },
      error: (err) => {
        // this.isLoading = false;
        alertify.error("Asignacion de datos fallida");
      }
    })
  }
  clicApi(strJson) {
    let obj = JSON.parse(strJson);
    if (obj.msmConfirm) {
      Swal.fire({
        text: obj.msmConfirm,
        showCancelButton: true,
        confirmButtonText: 'Si, continuar!',
        cancelButtonText: 'No, cancelar!',
        reverseButtons: true
      }).then((result) => {
        if (result.isConfirmed) {
          this.sendClicApi(obj);
        } else if (
          /* Read more about handling dismissals below */
          result.dismiss === Swal.DismissReason.cancel
        ) {
          Swal.fire(
            'Operación cancelada',
            'No se realizaron cambios',
            'error'
          )
        }
      });
    }
  }
  isJsonString(str: string): boolean {
    try {
      let obj = JSON.parse(str);
      // Opcional: asegurar que sea un objeto o array
      return obj !== null && typeof obj === 'object';
    } catch (e) {
      return false;
    }
  }
  sendClicApi(obj) {
    this.AdministracionService.sendClicApi(obj).subscribe({
      next: data => {
        if (obj.urlResponseGet) {
          this.getData(obj.urlResponseGet);
        } else {
          this.reloadOnlyData(data);
        }
        if (obj.msmResponse) {
          alertify.success(obj.msmResponse);
        }
      },
      error: (err) => {

        alertify.error("Asignacion de datos fallida");
      }
    });
  }
  getData(url) {
    this.AdministracionService.getDirect(url).subscribe({
      next: data => {
        this.reloadOnlyData(data);
      },
      error: (err) => {
        console.log(err);
      }
    })
  }
  hasFooter(field: string): boolean {
    return this.footerColumns?.some(fc => fc.campo === field);
  }

  getFooterValue(field: string): any {
    // buscamos si hay configuración para esa columna
    const config = this.footerColumns.find(fc => fc.campo === field);
    if (!config) {
      return ''; // sin config, no mostramos nada
    }

    switch (config.operacion) {
      case 'sum':
        return this.datostabla
          .map((item: any) => this.parseToNumber(item[field]))
          .reduce((a, b) => a + b, 0);
      case 'count':
        return this.datostabla.length;
      case 'avg':
        const vals = this.datostabla.map((item: any) => Number(item[field]) || 0);
        return vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
      default:
        return '';
    }
  }
  parseToNumber(value: any): number {
    if (value == null) return 0;

    if (typeof value === 'number') return value;

    if (typeof value === 'string') {
      // Elimina símbolo de $ y espacios
      let cleaned = value.replace(/[^0-9,.-]/g, '');
      // Si usa coma como decimal, lo pasamos a punto
      if (cleaned.includes(',') && cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
        cleaned = cleaned.replace(/\./g, ''); // quita separadores de miles con punto
        cleaned = cleaned.replace(',', '.'); // convierte coma decimal en punto
      } else {
        // quita comas como separador de miles
        cleaned = cleaned.replace(/,/g, '');
      }
      const n = parseFloat(cleaned);
      return isNaN(n) ? 0 : n;
    }

    return 0;
  }
  getFooterFormato(field: string): string | null {
    const config = this.footerColumns.find(fc => fc.campo === field);
    return config ? config.formato : null;
  }
  getFooterExcelValue(field: string): any {
    const config = this.footerColumns.find(fc => fc.campo === field);
    if (!config) return '';

    const value = this.getFooterValue(field);
    switch (config.formato) {
      case 'number':
        return value; // Excel lo trata como número
      case 'money':
        return value; // Excel lo trata como número, puedes aplicar estilo currency
      default:
        return value.toString();
    }
  }

}
