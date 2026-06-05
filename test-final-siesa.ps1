# Test final: genera XML desde el backend y lo envía directo al SIESA por SOAP
$loginBody = '{"username":"admin@local","password":"r3@W&G7NY36DYA6QA563Xt"}'
$loginRes = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginRes.token
Write-Host "Token OK" -ForegroundColor Green

# Generar XML desde el backend (descarga como archivo)
$outFile = "C:\Users\doria\Downloads\traslado_generado.xml"
curl.exe --silent --request POST `
    "http://localhost:3000/api/siesa-xml/traslados/generar?periodo=202605&cuenta=41204510&tipoDocto=FAF&fecha=20260531&idCia=1&conexion=Pruebas&usuario=unoee&clave=unoee26" `
    --header "Authorization: Bearer $token" `
    --form "file=@C:\Users\doria\Downloads\PLANILLA TRASLADOS DE VENTAS - PRUEBA.xlsx" `
    --output $outFile

$xml = Get-Content $outFile -Raw -Encoding UTF8
Write-Host "`nXML generado ($($xml.Length) chars):" -ForegroundColor Cyan
Write-Host $xml.Substring(0, [Math]::Min(600, $xml.Length))

if ($xml -match '<Version>') {
    Write-Host "ERROR: Version tag todavia presente!" -ForegroundColor Red
    return
}

# Contar lineas
$lineasCount = ([regex]::Matches($xml, '<Linea>')).Count
Write-Host "`nLineas en XML: $lineasCount" -ForegroundColor Cyan

# Enviar por SOAP al ASMX
Write-Host "`n=== ENVIANDO AL SIESA ===" -ForegroundColor Yellow
$xmlE = $xml -replace '&','&amp;' -replace '<','&lt;' -replace '>','&gt;'
$soap = "<?xml version='1.0' encoding='utf-8'?><soap:Envelope xmlns:soap='http://schemas.xmlsoap.org/soap/envelope/'><soap:Body><ImportarXML xmlns='http://tempuri.org/'><pvstrDatos>$xmlE</pvstrDatos><printTipoError>0</printTipoError></ImportarXML></soap:Body></soap:Envelope>"

$bytes = [System.Text.Encoding]::UTF8.GetBytes($soap)
$req = [System.Net.WebRequest]::Create("http://192.168.1.70/WSUNOEE/WSUNOEE.asmx")
$req.Method = "POST"; $req.ContentType = "text/xml; charset=utf-8"
$req.Headers.Add("SOAPAction", '"http://tempuri.org/ImportarXML"')
$req.ContentLength = $bytes.Length; $req.Timeout = 30000
$s = $req.GetRequestStream(); $s.Write($bytes, 0, $bytes.Length); $s.Close()

try {
    $resp = $req.GetResponse()
    $r = [System.IO.StreamReader]::new($resp.GetResponseStream()).ReadToEnd()
    $resp.Close()

    $errCode = if ($r -match 'printTipoError.(\d+)') { $Matches[1] } else { '?' }
    $color = if ($errCode -eq '0') { 'Green' } elseif ($errCode -eq '1') { 'Yellow' } else { 'Red' }
    Write-Host "printTipoError=$errCode" -ForegroundColor $color

    # Guardar respuesta completa para inspección
    $r | Out-File "C:\Users\doria\Downloads\siesa-response.xml" -Encoding UTF8
    Write-Host "Respuesta guardada en Downloads\siesa-response.xml"

    # Mostrar mensajes de error/advertencia
    $tablas = [regex]::Matches($r, 'diffgr:id="Table\d+"[^>]*>(.*?)</Table>', 'Singleline')
    if ($tablas.Count -gt 0) {
        Write-Host "`nMensajes SIESA:" -ForegroundColor Cyan
        foreach ($t in $tablas) {
            $fila = $t.Groups[1].Value
            $nro     = if ($fila -match '<f_nro_linea>(\d+)') { $Matches[1] } else { '-' }
            $tipo    = if ($fila -match '<f_tipo_reg>(.*?)</f') { $Matches[1] } else { '-' }
            $nivel   = if ($fila -match '<f_nivel>(.*?)</f_ni') { $Matches[1] } else { '-' }
            $valor   = if ($fila -match '<f_valor>(.*?)</f_va') { $Matches[1] } else { '-' }
            $detalle = if ($fila -match '<f_detalle>(.*?)</f_d') { $Matches[1] } else { '-' }
            $fc = if ($nivel -eq '00') { 'Green' } elseif ($nivel -eq '01') { 'Yellow' } else { 'Red' }
            Write-Host "  Linea=$nro tipo=$tipo nivel=$nivel valor=[$valor] | $detalle" -ForegroundColor $fc
        }
    } else {
        Write-Host "Sin mensajes de error en la grilla (posiblemente OK)" -ForegroundColor Green
    }
} catch [System.Net.WebException] {
    $er = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream()).ReadToEnd()
    Write-Host "SOAP FAULT: $er" -ForegroundColor Red
}
