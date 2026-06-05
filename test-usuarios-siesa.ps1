$linea1 = "0000001035000020011101ATR0000000120260531800213511      0003000Test                                                                                                                                                                                                                                                                       "
$linea2 = "000000203510002001101ATR0000000141204510                           101                                             +000000000000000.0000+000001377494876.0200+000000000000000.0000+000000000000000.0000+000000000000000.0000  00000000CR test                                                                                                                                                                                                                                                        "
$linea3 = "000000303510002001101ATR0000000141204510                           101                                             +000000275498975.2000+000000000000000.0000+000000000000000.0000+000000000000000.0000+000000000000000.0000  00000000DB test                                                                                                                                                                                                                                                        "

function Test-SiesaUser($user, $clave) {
    $xml = "<Importar><NombreConexion>Pruebas</NombreConexion><IdCia>1</IdCia><Usuario>$user</Usuario><Clave>$clave</Clave><Datos><Linea>$linea1</Linea><Linea>$linea2</Linea><Linea>$linea3</Linea></Datos></Importar>"
    $xmlE = $xml -replace '&','&amp;' -replace '<','&lt;' -replace '>','&gt;'
    $soap = "<?xml version='1.0' encoding='utf-8'?><soap:Envelope xmlns:soap='http://schemas.xmlsoap.org/soap/envelope/'><soap:Body><ImportarXML xmlns='http://tempuri.org/'><pvstrDatos>$xmlE</pvstrDatos><printTipoError>0</printTipoError></ImportarXML></soap:Body></soap:Envelope>"
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($soap)
    $req = [System.Net.WebRequest]::Create("http://192.168.1.70/WSUNOEE/WSUNOEE.asmx")
    $req.Method = "POST"; $req.ContentType = "text/xml; charset=utf-8"
    $req.Headers.Add("SOAPAction", '"http://tempuri.org/ImportarXML"')
    $req.ContentLength = $bytes.Length; $req.Timeout = 15000
    $s = $req.GetRequestStream(); $s.Write($bytes, 0, $bytes.Length); $s.Close()
    try {
        $resp = $req.GetResponse()
        $r = [System.IO.StreamReader]::new($resp.GetResponseStream()).ReadToEnd()
        $resp.Close()
        $errCode = if ($r -match 'printTipoError.(\d+)') { $Matches[1] } else { '?' }
        $hasRows = if ($r -match 'diffgr:id') { 'CON_DATOS' } else { 'vacio' }
        $color = if ($errCode -eq '0') { 'Green' } elseif ($errCode -eq '3') { 'Yellow' } else { 'Red' }
        Write-Host "Usuario=$user clave=$clave -> printTipoError=$errCode $hasRows" -ForegroundColor $color
    } catch [System.Net.WebException] {
        $er = ""
        if ($_.Exception.Response) { $er = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream()).ReadToEnd() }
        $fault = if ($er -match 'faultstring.(.*?).faultstring') { $Matches[1] } else { $_.Exception.Message }
        Write-Host "Usuario=$user -> FAULT: $fault" -ForegroundColor Red
    }
}

# Probar unoee con respuesta detallada
# Test con header/footer correctos y usuario unoee/unoee26
# Header: nroReg(7) + tipo(4=0000) + subtipo(2=00) + version(2=01) + cia(3=001) = 18 chars
$linea0 = "00000010000000100" + "1"   # INCORRECTO - reconstruir manualmente
# Formato correcto basado en ejemplo: 000000100000001001 (18 chars)
# nroReg=0000001, tipo=0000, subtipo=00, cia=1 → "0000001" + "0000" + "00" + "1" = mal
# Del ejemplo real: "000000100000001001" = 18 chars
# Desglose: 0000001(7) + 0000(4) + 00(2) + 1(3) -- pero 7+4+2+3=16, no 18
# Real: 0000001 0000 0001 001 → 7+4+4+3=18? No...
# Del archivo Importar.xml: <Linea>000000100000001001</Linea> = 18 chars
# 0000001 = nroReg(7), 0000 = tipo(4), 00 = subtipo(2), 1001 = ??? 
# Posiblemente: nroReg(7) + tipo_y_subtipo_y_cia sin separacion clara
# Segun HEADER_REG: F_NUMERO_REG(7) + F_TIPO_REG(4) + F_SUBTIPO_REG(2) + F_VERSION_REG(2) + F_CIA(3) = 18
# "000000100000001001" = 0000001 + 0000 + 00 + 01 + 001
#                         nroReg   tipo   sub  ver   cia
$linea0 = "0000001000000010001"   # 7+4+2+2+3 = 18... pero tiene 19
# Contar: "000000100000001001" = 18 chars
$header = "000000100000001001"   # del ejemplo real de SIESA
$footer_nro = "0000005"
$footer = $footer_nro + "999900010" + "01"  # ajustar

# Mas simple: copiar exactamente del ejemplo y solo cambiar nroReg en footer
# Header del ejemplo: 000000100000001001 (18 chars)
# Footer del ejemplo: 000001199990001001 (18 chars)
# Diferencia: nroReg y tipo (9999 en lugar de 0000)

$linea0 = "000000100000001001"
$linea1 = "0000002035000020010" + "01ATR0000000120260531800213511      0003000Traslado ventas ESPECIALIDADES OFTALMOLOGICAS SA periodo 202605                                                                                                                                                                                                               "
$linea2 = "0000003035100020010" + "01ATR0000000141204510                           101                                             +000000000000000.0000+000001377494876.0200+000000000000000.0000+000000000000000.0000+000000000000000.0000  00000000CR CO101 ventas                                                                                                                                                                                                                                       "
$linea3 = "0000004035100020010" + "01ATR0000000141204510                           101                                             +000000275498975.2000+000000000000000.0000+000000000000000.0000+000000000000000.0000+000000000000000.0000  00000000DB CO101 CO PRINCIPAL 101                                                                                                                                                                                                                      "
$linea4 = "000000599990001001"

$xml = "<Importar><NombreConexion>Pruebas</NombreConexion><IdCia>1</IdCia><Usuario>unoee</Usuario><Clave>unoee26</Clave><Datos><Linea>$linea0</Linea><Linea>$linea1</Linea><Linea>$linea2</Linea><Linea>$linea3</Linea><Linea>$linea4</Linea></Datos></Importar>"
$xmlE = $xml -replace '&','&amp;' -replace '<','&lt;' -replace '>','&gt;'
$soap = "<?xml version='1.0' encoding='utf-8'?><soap:Envelope xmlns:soap='http://schemas.xmlsoap.org/soap/envelope/'><soap:Body><ImportarXML xmlns='http://tempuri.org/'><pvstrDatos>$xmlE</pvstrDatos><printTipoError>0</printTipoError></ImportarXML></soap:Body></soap:Envelope>"
$bytes = [System.Text.Encoding]::UTF8.GetBytes($soap)
$req = [System.Net.WebRequest]::Create("http://192.168.1.70/WSUNOEE/WSUNOEE.asmx")
$req.Method = "POST"; $req.ContentType = "text/xml; charset=utf-8"
$req.Headers.Add("SOAPAction", '"http://tempuri.org/ImportarXML"')
$req.ContentLength = $bytes.Length; $req.Timeout = 30000
$s = $req.GetRequestStream(); $s.Write($bytes, 0, $bytes.Length); $s.Close()

$resp = $req.GetResponse()
$r = [System.IO.StreamReader]::new($resp.GetResponseStream()).ReadToEnd()
$resp.Close()

$errCode = if ($r -match 'printTipoError.(\d+)') { $Matches[1] } else { '?' }
Write-Host "printTipoError=$errCode" -ForegroundColor $(if ($errCode -eq '0') { 'Green' } else { 'Yellow' })

Write-Host "=== RESPUESTA CRUDA ===" -ForegroundColor Cyan
Write-Host $r
