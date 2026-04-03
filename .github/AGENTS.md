# Agentes Personalizados del Proyecto

## Agentes Disponibles

### 1. Backend Developer
**Descripción**: Agente especializado en desarrollo backend NestJS. Diseña APIs, genera CRUD dinámico, expone metadata de tablas y gestiona diccionario de tablas.

**Especialidades**:
- 🗄️ APIs de Metadata (listar tablas, columnas, esquemas)
- 🔄 CRUD Dinámico (operaciones genéricas basadas en estructura)
- 📚 Diccionario de Tablas (mapeo de nombres legibles)
- ✅ DTOs y Validaciones automáticas
- 🔗 Dual Database (MySQL + SQL Server)

**Cuándo usar**:
- Necesitas crear una API para exponer estructura de BD
- Generar CRUD para una tabla
- Crear sistema de diccionario (nombres legibles)
- Cambiar de BD (MySQL ↔ SQL Server)

**Ejemplo de uso**:
```
Crea un CRUD para la tabla "productos" con campos: nombre, precio, stock.
Validaciones: nombre es requerido, precio > 0
```

**Respuesta**:
- Endpoint CRUD completo
- DTOs con validaciones
- Servicio con paginación y filtrado
- Tests unitarios
- Documentación de endpoints

**Flujo**: ASK (requisitos) → PLAN (diseño) → CODE (implementación)

---

### 2. create-feature
**Descripción:** Crea un nuevo módulo o feature en el backend (NestJS) o frontend (Angular) siguiendo los estándares del proyecto.

**Cuándo usar:**
- Agregar un nuevo dominio/módulo al backend
- Crear un nuevo componente/feature en el frontend
- Necesitas boilerplate consistente con el proyecto

**Lo que incluye:**
- Estructura de carpetas
- Entidad (backend) o Componente (frontend)
- DTO y Validaciones (backend)
- Servicio con métodos CRUD
- Controlador con rutas (backend) o Component logic (frontend)
- Ejemplos de código siguiendo patrones
- Checklist de implementación

**Ejemplo de uso:**
```
/create-feature
Crea un módulo "productos" en el backend
```

**Salida esperada:**
- Archivos listos para implementar
- Estructura siguiendo patrones del proyecto
- Boilerplate validado
- Instrucciones paso a paso

---

## Instrucciones Globales

Consulta `copilot-instructions.md` para:
- Estándares de código
- Patrones de arquitectura
- Convenciones de naming
- Flujo de desarrollo
- Comandos y herramientas

---

**Disponible desde**: Chatbot de Copilot en VS Code
**Localización**: `.github/skills/create-feature/`
