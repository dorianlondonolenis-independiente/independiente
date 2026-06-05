$xml = '<Importar><NombreConexion>Pruebas</NombreConexion><IdCia>1</IdCia><Usuario>sa</Usuario><Clave>Sa123456</Clave><Datos><Linea>0000001035000020011101ATR0000000120260531800213511      0003000Traslado ventas ESPECIALIDADES OFTALMOLOGICAS SA periodo 202605                                                                                                                                                                                                               </Linea><Linea>000000203510002001101ATR0000000141204510                           101                                             +000000000000000.0000+000001377494876.0200+000000000000000.0000+000000000000000.0000+000000000000000.0000  00000000CR CO101 ventas ESPECIALIDADES OFTALMOLOGICAS SA                                                                                                                                                                                                               </Linea><Linea>000000303510002001101ATR0000000141204510                           101                                             +000000275498975.2000+000000000000000.0000+000000000000000.0000+000000000000000.0000+000000000000000.0000  00000000DB CO101 CO PRINCIPAL 101                                                                                                                                                                                                                                      </Linea></Datos></Importar>'

Write-Host "NombreConexion: Pruebas" -ForegroundColor Cyan

$xmlE = $xml -replace '&','&amp;' -replace '<','&lt;' -replace '>','&gt;'
$soap = "<?xml version='1.0' encoding='utf-8'?><soap:Envelope xmlns:soap='http://schemas.xmlsoap.org/soap/envelope/'><soap:Body><ImportarXML xmlns='http://tempuri.org/'><pvstrDatos>$xmlE</pvstrDatos><printTipoError>0</printTipoError></ImportarXML></soap:Body></soap:Envelope>"

$bytes = [System.Text.Encoding]::UTF8.GetBytes($soap)
$req = [System.Net.WebRequest]::Create("http://192.168.1.70/WSUNOEE/WSUNOEE.asmx")
$req.Method = "POST"
$req.ContentType = "text/xml; charset=utf-8"
$req.Headers.Add("SOAPAction", '"http://tempuri.org/ImportarXML"')
$req.ContentLength = $bytes.Length
$req.Timeout = 30000

$s = $req.GetRequestStream()
$s.Write($bytes, 0, $bytes.Length)
$s.Close()

try {
    $resp = $req.GetResponse()
    $r = [System.IO.StreamReader]::new($resp.GetResponseStream()).ReadToEnd()
    $resp.Close()
    Write-Host "HTTP OK" -ForegroundColor Green
    Write-Host $r.Substring(0, [Math]::Min(4000, $r.Length))
} catch [System.Net.WebException] {
    $errResp = $_.Exception.Response
    if ($errResp) {
        $er = [System.IO.StreamReader]::new($errResp.GetResponseStream()).ReadToEnd()
        Write-Host "SOAP FAULT:" -ForegroundColor Red
        Write-Host $er.Substring(0, [Math]::Min(3000, $er.Length))
    } else {
        Write-Host "ERROR sin respuesta: $($_.Exception.Message)" -ForegroundColor Red
    }
}
