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
}
