Set-Location "C:\Users\doria\OneDrive\Escritorio\INDEPENDIENTE"

# 1. Login
$loginBody = '{"username":"admin@local","password":"r3@W&G7NY36DYA6QA563Xt"}'
$loginRes = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginRes.token
Write-Host "=== TOKEN OK ===" -ForegroundColor Green

# 2. Preview traslados con Excel
Write-Host "`n=== STEP 2: Preview traslados (periodo 202605) ===" -ForegroundColor Cyan
$excelPath = "C:\Users\doria\Downloads\PLANILLA TRASLADOS DE VENTAS - PRUEBA.xlsx"
$previewResult = curl.exe --silent --request POST `
    "http://localhost:3000/api/siesa-xml/traslados/preview?periodo=202605" `
    --header "Authorization: Bearer $token" `
    --form "file=@$excelPath"
Write-Host $previewResult

# 3. Generar XML (sin enviar)
Write-Host "`n=== STEP 3: Generar XML ===" -ForegroundColor Cyan
$xmlResult = curl.exe --silent --request POST `
    "http://localhost:3000/api/siesa-xml/traslados/generar?periodo=202605&cuenta=41204510&tipoDocto=ATR&fecha=20260531&idCia=1&conexion=SQL-NEO&usuario=sa&clave=Sa123456" `
    --header "Authorization: Bearer $token" `
    --form "file=@$excelPath"
Write-Host $xmlResult

# 4. Probar si el servidor SIESA responde (GET simple)
Write-Host "`n=== STEP 4: SIESA server ping ===" -ForegroundColor Cyan
try {
    $siesaRes = Invoke-WebRequest -Uri "http://192.168.1.70/WSUNOEE/WFPruebaImportar.aspx" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "SIESA responde: HTTP $($siesaRes.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "SIESA no responde: $_" -ForegroundColor Red
}
