import { Component, inject, signal, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, ChatResponse } from '../../services/chat.service';

interface Mensaje {
  tipo: 'usuario' | 'bot' | 'error';
  texto: string;
  sql?: string;
  resultado?: Record<string, unknown>[];
  tokens?: number;
  mostrarSql?: boolean;
  columnas?: string[];
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat-wrapper d-flex flex-column" style="height:calc(100vh - 56px)">
      <!-- Header -->
      <div class="bg-white border-bottom px-4 py-3 d-flex align-items-center gap-2">
        <i class="bi bi-robot text-primary fs-4"></i>
        <div>
          <h5 class="mb-0 fw-semibold">Chat IA — Consultas en lenguaje natural</h5>
          <small class="text-muted">Modelo: qwen2.5:7b (local) | BD: unoee_pruebas</small>
        </div>
      </div>

      <!-- Mensajes -->
      <div class="flex-grow-1 overflow-auto p-4 bg-light" #scrollContainer>
        <!-- Mensaje bienvenida -->
        @if (mensajes().length === 0) {
          <div class="text-center py-5 text-muted">
            <i class="bi bi-chat-dots fs-1 d-block mb-3 text-primary opacity-50"></i>
            <h6>¿Qué quieres consultar?</h6>
            <p class="small mb-4">Escribe en español y el modelo generará el SQL automáticamente</p>
            <div class="d-flex flex-wrap gap-2 justify-content-center">
              @for (sugerencia of sugerencias; track sugerencia) {
                <button class="btn btn-outline-primary btn-sm" (click)="usarSugerencia(sugerencia)">
                  {{ sugerencia }}
                </button>
              }
            </div>
          </div>
        }

        <!-- Historial -->
        @for (msg of mensajes(); track $index) {
          <!-- Mensaje del usuario -->
          @if (msg.tipo === 'usuario') {
            <div class="d-flex justify-content-end mb-3">
              <div class="bg-primary text-white rounded-3 px-3 py-2" style="max-width:75%">
                {{ msg.texto }}
              </div>
              <i class="bi bi-person-circle fs-4 text-muted ms-2 align-self-end"></i>
            </div>
          }

          <!-- Respuesta del bot -->
          @if (msg.tipo === 'bot') {
            <div class="d-flex mb-3">
              <i class="bi bi-robot fs-4 text-primary me-2 align-self-start mt-1"></i>
              <div style="max-width:90%">
                <!-- SQL colapsable -->
                <div class="card border-0 shadow-sm mb-2">
                  <div class="card-header bg-white py-2 d-flex align-items-center justify-content-between"
                       (click)="msg.mostrarSql = !msg.mostrarSql" style="cursor:pointer">
                    <span class="small fw-semibold text-secondary">
                      <i class="bi bi-code-slash me-1"></i>SQL generado
                    </span>
                    <div class="d-flex align-items-center gap-2">
                      <span class="badge bg-secondary small">{{ msg.tokens ?? 0 }} tokens</span>
                      <i class="bi" [class.bi-chevron-down]="!msg.mostrarSql"
                         [class.bi-chevron-up]="msg.mostrarSql"></i>
                    </div>
                  </div>
                  @if (msg.mostrarSql) {
                    <div class="card-body p-0">
                      <pre class="m-0 p-3 bg-dark text-light rounded-bottom small"
                           style="white-space:pre-wrap;font-size:0.75rem">{{ msg.sql }}</pre>
                    </div>
                  }
                </div>

                <!-- Tabla de resultados -->
                @if (msg.resultado && msg.resultado.length > 0) {
                  <div class="card border-0 shadow-sm">
                    <div class="card-header bg-white py-2">
                      <span class="small fw-semibold text-secondary">
                        <i class="bi bi-table me-1"></i>{{ msg.resultado.length }} filas
                      </span>
                    </div>
                    <div class="card-body p-0 overflow-auto" style="max-height:300px">
                      <table class="table table-sm table-hover mb-0 small">
                        <thead class="table-light sticky-top">
                          <tr>
                            @for (col of msg.columnas ?? []; track col) {
                              <th class="px-3">{{ col }}</th>
                            }
                          </tr>
                        </thead>
                        <tbody>
                          @for (fila of msg.resultado; track $index) {
                            <tr>
                              @for (col of msg.columnas ?? []; track col) {
                                <td class="px-3">{{ fila[col] ?? '' }}</td>
                              }
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                } @else if (msg.resultado) {
                  <div class="alert alert-warning py-2 small mb-0">
                    <i class="bi bi-exclamation-triangle me-1"></i>Sin resultados para esta consulta.
                  </div>
                }
              </div>
            </div>
          }

          <!-- Error -->
          @if (msg.tipo === 'error') {
            <div class="d-flex mb-3">
              <i class="bi bi-robot fs-4 text-danger me-2 align-self-start mt-1"></i>
              <div class="alert alert-danger py-2 small mb-0" style="max-width:85%">
                <i class="bi bi-exclamation-circle me-1"></i>{{ msg.texto }}
              </div>
            </div>
          }
        }

        <!-- Loader -->
        @if (cargando()) {
          <div class="d-flex mb-3">
            <i class="bi bi-robot fs-4 text-primary me-2"></i>
            <div class="card border-0 shadow-sm px-3 py-2">
              <div class="d-flex align-items-center gap-2 text-muted small">
                <div class="spinner-border spinner-border-sm"></div>
                Generando SQL y ejecutando consulta...
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Input -->
      <div class="bg-white border-top px-4 py-3">
        <div class="d-flex gap-2">
          <input #inputRef
            type="text"
            class="form-control"
            placeholder="Ej: mostrar las 5 facturas más recientes de junio 2025"
            [(ngModel)]="preguntaActual"
            (keydown.enter)="enviar()"
            [disabled]="cargando()"
          />
          <button class="btn btn-primary px-4" (click)="enviar()"
                  [disabled]="cargando() || !preguntaActual.trim()">
            @if (cargando()) {
              <span class="spinner-border spinner-border-sm"></span>
            } @else {
              <i class="bi bi-send-fill"></i>
            }
          </button>
        </div>
        <div class="text-muted small mt-1">
          <i class="bi bi-shield-check me-1"></i>Solo se ejecutan consultas SELECT. El modelo corre localmente.
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chat-wrapper { background: #f8f9fa; }
    pre { font-family: 'Courier New', monospace; }
  `]
})
export class ChatComponent implements AfterViewChecked {
  private chatService = inject(ChatService);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  mensajes = signal<Mensaje[]>([]);
  cargando = signal(false);
  preguntaActual = '';

  sugerencias = [
    'Top 10 clientes por ventas',
    'Productos con más movimientos',
    'Últimos documentos contables aprobados',
    'Existencias actuales por item',
    'Ventas del periodo 202605',
  ];

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  usarSugerencia(texto: string) {
    this.preguntaActual = texto;
    this.enviar();
  }

  enviar() {
    const pregunta = this.preguntaActual.trim();
    if (!pregunta || this.cargando()) return;

    this.preguntaActual = '';
    this.mensajes.update(m => [...m, { tipo: 'usuario', texto: pregunta }]);
    this.cargando.set(true);

    this.chatService.query(pregunta).subscribe({
      next: (res: ChatResponse) => {
        const columnas = res.resultado.length > 0 ? Object.keys(res.resultado[0]) : [];
        this.mensajes.update(m => [...m, {
          tipo: 'bot',
          texto: '',
          sql: res.sql,
          resultado: res.resultado,
          columnas,
          tokens: res.tokens,
          mostrarSql: false,
        }]);
        this.cargando.set(false);
      },
      error: (err) => {
        const msg = err?.error?.message ?? err?.message ?? 'Error desconocido';
        this.mensajes.update(m => [...m, { tipo: 'error', texto: msg }]);
        this.cargando.set(false);
      }
    });
  }

  private scrollToBottom() {
    try {
      const el = this.scrollContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }
}
