#!/bin/bash
# 📝 Ejemplos Prácticos de Consultas Rápidas API
# 
# Instrucciones:
# 1. Guarda este archivo como: queries-examples.sh
# 2. Hazlo ejecutable: chmod +x queries-examples.sh (en Linux/Mac)
# 3. Ejecuta: ./queries-examples.sh
#
# En Windows PowerShell, copia y pega cada comando directamente

echo "================================================"
echo "🚀 EJEMPLOS DE USO - CONSULTAS RÁPIDAS API"
echo "================================================"
echo ""

# ========================
# 1. GUARDAR CONSULTA
# ========================
echo "1️⃣  GUARDAR UNA CONSULTA RÁPIDA"
echo "================================================"
echo ""
echo "Comando:"
echo 'curl -X POST http://localhost:3000/api/queries \
  -H "Content-Type: application/json" \
  -d "{
    \"nombre\": \"Conceptos principales\",
    \"tableName\": \"t145_mc_conceptos\",
    \"columnNames\": [\"id\", \"descripcion\"],
    \"description\": \"Los conceptos más importantes\"
  }"'
echo ""
echo "Guardando..."
QUERY_RESPONSE=$(curl -s -X POST http://localhost:3000/api/queries \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Conceptos principales",
    "tableName": "t145_mc_conceptos",
    "columnNames": ["id", "descripcion"],
    "description": "Los conceptos más importantes"
  }')

echo "Respuesta:"
echo "$QUERY_RESPONSE" | jq '.' 2>/dev/null || echo "$QUERY_RESPONSE"
QUERY_ID=$(echo "$QUERY_RESPONSE" | jq '.id' 2>/dev/null || echo "1")
echo ""
echo "✅ Consulta guardada con ID: $QUERY_ID"
echo ""
echo ""

# ========================
# 2. LISTAR TODAS
# ========================
echo "2️⃣  LISTAR TODAS LAS CONSULTAS GUARDADAS"
echo "================================================"
echo ""
echo "Comando:"
echo 'curl -X GET http://localhost:3000/api/queries'
echo ""
echo "Listando..."
curl -s -X GET http://localhost:3000/api/queries | jq '.' 2>/dev/null || curl -s -X GET http://localhost:3000/api/queries
echo ""
echo ""

# ========================
# 3. OBTENER DETALLES
# ========================
echo "3️⃣  OBTENER DETALLES DE UNA CONSULTA"
echo "================================================"
echo ""
echo "Comando:"
echo "curl -X GET http://localhost:3000/api/queries/$QUERY_ID"
echo ""
echo "Obteniendo detalles..."
curl -s -X GET http://localhost:3000/api/queries/$QUERY_ID | jq '.' 2>/dev/null || curl -s -X GET http://localhost:3000/api/queries/$QUERY_ID
echo ""
echo ""

# ========================
# 4. EJECUTAR CONSULTA
# ========================
echo "4️⃣  EJECUTAR CONSULTA (OBTENER DATOS) ⭐"
echo "================================================"
echo ""
echo "Comando:"
echo "curl -X GET \"http://localhost:3000/api/queries/$QUERY_ID/execute?limit=10&offset=0\""
echo ""
echo "Ejecutando con paginación límite=10, offset=0..."
curl -s -X GET "http://localhost:3000/api/queries/$QUERY_ID/execute?limit=10&offset=0" | jq '.' 2>/dev/null || curl -s -X GET "http://localhost:3000/api/queries/$QUERY_ID/execute?limit=10&offset=0"
echo ""
echo ""

# ========================
# 5. ACTUALIZAR
# ========================
echo "5️⃣  ACTUALIZAR UNA CONSULTA"
echo "================================================"
echo ""
echo "Comando:"
echo "curl -X PUT http://localhost:3000/api/queries/$QUERY_ID \
  -d '{\"columnNames\": [\"id\", \"descripcion\", \"estado\"]}'"
echo ""
echo "Actualizando para agregar columna 'estado'..."
curl -s -X PUT http://localhost:3000/api/queries/$QUERY_ID \
  -H "Content-Type: application/json" \
  -d '{"columnNames": ["id", "descripcion", "estado"]}' | jq '.' 2>/dev/null || curl -s -X PUT http://localhost:3000/api/queries/$QUERY_ID \
  -H "Content-Type: application/json" \
  -d '{"columnNames": ["id", "descripcion", "estado"]}'
echo ""
echo ""

# ========================
# 6. EJECUTAR NUEVA VERSIÓN
# ========================
echo "6️⃣  EJECUTAR CONSULTA ACTUALIZADA"
echo "================================================"
echo ""
echo "Ahora con las nuevas columnas (id, descripcion, estado):"
echo ""
curl -s -X GET "http://localhost:3000/api/queries/$QUERY_ID/execute?limit=5&offset=0" | jq '.' 2>/dev/null || curl -s -X GET "http://localhost:3000/api/queries/$QUERY_ID/execute?limit=5&offset=0"
echo ""
echo ""

# ========================
# 7. PAGINACIÓN
# ========================
echo "7️⃣  EJEMPLOS DE PAGINACIÓN"
echo "================================================"
echo ""
echo "Primera página (5 registros):"
echo 'curl -X GET "http://localhost:3000/api/queries/'$QUERY_ID'/execute?limit=5&offset=0"'
curl -s -X GET "http://localhost:3000/api/queries/$QUERY_ID/execute?limit=5&offset=0" | jq '.count' 2>/dev/null || echo "..."
echo ""
echo "Segunda página (siguientes 5):"
echo 'curl -X GET "http://localhost:3000/api/queries/'$QUERY_ID'/execute?limit=5&offset=5"'
echo ""
echo ""

# ========================
# 8. ELIMINAR
# ========================
echo "8️⃣  ELIMINAR UNA CONSULTA"
echo "================================================"
echo ""
echo "Comando:"
echo "curl -X DELETE http://localhost:3000/api/queries/$QUERY_ID"
echo ""
echo "⚠️  Si confirmas eliminará la consulta ID $QUERY_ID"
echo ""

echo ""
echo "================================================"
echo "✅ EJEMPLOS COMPLETADOS"
echo "================================================"
echo ""
echo "📌 Notas importantes:"
echo "  • Todos los endpoints retornan JSON"
echo "  • Para más detalles ver: docs/QUERIES.md"
echo "  • Prueba en Swagger: http://localhost:3000/swagger"
echo ""
