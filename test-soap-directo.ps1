Set-Location "C:\Users\doria\OneDrive\Escritorio\INDEPENDIENTE"

# XML sin Version tag (construido directamente para probar)
$xml = @"
<Importar>
  <NombreConexion>SQL-NEO</NombreConexion>
  <IdCia>1</IdCia>
  <Usuario>sa</Usuario>
  <Clave>Sa123456</Clave>
  <Datos>
    <Linea>0000001035000020011101ATR0000000120260531800213511      0003000Traslado ventas ESPECIALIDADES OFTALMOLOGICAS SA periodo 202605                                                                                                                                                                                                               </Linea>
    <Linea>000000203510002001101ATR0000000141204510                           101                                             +000000000000000.0000+000001377494876.0200+000000000000000.0000+000000000000000.0000+000000000000000.0000  00000000CR CO101 ventas ESPECIALIDADES OFTALMOLOGICAS SA                                                                                                                                                                                                               </Linea>
    <Linea>000000303510002001101ATR0000000141204510                           101                                             +000000275498975.2000+000000000000000.0000+000000000000000.0000+000000000000000.0000+000000000000000.0000  00000000DB CO101 CO PRINCIPAL 101                                                                                                                                                                                                                                      </Linea>
  </Datos>
</Importar>
"@

Write-Host "=== XML (primeros 200 chars) ===" -ForegroundColor Cyan
Write-Host $xml.Substring(0, 200)

# Escape XML para embeber en SOAP
$xmlEscaped = $xml -replace '&','&amp;' -replace '<','&lt;' -replace '>','&gt;'

$soapEnvelope = "<?xml version='1.0' encoding='utf-8'?>" +
    "<soap:Envelope xmlns:soap='http://schemas.xmlsoap.org/soap/envelope/'>" +
        "<soap:Body>" +
            "<ImportarXML xmlns='http://tempuri.org/'>" +
                "<pvstrDatos>$xmlEscaped</pvstrDatos>" +
                "<printTipoError>0</printTipoError>" +
            "</ImportarXML>" +
        "</soap:Body>" +
    "</soap:Envelope>"

Write-Host "`n=== ENVIANDO SOAP al ASMX ===" -ForegroundColor Yellow
Write-Host "URL: http://192.168.1.70/WSUNOEE/WSUNOEE.asmx"
Write-Host "Tamaño SOAP: $($soapEnvelope.Length) chars"

try {
    $bytes  = [System.Text.Encoding]::UTF8.GetBytes($soapEnvelope)
    $req = [System.Net.WebRequest]::Create("http://192.168.1.70/WSUNOEE/WSUNOEE.asmx")
    $req.Method = "POST"
    $req.ContentType = "text/xml; charset=utf-8"
    $req.Headers.Add("SOAPAction", '"http://tempuri.org/ImportarXML"')
    $req.ContentLength = $bytes.Length
    $req.Timeout = 30000
    $stream = $req.GetRequestStream()
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Close()

    $resp = $req.GetResponse()
    $reader = [System.IO.StreamReader]::new($resp.GetResponseStream())
    $respText = $reader.ReadToEnd()
    $reader.Close()
    $resp.Close()

    Write-Host "HTTP OK" -ForegroundColor Green
    Write-Host $respText.Substring(0, [Math]::Min(3000, $respText.Length))
} catch [System.Net.WebException] {
    Write-Host "HTTP ERROR: $($_.Exception.Message)" -ForegroundColor Red
    $errResp = $_.Exception.Response
    if ($errResp) {
        $reader = [System.IO.StreamReader]::new($errResp.GetResponseStream())
        $errText = $reader.ReadToEnd()
        $reader.Close()
        Write-Host "Cuerpo del error:" -ForegroundColor Red
        Write-Host $errText.Substring(0, [Math]::Min(4000, $errText.Length))
    }
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
}
