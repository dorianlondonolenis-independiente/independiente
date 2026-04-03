import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiViewerService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  /**
   * Ejecuta un endpoint dinámico basado en el tipo
   */
  executeEndpoint(
    endpointType: string,
    params?: Record<string, any>,
  ): Observable<any> {
    const endpoint = this.buildUrl(endpointType, params);
    return this.http.get(endpoint);
  }

  /**
   * Construye la URL completa del endpoint
   */
  private buildUrl(endpointType: string, params?: Record<string, any>): string {
    const cleanParams = params || {};

    // Mapeo de endpoints disponibles
    const endpointMap: Record<string, () => string> = {
      // === METADATA ===
      'metadata/database': () => `${this.apiUrl}/metadata/database`,

      'metadata/tables': () => `${this.apiUrl}/metadata/tables`,

      'metadata/tables/columns': () =>
        `${this.apiUrl}/metadata/tables/${cleanParams.tableName}/columns`,

      'metadata/tables/row-count': () =>
        `${this.apiUrl}/metadata/tables/${cleanParams.tableName}/row-count`,

      // === DATA ===
      'data/table': () =>
        `${this.apiUrl}/data/${cleanParams.tableName}?limit=${cleanParams.limit || 100}&offset=${cleanParams.offset || 0}`,

      'data/single': () =>
        `${this.apiUrl}/data/${cleanParams.tableName}/${cleanParams.idField}/${cleanParams.idValue}`,

      // === QUERIES (Consultas Guardadas) ===
      'queries/list': () => `${this.apiUrl}/queries`,

      'queries/create': () => `${this.apiUrl}/queries`,

      'queries/detail': () => `${this.apiUrl}/queries/${cleanParams.id}`,

      'queries/execute': () =>
        `${this.apiUrl}/queries/${cleanParams.id}/execute?limit=${cleanParams.limit || 100}&offset=${cleanParams.offset || 0}`,

      'queries/update': () => `${this.apiUrl}/queries/${cleanParams.id}`,

      'queries/delete': () => `${this.apiUrl}/queries/${cleanParams.id}`,
    };

    const urlBuilder = endpointMap[endpointType];

    if (!urlBuilder) {
      throw new Error(`Endpoint type "${endpointType}" not found`);
    }

    return urlBuilder();
  }

  /**
   * Obtener METADATA - Estructura completa de BD
   */
  getMetadataDatabase(): Observable<any> {
    return this.executeEndpoint('metadata/database');
  }

  /**
   * Obtener METADATA - Lista de tablas
   */
  getMetadataTables(): Observable<any> {
    return this.executeEndpoint('metadata/tables');
  }

  /**
   * Obtener METADATA - Columnas de una tabla
   */
  getMetadataTableColumns(tableName: string): Observable<any> {
    return this.executeEndpoint('metadata/tables/columns', { tableName });
  }

  /**
   * Obtener METADATA - Cantidad de registros en tabla
   */
  getMetadataRowCount(tableName: string): Observable<any> {
    return this.executeEndpoint('metadata/tables/row-count', { tableName });
  }

  /**
   * Obtener DATA - Registros de una tabla con paginación
   */
  getTableData(
    tableName: string,
    limit: number = 100,
    offset: number = 0,
  ): Observable<any> {
    return this.executeEndpoint('data/table', { tableName, limit, offset });
  }

  /**
   * Obtener DATA - Un registro específico por ID
   */
  getTableSingleRecord(
    tableName: string,
    idField: string,
    idValue: any,
  ): Observable<any> {
    return this.executeEndpoint('data/single', { tableName, idField, idValue });
  }

  /**
   * Obtener QUERIES - Lista de consultas guardadas
   */
  getQueriesList(): Observable<any> {
    return this.executeEndpoint('queries/list');
  }

  /**
   * Obtener QUERIES - Detalle de consulta específica
   */
  getQueryDetail(id: number): Observable<any> {
    return this.executeEndpoint('queries/detail', { id });
  }

  /**
   * Ejecutar QUERIES - Ejecutar consulta guardada
   */
  executeQuery(
    id: number,
    limit: number = 100,
    offset: number = 0,
  ): Observable<any> {
    return this.executeEndpoint('queries/execute', { id, limit, offset });
  }

  /**
   * Crear QUERIES - Guardar nueva consulta
   */
  createQuery(queryData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/queries`, queryData);
  }

  /**
   * Actualizar QUERIES - Modificar consulta existente
   */
  updateQuery(id: number, queryData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/queries/${id}`, queryData);
  }

  /**
   * Eliminar QUERIES - Borrar consulta
   */
  deleteQuery(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/queries/${id}`);
  }
}
