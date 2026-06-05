# Test flujo completo: /traslados/enviar (importa + aprueba automaticamente)
$loginBody = '{"username":"admin@local","password":"r3@W&G7NY36DYA6QA563Xt"}'
$loginRes = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginRes.token
Write-Host "Token OK" -ForegroundColor Green

Write-Host "`n=== Llamando /traslados/enviar (importa + aprueba) ===" -ForegroundColor Cyan

$rawResult = curl.exe --silent --show-error --request POST `
    "http://localhost:3000/api/siesa-xml/traslados/enviar?periodo=202605&cuenta=41204510&tipoDocto=FAF&fecha=20260531&idCia=1&conexion=Pruebas&usuario=unoee&clave=unoee26&url=http://192.168.1.70/WSUNOEE/WFPruebaImportar.aspx" `
    --header "Authorization: Bearer $token" `
    --form "file=@C:\Users\doria\Downloads\PLANILLA TRASLADOS DE VENTAS - PRUEBA.xlsx"

Write-Host "Respuesta cruda (primeros 500 chars):"
Write-Host $rawResult.Substring(0, [Math]::Min(500, $rawResult.Length))

try {
    $json = $rawResult | ConvertFrom-Json

    Write-Host "`nok: $($json.ok)"
    Write-Host "status: $($json.status)"
    Write-Host "totalTraslados: $($json.totalTraslados)"

    if ($json.aprobaciones -and $json.aprobaciones.Count -gt 0) {
        Write-Host "`nAprobaciones:" -ForegroundColor Yellow
        foreach ($a in $json.aprobaciones) {
            $color = if ($a.error -eq 0) { 'Green' } else { 'Red' }
            Write-Host "  rowid=$($a.rowid) consec=$($a.consec) error=$($a.error) | $($a.descripcion)" -ForegroundColor $color
        }
    } else {
        Write-Host "`naprobaciones: []" -ForegroundColor Yellow
    }

    if ($json.respuesta -match 'printTipoError>(\d+)<') {
        $errCode = $Matches[1]
        $color = if ($errCode -eq '0') { 'Green' } else { 'Red' }
        Write-Host "`nprintTipoError=$errCode" -ForegroundColor $color
    }
} catch {
    Write-Host "No se pudo parsear JSON: $_" -ForegroundColor Red
}
