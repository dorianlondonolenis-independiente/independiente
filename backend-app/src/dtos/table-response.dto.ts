export class ColumnDefinitionDto {
  id: string;
  descripcion: string;
  orden: number;
}

export class TableResponseDto {
  titulo: string;
  subtitulo: string;
  buscador: boolean;
  columnasBuscador: boolean;
  columnasVisibles: boolean;
  exportar: boolean;
  contextoMenu: any[];
  boton: any[];
  columnas: ColumnDefinitionDto[];
  datos: any[];
}
