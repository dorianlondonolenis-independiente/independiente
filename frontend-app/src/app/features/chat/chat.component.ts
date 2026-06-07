import { Component, inject, signal, ElementRef, ViewChild, effect, ChangeDetectionStrategy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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
  desdeCache?: boolean;
  esNatural?: boolean;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat-wrapper d-flex flex-column" style="height:calc(100vh - 56px)">
      <!-- Header -->
      <div class="bg-white border-bottom px-4 py-3 d-flex align-items-center gap-2">
        <div class="rounded-circle bg-primary bg-gradient d-flex align-items-center justify-content-center" style="width:40px;height:40px;flex-shrink:0">
          <i class="bi bi-stars text-white fs-5"></i>
        </div>
        <div class="flex-grow-1">
          <h5 class="mb-0 fw-semibold">Asistente de datos</h5>
          <small class="text-muted">Pregunta en español y obtienes los datos al instante</small>
        </div>
        @if (mensajes().length > 0) {
          <button class="btn btn-sm btn-outline-secondary" title="Limpiar conversación y caché" (click)="limpiar()">
            <i class="bi bi-trash3"></i>
          </button>
        }
      </div>

      <!-- Mensajes -->
      <div class="flex-grow-1 overflow-auto p-4 bg-light" #scrollContainer>
        <!-- Mensaje bienvenida -->
        @if (mensajes().length === 0) {
          <div class="text-center py-5 text-muted">
            <div class="rounded-circle bg-primary bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3" style="width:64px;height:64px">
              <i class="bi bi-stars fs-2 text-primary"></i>
            </div>
            <h6 class="fw-semibold text-dark">Hola, ¿en qué puedo ayudarte?</h6>
            <p class="small mb-4">Escribe tu pregunta en español — yo me encargo del resto.</p>
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
            <div class="d-flex mb-3 align-items-end">
              <div class="rounded-circle bg-primary bg-gradient d-flex align-items-center justify-content-center me-2" style="width:32px;height:32px;flex-shrink:0">
                <i class="bi bi-stars text-white small"></i>
              </div>
              <div style="max-width:90%">

                @if (msg.esNatural) {
                  <!-- Respuesta natural: texto plano, sin SQL ni tabla -->
                  <div class="card border-0 shadow-sm">
                    <div class="card-body py-2 px-3 small text-secondary">
                      <i class="bi bi-info-circle me-1"></i>{{ msg.texto }}
                    </div>
                  </div>
                } @else {
                  <!-- SQL colapsable -->
                  <div class="card border-0 shadow-sm mb-2">
                    <div class="card-header bg-white py-2 d-flex align-items-center justify-content-between"
                         (click)="msg.mostrarSql = !msg.mostrarSql" style="cursor:pointer">
                      <span class="small fw-semibold text-secondary">
                        <i class="bi bi-code-slash me-1"></i>SQL generado
                      </span>
                      <div class="d-flex align-items-center gap-2">
                        @if (msg.desdeCache) {
                          <span class="badge bg-success-subtle text-success border border-success-subtle small">
                            <i class="bi bi-lightning-fill me-1"></i>caché
                          </span>
                        } @else {
                          <span class="badge bg-secondary small">{{ msg.tokens ?? 0 }} tokens</span>
                        }
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
                }
              </div>
            </div>
          }

          <!-- Error -->
          @if (msg.tipo === 'error') {
            <div class="d-flex mb-3 align-items-end">
              <div class="rounded-circle bg-danger bg-opacity-10 d-flex align-items-center justify-content-center me-2" style="width:32px;height:32px;flex-shrink:0">
                <i class="bi bi-stars text-danger small"></i>
              </div>
              <div class="alert alert-danger py-2 small mb-0" style="max-width:85%">
                <i class="bi bi-exclamation-circle me-1"></i>{{ msg.texto }}
              </div>
            </div>
          }
        }

        <!-- Loader -->
        @if (cargando()) {
          <div class="d-flex mb-3 align-items-end">
            <div class="rounded-circle bg-primary bg-gradient d-flex align-items-center justify-content-center me-2" style="width:32px;height:32px;flex-shrink:0">
              <i class="bi bi-stars text-white small"></i>
            </div>
            <div class="card border-0 shadow-sm px-3 py-2">
              <div class="d-flex align-items-center gap-2 text-muted small">
                <span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>
                {{ mensajePensando() }}
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
          <i class="bi bi-lock me-1"></i>Tus datos nunca salen de la red local.
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chat-wrapper { background: #f8f9fa; }
    pre { font-family: 'Courier New', monospace; }
    .typing-dots span {
      animation: blink 1.2s infinite;
      font-size: 1.2rem;
      line-height: 1;
      margin-right: 1px;
    }
    .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes blink {
      0%, 80%, 100% { opacity: 0.15; }
      40% { opacity: 1; }
    }
  `]
})
export class ChatComponent {
  private chatService = inject(ChatService);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  mensajes = signal<Mensaje[]>([]);
  cargando = signal(false);
  preguntaActual = '';
  mensajePensando = signal('Pensando...');

  private readonly frasesPensando = [
    'Pensando...',
    'Analizando tu pregunta...',
    'Buscando en los datos...',
    'Preparando la respuesta...',
    'Un momento...',
    'Consultando la base de datos...',
  ];
  private pensandoInterval: ReturnType<typeof setInterval> | null = null;

  sugerencias = [
    'Top 10 clientes por ventas',
    'Productos con más movimientos',
    'Últimos documentos contables aprobados',
    'Existencias actuales por item',
    'Ventas del periodo 202605',
  ];

  constructor() {
    if (this.isBrowser) {
      effect(() => {
        this.mensajes();
        this.cargando();
        setTimeout(() => this.scrollToBottom(), 50);
      });
    }
  }

  private iniciarPensando() {
    if (!this.isBrowser) return;
    let i = 0;
    this.mensajePensando.set(this.frasesPensando[0]);
    this.pensandoInterval = setInterval(() => {
      i = (i + 1) % this.frasesPensando.length;
      this.mensajePensando.set(this.frasesPensando[i]);
    }, 2500);
  }

  private detenerPensando() {
    if (this.pensandoInterval) {
      clearInterval(this.pensandoInterval);
      this.pensandoInterval = null;
    }
  }

  usarSugerencia(texto: string) {
    this.preguntaActual = texto;
    this.enviar();
  }

  enviar() {
    const pregunta = this.preguntaActual.trim();
    if (!pregunta || this.cargando()) return;

    const key = pregunta.trim().toLowerCase();
    const esCache = this.chatService.cache.has(key);

    this.preguntaActual = '';
    this.mensajes.update(m => [...m, { tipo: 'usuario', texto: pregunta }]);
    this.cargando.set(true);
    if (!esCache) this.iniciarPensando();

    this.chatService.query(pregunta).subscribe({
      next: (res: ChatResponse) => {
        this.detenerPensando();

        if (res.esNatural) {
          // Pregunta conceptual o sin dominio → respuesta de texto plano
          this.mensajes.update(m => [...m, {
            tipo: 'bot',
            texto: res.respuestaNatural ?? 'No tengo datos para responder esa pregunta.',
            esNatural: true,
            desdeCache: esCache,
          }]);
        } else {
          const columnas = res.resultado.length > 0 ? Object.keys(res.resultado[0]) : [];
          this.mensajes.update(m => [...m, {
            tipo: 'bot',
            texto: '',
            sql: res.sql,
            resultado: res.resultado,
            columnas,
            tokens: res.tokens,
            mostrarSql: false,
            desdeCache: esCache,
          }]);
        }
        this.cargando.set(false);
      },
      error: (err) => {
        this.detenerPensando();
        const msg = err?.error?.message ?? err?.message ?? 'Error desconocido';
        this.mensajes.update(m => [...m, { tipo: 'error', texto: msg }]);
        this.cargando.set(false);
      }
    });
  }

  limpiar() {
    this.mensajes.set([]);
    this.chatService.clearCache();
  }

  private scrollToBottom() {
    if (!this.isBrowser) return;
    try {
      const el = this.scrollContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }
}
