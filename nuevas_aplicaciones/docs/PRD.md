# PRD — Tableros y Gráficos Comparativos de Inventario

**Versión:** 1.0  
**Fecha:** 2026-04-09  
**Estado:** Borrador  

---

## 1. Visión del Producto

Aplicación web de solo lectura que se conecta a la base de datos **UnoEE** para generar tableros interactivos, gráficos comparativos entre productos de inventario y exportación de datos en múltiples formatos. La aplicación resuelve la falta de visualización, documentación relacional y capacidades de análisis sobre las tablas existentes.

---

## 2. Problemas a Resolver

| # | Problema | Impacto |
|---|---------|---------|
| 1 | No existe un diagrama de datos relacional explícito de las tablas | Dificulta comprender las relaciones entre entidades y construir consultas correctas |
| 2 | Los nombres de tablas y columnas no son descriptivos (ej: `t145_mc_conceptos`, `f145_id`) | Los usuarios no pueden identificar qué datos contiene cada tabla sin documentación externa |
| 3 | No hay visualización de gráficos ni modelo comparativo | Imposibilita el análisis visual de tendencias de inventario y comparación entre productos |
| 4 | No existe generación de informes con filtros avanzados | Los usuarios no pueden extraer información filtrada ni compartir reportes |

---

## 3. Objetivos del Proyecto

1. **Gráficos comparativos** — Generar visualizaciones que permitan comparar productos de inventario con filtros dinámicos
2. **Modelo relacional estándar** — Documentar y mapear las relaciones entre tablas de UnoEE para facilitar la obtención y comprensión de los datos
3. **Exportación flexible** — Permitir exportar datos filtrados en múltiples formatos (Excel, CSV, PDF, JSON)
4. **Informes con filtros** — Generar informes utilizando todos los filtros posibles de las tablas relacionadas

---

## 4. Usuarios Objetivo

| Rol | Necesidad |
|-----|-----------|
| Analista de inventario | Comparar productos, ver tendencias, generar reportes |
| Administrador | Consultar estado general del inventario, identificar anomalías |
| Gerencia | Visualizar dashboards ejecutivos con KPIs de inventario |

---

## 5. Alcance

### 5.1 Dentro del Alcance

- Conexión de solo lectura a base de datos UnoEE (SQL Server)
- Descubrimiento y mapeo automático de tablas y relaciones
- Asignación de alias/descripciones amigables a tablas y columnas
- Tableros (dashboards) configurables con gráficos
- Gráficos comparativos: barras, líneas, pie, área, scatter
- Filtros dinámicos por cualquier columna disponible
- Exportación de datos: Excel, CSV, PDF, JSON
- Generación de informes con filtros aplicados
- Menú con las tablas más relevantes de inventario

### 5.2 Fuera del Alcance

- Escritura, actualización o eliminación de datos en UnoEE
- Autenticación de usuarios (fase 1; se puede agregar en fase 2)
- Integración con otros sistemas ERP
- Procesamiento en tiempo real / streaming

---

## 6. Requisitos Funcionales

### RF-01: Descubrimiento de Datos
- **RF-01.1** — Listar todas las tablas de UnoEE con metadata (nombre, esquema, cantidad de registros)
- **RF-01.2** — Mostrar columnas de cada tabla con tipo de dato, nulabilidad y claves primarias
- **RF-01.3** — Detectar relaciones implícitas entre tablas por convención de nombres (FK patterns)
- **RF-01.4** — Permitir asignar alias descriptivos a tablas y columnas

### RF-02: Modelo Relacional
- **RF-02.1** — Generar diagrama visual de relaciones entre tablas
- **RF-02.2** — Permitir definir relaciones manuales entre tablas cuando no se detectan automáticamente
- **RF-02.3** — Agrupar tablas por dominio/módulo (inventario, conceptos, maestros, etc.)
- **RF-02.4** — Persistir el modelo relacional documentado para consultas futuras

### RF-03: Consultas y Filtros
- **RF-03.1** — Consultar datos de cualquier tabla con paginación
- **RF-03.2** — Aplicar filtros por columna: igualdad, rango, contiene, nulo/no nulo
- **RF-03.3** — Combinar filtros con operadores AND/OR
- **RF-03.4** — Guardar consultas frecuentes con nombre y descripción
- **RF-03.5** — Realizar JOINs entre tablas relacionadas desde la interfaz

### RF-04: Tableros (Dashboards)
- **RF-04.1** — Crear tableros personalizados con nombre y descripción
- **RF-04.2** — Agregar múltiples gráficos a un tablero (layout tipo grid)
- **RF-04.3** — Configurar cada gráfico: fuente de datos, tipo de gráfico, ejes, filtros
- **RF-04.4** — Tableros predefinidos para inventario (stock actual, movimientos, comparativas)
- **RF-04.5** — Refrescar datos del tablero manualmente o por intervalo

### RF-05: Gráficos Comparativos
- **RF-05.1** — Tipos de gráficos: barras (agrupadas/apiladas), líneas, circular, área, dispersión
- **RF-05.2** — Comparar N productos en un mismo gráfico
- **RF-05.3** — Seleccionar dimensiones (ejes X/Y) y métricas (valores a graficar)
- **RF-05.4** — Filtros en tiempo real que actualizan el gráfico
- **RF-05.5** — Tooltips y leyendas interactivas
- **RF-05.6** — Zoom y drill-down en gráficos

### RF-06: Informes y Exportación
- **RF-06.1** — Generar informes tabulares con filtros aplicados
- **RF-06.2** — Exportar a: Excel (.xlsx), CSV, PDF, JSON
- **RF-06.3** — Incluir gráficos en exportación PDF
- **RF-06.4** — Vista previa de impresión del informe
- **RF-06.5** — Guardar configuración de informe para reutilización

### RF-07: Menú y Navegación
- **RF-07.1** — Menú lateral con categorías: Tableros, Tablas, Consultas, Informes
- **RF-07.2** — Sección de tablas destacadas/relevantes configurable
- **RF-07.3** — Búsqueda rápida global de tablas, columnas y consultas guardadas
- **RF-07.4** — Breadcrumbs para navegación contextual

---

## 7. Requisitos No Funcionales

| Código | Requisito | Métrica |
|--------|-----------|---------|
| RNF-01 | Tiempo de carga de un tablero | < 3 segundos |
| RNF-02 | Consulta de tabla con 10K registros | < 2 segundos |
| RNF-03 | Renderizado de gráfico | < 1 segundo |
| RNF-04 | Soporte de navegadores | Chrome, Edge, Firefox (últimas 2 versiones) |
| RNF-05 | Responsive | Funcional en pantallas ≥ 1024px |
| RNF-06 | Base de datos | Solo lectura, sin modificar datos de UnoEE |

---

## 8. Stack Tecnológico Propuesto

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| **Frontend** | Angular 17+ (Standalone + Signals) | Consistente con proyecto existente, componentes reactivos |
| **Gráficos** | Chart.js o Apache ECharts | Variedad de gráficos, interactividad, exportación |
| **Tablas** | AG Grid o similar | Filtrado avanzado, ordenamiento, paginación virtual |
| **Backend** | NestJS + TypeORM | Consistente con proyecto existente, API REST |
| **Base de datos** | SQL Server (UnoEE) — solo lectura | Fuente de datos existente |
| **Metadata** | MySQL o SQLite | Guardar dashboards, queries, alias, configuración |
| **Exportación** | ExcelJS, jsPDF, Papa Parse | Múltiples formatos de exportación |

---

## 9. Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────┐
│                  Frontend                    │
│  Angular 17+ / Signals / Chart.js / AG Grid │
└───────────────────┬─────────────────────────┘
                    │ HTTP REST
┌───────────────────▼─────────────────────────┐
│                  Backend                     │
│            NestJS + TypeORM                  │
│                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ Metadata │ │ Queries  │ │  Dashboards  │ │
│  │ Service  │ │ Service  │ │   Service    │ │
│  └────┬─────┘ └────┬─────┘ └──────┬───────┘ │
│       │             │              │          │
│  ┌────▼─────────────▼──────────────▼───────┐ │
│  │          Data Access Layer              │ │
│  └────┬──────────────────────────┬─────────┘ │
└───────┼──────────────────────────┼───────────┘
        │                          │
 ┌──────▼──────┐          ┌───────▼────────┐
 │  SQL Server │          │ MySQL/SQLite   │
 │   UnoEE     │          │  (Config/App)  │
 │ (Solo READ) │          │                │
 └─────────────┘          └────────────────┘
```

---

## 10. Modelo de Datos de la Aplicación

### Entidades principales (BD de configuración)

```
Dashboard
├── id (PK)
├── nombre
├── descripcion
├── layout (JSON)
├── createdAt
└── updatedAt

DashboardWidget
├── id (PK)
├── dashboardId (FK → Dashboard)
├── tipo (bar | line | pie | area | scatter | table)
├── titulo
├── config (JSON: query, ejes, filtros, colores)
├── posicion (JSON: x, y, w, h)
└── orden

TableAlias
├── id (PK)
├── tableName (original)
├── alias (nombre descriptivo)
├── grupo (categoría/módulo)
└── descripcion

ColumnAlias
├── id (PK)
├── tableName
├── columnName (original)
├── alias (nombre descriptivo)
└── descripcion

TableRelation
├── id (PK)
├── sourceTable
├── sourceColumn
├── targetTable
├── targetColumn
├── relationType (1:1 | 1:N | N:M)

SavedQuery (existente)
├── id (PK)
├── nombre
├── tableName
├── columnNames (JSON)
├── filtros (JSON)
├── description
└── createdAt
```

---

## 11. Fases de Desarrollo

### Fase 1 — Fundamentos (MVP)
- Descubrimiento de tablas y columnas (ya existente parcialmente)
- Asignación de alias a tablas y columnas
- Consultas con filtros básicos y paginación
- 1 tipo de gráfico (barras comparativas)
- Exportación a CSV y JSON
- Menú con tablas relevantes

### Fase 2 — Tableros y Gráficos
- CRUD de dashboards
- Múltiples tipos de gráficos
- Widgets configurables con drag & drop
- Filtros avanzados (rango, contiene, AND/OR)
- Exportación a Excel y PDF

### Fase 3 — Relaciones e Informes
- Detección automática de relaciones entre tablas
- Editor visual de relaciones
- JOINs desde la interfaz
- Generación de informes completos
- Exportación de informes con gráficos incluidos

### Fase 4 — Mejoras
- Autenticación de usuarios
- Dashboards compartidos
- Programación de informes automáticos
- Caché de consultas frecuentes
- Optimización de rendimiento

---

## 12. Métricas de Éxito

| Métrica | Objetivo |
|---------|----------|
| Tablas mapeadas con alias | 100% de tablas de inventario |
| Tiempo promedio para crear un gráfico | < 2 minutos |
| Formatos de exportación disponibles | ≥ 4 (CSV, Excel, PDF, JSON) |
| Tipos de gráficos disponibles | ≥ 5 |
| Filtros aplicables simultáneamente | Sin límite |

---

## 13. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Tablas sin relaciones documentadas | Alta | Alto | Detección por convención de nombres + mapeo manual |
| Consultas pesadas afectan rendimiento de UnoEE | Media | Alto | Conexión de solo lectura con timeouts, paginación obligatoria, posible réplica |
| Nombres de columnas indescifrables | Alta | Medio | Sistema de alias con interfaz de gestión |
| Volumen de datos excesivo para gráficos | Media | Medio | Agregaciones server-side, límites de registros por gráfico |

---

## 14. Dependencias

- Acceso de solo lectura a la base de datos UnoEE (SQL Server)
- Conexión VPN al servidor `10.10.1.48:1433`
- Backend NestJS existente como base
- Frontend Angular existente como base

---

## 15. Glosario

| Término | Definición |
|---------|-----------|
| **UnoEE** | Base de datos SQL Server del ERP que contiene los datos de inventario y operaciones |
| **Tablero / Dashboard** | Vista configurable con múltiples gráficos y widgets |
| **Widget** | Componente visual individual dentro de un tablero (gráfico, tabla, KPI) |
| **Alias** | Nombre descriptivo asignado a una tabla o columna para facilitar su comprensión |
| **Query guardada** | Consulta SQL configurada con tabla, columnas y filtros, almacenada para reutilización |
