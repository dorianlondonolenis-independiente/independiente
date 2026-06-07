import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatResponse {
  pregunta: string;
  sql: string;
  resultado: Record<string, unknown>[];
  tokens: number;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private apiUrl = 'http://localhost:3000/api/chat';

  constructor(private http: HttpClient) {}

  query(pregunta: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.apiUrl}/query`, { pregunta });
  }
}
