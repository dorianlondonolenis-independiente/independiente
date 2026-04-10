import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiViewerService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  /**
   * Ejecuta un endpoint basado en el tipo de parámetro
   * Si es número: ejecuta /queries/{id}/execute
   * Si es string: ejecuta /data/{tableName}
   */
  executeEndpoint(param: string, limit: number = 100, offset: number = 0): Observable<any> {
    console.log('🔵 executeEndpoint llamado con:', param);
    
    // Validar si es número
    const isNumeric = /^\d+$/.test(param);
    console.log('Es numérico?', isNumeric);

    if (isNumeric) {
      // Es un ID de query
      const queryId = parseInt(param, 10);
      console.log('👉 Ejecutando query con ID:', queryId);
      return this.executeQuery(queryId, limit, offset);
    } else {
      // Es un nombre de tabla
      console.log('👉 Obteniendo datos de tabla:', param);
      return this.getTableData(param, limit, offset);
    }
  }

  /**
   * Ejecuta una consulta guardada
   */
  private executeQuery(id: number, limit: number = 100, offset: number = 0): Observable<any> {
    const url = `${this.apiUrl}/queries/${id}/execute?limit=${limit}&offset=${offset}`;
    console.log('📝 URL Query:', url);
    return this.http.get<any>(url).pipe(
      tap(response => console.log('✅ Respuesta Query recibida:', response)),
      catchError(error => {
        console.error('❌ Error en Query:', error);
        throw error;
      })
    );
  }

  /**
   * Obtiene datos de una tabla
   */
  private getTableData(tableName: string, limit: number = 100, offset: number = 0): Observable<any> {
    const url = `${this.apiUrl}/data/${tableName}?limit=${limit}&offset=${offset}`;
    console.log('📝 URL Data:', url);
    return this.http.get<any>(url).pipe(
      tap(response => console.log('✅ Respuesta Data recibida:', response)),
      catchError(error => {
        console.error('❌ Error en Data:', error);
        throw error;
      })
    );
  }

  /**
   * Obtiene todas las consultas disponibles
   */
  getAllQueries(): Observable<any> {
    const url = `${this.apiUrl}/queries`;
    return this.http.get<any>(url);
  }

  /**
   * Obtiene las columnas de una tabla
   */
  getTableColumns(tableName: string): Observable<any[]> {
    const url = `${this.apiUrl}/metadata/tables/${tableName}/columns`;
    return this.http.get<any[]>(url).pipe(
      catchError(error => {
        console.error('❌ Error obteniendo columnas:', error);
        throw error;
      })
    );
  }

  /**
   * Obtiene las primary keys de una tabla
   */
  getTablePrimaryKeys(tableName: string): Observable<any> {
    const url = `${this.apiUrl}/data/${tableName}/primary-keys`;
    return this.http.get<any>(url).pipe(
      catchError(error => {
        console.error('❌ Error obteniendo PKs:', error);
        throw error;
      })
    );
  }

  /**
   * Crea un registro en una tabla
   */
  createRecord(tableName: string, data: Record<string, any>): Observable<any> {
    const url = `${this.apiUrl}/data/${tableName}`;
    return this.http.post<any>(url, data).pipe(
      catchError(error => {
        console.error('❌ Error creando registro:', error);
        throw error;
      })
    );
  }

  /**
   * Actualiza un registro por PK
   */
  updateRecord(tableName: string, idField: string, idValue: string, data: Record<string, any>): Observable<any> {
    const url = `${this.apiUrl}/data/${tableName}/${idField}/${idValue}`;
    return this.http.put<any>(url, data).pipe(
      catchError(error => {
        console.error('❌ Error actualizando registro:', error);
        throw error;
      })
    );
  }

  /**
   * Actualiza un registro usando todos los campos originales en el WHERE (sin PK)
   */
  updateRecordByRow(tableName: string, original: Record<string, any>, updated: Record<string, any>): Observable<any> {
    const url = `${this.apiUrl}/data/${tableName}/by-row`;
    return this.http.put<any>(url, { original, updated }).pipe(
      catchError(error => {
        console.error('❌ Error actualizando registro por fila:', error);
        throw error;
      })
    );
  }

  /**
   * Elimina un registro por PK
   */
  deleteRecord(tableName: string, idField: string, idValue: string): Observable<any> {
    const url = `${this.apiUrl}/data/${tableName}/${idField}/${idValue}`;
    return this.http.delete<any>(url).pipe(
      catchError(error => {
        console.error('❌ Error eliminando registro:', error);
        throw error;
      })
    );
  }

  /**
   * Elimina un registro usando todos los campos en el WHERE (sin PK)
   */
  deleteRecordByRow(tableName: string, conditions: Record<string, any>): Observable<any> {
    const url = `${this.apiUrl}/data/${tableName}/delete-by-row`;
    return this.http.post<any>(url, { conditions }).pipe(
      catchError(error => {
        console.error('❌ Error eliminando registro por fila:', error);
        throw error;
      })
    );
  }

  /**
   * Crea una nueva consulta guardada
   */
  createQuery(data: { nombre: string; tableName: string; columnNames: string[]; description?: string }): Observable<any> {
    const url = `${this.apiUrl}/queries`;
    return this.http.post<any>(url, data).pipe(
      tap(response => console.log('✅ Query creada:', response)),
      catchError(error => {
        console.error('❌ Error creando query:', error);
        throw error;
      })
    );
  }
}
