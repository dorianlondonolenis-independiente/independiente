# 📝 Ejemplos para Windows PowerShell - Consultas Rápidas API
# 
# Instrucciones:
# 1. Abre PowerShell
# 2. Navega a c:\Users\doria\OneDrive\Escritorio\INDEPENDIENTE
# 3. Copia y pega los comandos de abajo

# Import JSON helper (para Windows)
Write-Host "🚀 EJEMPLOS - CONSULTAS RÁPIDAS API (Windows PowerShell)" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# ========================
# 1. GUARDAR CONSULTA
# ========================
Write-Host "1️⃣  GUARDAR UNA CONSULTA RÁPIDA" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

$bodyGuardar = @{
    nombre = "Conceptos principales"
    tableName = "t145_mc_conceptos"
    columnNames = @("id", "descripcion", "estado")
    description = "Los conceptos más importantes"
} | ConvertTo-Json

Write-Host "Enviando..."
$respuesta1 = Invoke-WebRequest -Uri "http://localhost:3000/api/queries" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body $bodyGuardar

Write-Host "Respuesta:" -ForegroundColor Green
$respuesta1.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10

$jsonRespuesta = $respuesta1.Content | ConvertFrom-Json
$queryId = $jsonRespuesta.id

Write-Host "✅ Consulta guardada con ID: $queryId" -ForegroundColor Green
Write-Host ""
Write-Host ""

# ========================
# 2. LISTAR TODAS
# ========================
Write-Host "2️⃣  LISTAR TODAS LAS CONSULTAS GUARDADAS" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

Write-Host "Listando..."
$respuesta2 = Invoke-WebRequest -Uri "http://localhost:3000/api/queries" `
    -Method GET `
    -Headers @{"Content-Type"="application/json"}

Write-Host "Respuesta:" -ForegroundColor Green
$respuesta2.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
Write-Host ""
Write-Host ""

# ========================
# 3. OBTENER DETALLES
# ========================
Write-Host "3️⃣  OBTENER DETALLES DE UNA CONSULTA" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

Write-Host "Obteniendo detalles de ID $queryId..."
$respuesta3 = Invoke-WebRequest -Uri "http://localhost:3000/api/queries/$queryId" `
    -Method GET `
    -Headers @{"Content-Type"="application/json"}

Write-Host "Respuesta:" -ForegroundColor Green
$respuesta3.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
Write-Host ""
Write-Host ""

# ========================
# 4. EJECUTAR CONSULTA ⭐
# ========================
Write-Host "4️⃣  EJECUTAR CONSULTA (OBTENER DATOS) ⭐ IMPORTANTE" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

Write-Host "Ejecutando con paginación (limit=10, offset=0)..."
$respuesta4 = Invoke-WebRequest -Uri "http://localhost:3000/api/queries/$queryId/execute?limit=10&offset=0" `
    -Method GET `
    -Headers @{"Content-Type"="application/json"}

Write-Host "Respuesta:" -ForegroundColor Green
$jsonData = $respuesta4.Content | ConvertFrom-Json

Write-Host "Cantidad de registros: " -NoNewline
Write-Host $jsonData.count -ForegroundColor Cyan

Write-Host "Primeros registros:" -ForegroundColor Green
$jsonData.data | ConvertTo-Json -Depth 10

Write-Host "Parámetros de paginación:"
Write-Host "  - limit: $($jsonData.limit)"
Write-Host "  - offset: $($jsonData.offset)"
Write-Host ""
Write-Host ""

# ========================
# 5. ACTUALIZAR
# ========================
Write-Host "5️⃣  ACTUALIZAR UNA CONSULTA" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

$bodyActualizar = @{
    columnNames = @("id", "descripcion", "estado", "tipo")
    description = "Actualizado: Agregada columna tipo"
} | ConvertTo-Json

Write-Host "Actualizando consulta $queryId..."
$respuesta5 = Invoke-WebRequest -Uri "http://localhost:3000/api/queries/$queryId" `
    -Method PUT `
    -Headers @{"Content-Type"="application/json"} `
    -Body $bodyActualizar

Write-Host "Respuesta:" -ForegroundColor Green
$respuesta5.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
Write-Host "✅ Consulta actualizada" -ForegroundColor Green
Write-Host ""
Write-Host ""

# ========================
# 6. EJECUTAR VERSIÓN NUEVA
# ========================
Write-Host "6️⃣  EJECUTAR CONSULTA ACTUALIZADA (CON NUEVAS COLUMNAS)" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

Write-Host "Ejecutando con nuevas columnas..."
$respuesta6 = Invoke-WebRequest -Uri "http://localhost:3000/api/queries/$queryId/execute?limit=5&offset=0" `
    -Method GET `
    -Headers @{"Content-Type"="application/json"}

Write-Host "Respuesta:" -ForegroundColor Green
$respuesta6.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
Write-Host ""
Write-Host ""

# ========================
# 7. EJEMPLOS DE PAGINACIÓN
# ========================
Write-Host "7️⃣  EJEMPLOS DE PAGINACIÓN" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

Write-Host "Primera página (5 registros):" -ForegroundColor Cyan
$pag1 = Invoke-WebRequest -Uri "http://localhost:3000/api/queries/$queryId/execute?limit=5&offset=0" `
    -Method GET `
    -Headers @{"Content-Type"="application/json"}
$pag1.Content | ConvertFrom-Json | Select-Object count, limit, offset

Write-Host ""
Write-Host "Segunda página (offset=5):" -ForegroundColor Cyan
$pag2 = Invoke-WebRequest -Uri "http://localhost:3000/api/queries/$queryId/execute?limit=5&offset=5" `
    -Method GET `
    -Headers @{"Content-Type"="application/json"}
$pag2.Content | ConvertFrom-Json | Select-Object count, limit, offset

Write-Host ""
Write-Host ""

# ========================
# 8. ELIMINAR (Opcional)
# ========================
Write-Host "8️⃣  ELIMINAR UNA CONSULTA (OPCIONAL)" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Para eliminar la consulta $queryId, ejecuta:" -ForegroundColor Yellow
Write-Host ""
Write-Host 'Invoke-WebRequest -Uri "http://localhost:3000/api/queries/'$queryId'" -Method DELETE' -ForegroundColor Magenta
Write-Host ""

# ========================
# RESUMEN
# ========================
Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "✅ EJEMPLOS COMPLETADOS" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📌 Información importante:" -ForegroundColor Yellow
Write-Host "  • Query ID usado: $queryId" -ForegroundColor White
Write-Host "  • Todos los endpoints retornan JSON" -ForegroundColor White
Write-Host "  • Para más detalles ver: docs/QUERIES.md" -ForegroundColor White
Write-Host "  • Prueba interactivo: http://localhost:3000/swagger" -ForegroundColor White
Write-Host ""
Write-Host "🔑 Endpoints clave:" -ForegroundColor Yellow
Write-Host "  POST   /api/queries              - Guardar nueva consulta" -ForegroundColor White
Write-Host "  GET    /api/queries              - Listar todas" -ForegroundColor White
Write-Host "  GET    /api/queries/:id          - Obtener detalles" -ForegroundColor White
Write-Host "  GET    /api/queries/:id/execute  - EJECUTAR (retorna datos)" -ForegroundColor White
Write-Host "  PUT    /api/queries/:id          - Actualizar" -ForegroundColor White
Write-Host "  DELETE /api/queries/:id          - Eliminar" -ForegroundColor White
Write-Host ""
