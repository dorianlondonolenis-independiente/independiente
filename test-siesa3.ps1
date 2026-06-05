Set-Location "C:\Users\doria\OneDrive\Escritorio\INDEPENDIENTE"

$loginBody = '{"username":"admin@local","password":"r3@W&G7NY36DYA6QA563Xt"}'
$loginRes = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginRes.token
Write-Host "=== TOKEN OK ===" -ForegroundColor Green

$excelPath = "C:\Users\doria\Downloads\PLANILLA TRASLADOS DE VENTAS - PRUEBA.xlsx"
$siesaUrl = "http://192.168.1.70/WSUNOEE/WFPruebaImportar.aspx"

Write-Host "`n=== GENERANDO XML SIN VERSION TAG ===" -ForegroundColor Cyan
$xmlRaw = curl.exe --silent --request POST `
    "http://localhost:3000/api/siesa-xml/traslados/generar?periodo=202605&cuenta=41204510&tipoDocto=ATR&fecha=20260531&idCia=1&conexion=SQL-NEO&usuario=sa&clave=Sa123456" `
    --header "Authorization: Bearer $token" `
    --form "file=@$excelPath"
Write-Host $xmlRaw.Substring(0, [Math]::Min(500, $xmlRaw.Length))
if ($xmlRaw -match '<Version>') { Write-Host "ERROR: Sigue teniendo Version tag!" -ForegroundColor Red }
else { Write-Host "OK: Sin Version tag" -ForegroundColor Green }

Write-Host "`n=== PROBANDO SOAP DIRECTO A ASMX (sin Version) ===" -ForegroundColor Yellow
$xmlEscaped = $xmlRaw -replace '&','&amp;' -replace '<','&lt;' -replace '>','&gt;'
$soapBody = "<?xml version='1.0' encoding='utf-8'?><soap:Envelope xmlns:soap='http://schemas.xmlsoap.org/soap/envelope/'><soap:Body><ImportarXML xmlns='http://tempuri.org/'><pvstrDatos>$xmlEscaped</pvstrDatos><printTipoError>0</printTipoError></ImportarXML></soap:Body></soap:Envelope>"
try {
    $r = Invoke-WebRequest -Uri "http://192.168.1.70/WSUNOEE/WSUNOEE.asmx" `
        -Method POST -Body $soapBody -ContentType "text/xml; charset=utf-8" `
        -Headers @{ SOAPAction = '"http://tempuri.org/ImportarXML"' } -TimeoutSec 30 -ErrorAction Stop
    Write-Host "HTTP $($r.StatusCode)" -ForegroundColor Green
    Write-Host $r.Content.Substring(0, [Math]::Min(4000, $r.Content.Length))
} catch {
    Write-Host "SOAP ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        Write-Host $reader.ReadToEnd()
    }
}
