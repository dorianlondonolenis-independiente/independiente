import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface ChatResponse {
  pregunta: string;
  sql: string;
  resultado: Record<string, unknown>[];
  tokens: number;
  esNatural?: boolean;
  respuestaNatural?: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private apiUrl = 'http://localhost:3000/api/chat';
  readonly cache = new Map<string, ChatResponse>();

  constructor(private http: HttpClient) {}

  query(pregunta: string): Observable<ChatResponse> {
    const key = pregunta.trim().toLowerCase();
    const cached = this.cache.get(key);
    if (cached) return of(cached);

    return this.http.post<ChatResponse>(`${this.apiUrl}/query`, { pregunta }).pipe(
      tap(res => this.cache.set(key, res))
    );
  }

  clearCache() {
    this.cache.clear();
  }
}
