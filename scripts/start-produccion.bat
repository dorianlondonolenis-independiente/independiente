@echo off
echo ============================================
echo   INICIO PRODUCCION - INDEPENDIENTE APP
echo ============================================
echo.

REM Verificar que exista el build
if not exist "%~dp0..\dist-produccion\backend\dist\main.js" (
    echo ERROR: No existe build de produccion.
    echo Ejecuta primero: scripts\build-produccion.bat
    pause & exit /b 1
)

echo Iniciando Backend desde dist-produccion...
start "Backend PROD :3000" cmd /k "cd /d %~dp0..\dist-produccion\backend && node dist\main.js"

echo Iniciando Ollama (si no esta corriendo)...
tasklist /fi "imagename eq ollama.exe" 2>nul | find /i "ollama.exe" >nul
if errorlevel 1 (
    start "" "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" serve
    echo    Ollama iniciado.
) else (
    echo    Ollama ya estaba corriendo.
)

echo.
echo Servicios de produccion iniciados:
echo   Backend  -> http://localhost:3000
echo   Ollama   -> http://localhost:11434
echo.
echo NOTA: El frontend en produccion se sirve desde el backend
echo       como archivos estaticos en dist-produccion\frontend\
pause
