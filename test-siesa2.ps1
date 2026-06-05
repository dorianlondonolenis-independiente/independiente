Set-Location "C:\Users\doria\OneDrive\Escritorio\INDEPENDIENTE"

$loginBody = '{"username":"admin@local","password":"r3@W&G7NY36DYA6QA563Xt"}'
$loginRes = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginRes.token

$excelPath = "C:\Users\doria\Downloads\PLANILLA TRASLADOS DE VENTAS - PRUEBA.xlsx"

# Generar el XML primero para inspeccionarlo
$xmlRaw = curl.exe --silent --request POST `
    "http://localhost:3000/api/siesa-xml/traslados/generar?periodo=202605&cuenta=41204510&tipoDocto=ATR&fecha=20260531&idCia=1&conexion=SQL-NEO&usuario=sa&clave=Sa123456" `
    --header "Authorization: Bearer $token" `
    --form "file=@$excelPath"

Write-Host "=== XML GENERADO ===" -ForegroundColor Cyan
Write-Host $xmlRaw

# Prueba 1: POST como form-data con campo txtParametro (formato WFPruebaImportar.aspx)
Write-Host "`n=== PRUEBA 1: POST como form txtParametro ===" -ForegroundColor Yellow
try {
    $formBody = "txtParametro=$([System.Uri]::EscapeDataString($xmlRaw))"
    $r1 = Invoke-WebRequest -Uri "http://192.168.1.70/WSUNOEE/WFPruebaImportar.aspx" `
        -Method POST -Body $formBody -ContentType "application/x-www-form-urlencoded" -TimeoutSec 15 -ErrorAction Stop
    Write-Host "HTTP $($r1.StatusCode)" -ForegroundColor Green
    # Buscar el resultado en la respuesta HTML
    $html = $r1.Content
    if ($html -match 'lblRetorno.*?>(.*?)<') { Write-Host "Retorno: $($Matches[1])" }
    if ($html -match 'grdResultado') { Write-Host "Hay datos en la grilla de resultado" }
    Write-Host ($html.Substring(0, [Math]::Min(2000, $html.Length)))
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
}

# Prueba 2: POST raw XML al endpoint ASMX directamente
Write-Host "`n=== PRUEBA 2: POST raw XML a ASMX ===" -ForegroundColor Yellow
try {
    $soapBody = "<?xml version='1.0' encoding='utf-8'?><soap:Envelope xmlns:soap='http://schemas.xmlsoap.org/soap/envelope/'><soap:Body><ImportarXML xmlns='http://tempuri.org/'><pvstrDatos>$([System.Net.WebUtility]::HtmlEncode($xmlRaw))</pvstrDatos><printTipoError>0</printTipoError></ImportarXML></soap:Body></soap:Envelope>"
    $r2 = Invoke-WebRequest -Uri "http://192.168.1.70/WSUNOEE/WSUNOEE.asmx" `
        -Method POST -Body $soapBody -ContentType "text/xml; charset=utf-8" `
        -Headers @{ SOAPAction = '"http://tempuri.org/ImportarXML"' } -TimeoutSec 15 -ErrorAction Stop
    Write-Host "HTTP $($r2.StatusCode)" -ForegroundColor Green
    Write-Host $r2.Content.Substring(0, [Math]::Min(3000, $r2.Content.Length))
} catch {
    Write-Host "ERROR SOAP: $_" -ForegroundColor Red
}
