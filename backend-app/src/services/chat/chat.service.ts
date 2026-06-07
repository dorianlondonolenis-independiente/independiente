import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as http from 'http';

@Injectable()
export class ChatService {
  private readonly schema: string;
  private readonly ollamaModel = 'qwen2.5:7b';
  private readonly ollamaHost = '127.0.0.1';
  private readonly ollamaPort = 11434;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    // Cargar schema curado al iniciar el servicio
    try {
      const schemaPath = join(process.cwd(), '..', 'docs', 'MODELO-RELACIONAL.md');
      this.schema = readFileSync(schemaPath, 'utf-8');
    } catch {
      this.schema = '';
    }
  }

  async query(pregunta: string): Promise<{ sql: string; resultado: unknown[]; pregunta: string; tokens: number }> {
    if (!pregunta || pregunta.trim().length < 3) {
      throw new BadRequestException('La pregunta debe tener al menos 3 caracteres');
    }

    const sql = await this.generarSQL(pregunta.trim());
    const validado = this.validarSQL(sql);
    const resultado = await this.ejecutarSQL(validado);

    return {
      pregunta: pregunta.trim(),
      sql: validado,
      resultado,
      tokens: Math.ceil((pregunta.length + sql.length) / 4),
    };
  }

  private async generarSQL(pregunta: string): Promise<string> {
    const systemPrompt = `Eres un experto en SQL Server. Genera SOLO la consulta SQL sin explicaciones, sin markdown, sin bloques de código.
REGLAS ESTRICTAS:
- Solo SELECT, nunca INSERT/UPDATE/DELETE/DROP/CREATE/ALTER
- Siempre usa TOP 10 si el usuario no especifica un límite
- Usa los nombres exactos de tablas y columnas del schema
- Para nombres de clientes o productos usa LIKE '%texto%'
- Los periodos tienen formato YYYYMM (ejemplo: 202605 = junio 2025)
- Siempre termina con punto y coma

SCHEMA DE LA BASE DE DATOS:
${this.schema}`;

    const userPrompt = `Genera una consulta SQL para: ${pregunta}`;

    const body = JSON.stringify({
      model: this.ollamaModel,
      prompt: `<|im_start|>system\n${systemPrompt}<|im_end|>\n<|im_start|>user\n${userPrompt}<|im_end|>\n<|im_start|>assistant\n`,
      stream: false,
      options: { temperature: 0.1, top_p: 0.9, num_predict: 512 },
    });

    return new Promise((resolve, reject) => {
      const req = http.request(
        { hostname: this.ollamaHost, port: this.ollamaPort, path: '/api/generate', method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed.response?.trim() ?? '');
            } catch {
              reject(new InternalServerErrorException('Error al parsear respuesta de Ollama'));
            }
          });
        },
      );
      req.on('error', (e) => reject(new InternalServerErrorException(`Ollama no disponible: ${e.message}`)));
      req.setTimeout(60000, () => { req.destroy(); reject(new InternalServerErrorException('Ollama timeout (60s)')); });
      req.write(body);
      req.end();
    });
  }

  private validarSQL(sql: string): string {
    // Limpiar markdown si el modelo lo envuelve
    let clean = sql.replace(/```sql\n?/gi, '').replace(/```\n?/gi, '').trim();

    // Solo la primera instrucción
    const firstSemicolon = clean.indexOf(';');
    if (firstSemicolon > -1) {
      clean = clean.substring(0, firstSemicolon + 1).trim();
    }

    // Solo SELECT permitido
    if (!/^\s*SELECT\b/i.test(clean)) {
      throw new BadRequestException('La IA generó una consulta no permitida. Solo se permiten consultas SELECT.');
    }

    // Bloquear palabras peligrosas
    const bloqueadas = /\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|sp_|xp_)\b/i;
    if (bloqueadas.test(clean)) {
      throw new BadRequestException('La consulta contiene operaciones no permitidas.');
    }

    // Inyectar TOP 10 si no tiene limit/top
    if (!/\bTOP\s+\d+\b/i.test(clean)) {
      clean = clean.replace(/^\s*SELECT\b/i, 'SELECT TOP 10');
    }

    return clean;
  }

  private async ejecutarSQL(sql: string): Promise<unknown[]> {
    try {
      const result = await this.dataSource.query(sql);
      return Array.isArray(result) ? result : [result];
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new BadRequestException(`Error al ejecutar la consulta: ${msg}`);
    }
  }
}
