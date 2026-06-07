@echo off
echo ============================================
echo   INSTALAR DEPENDENCIAS - INDEPENDIENTE APP
echo ============================================
echo.

echo [1/2] Instalando dependencias Backend...
cd /d "%~dp0..\backend-app"
call npm install
if errorlevel 1 ( echo ERROR en backend. & pause & exit /b 1 )

echo [2/2] Instalando dependencias Frontend...
cd /d "%~dp0..\frontend-app"
call npm install
if errorlevel 1 ( echo ERROR en frontend. & pause & exit /b 1 )

echo.
echo Dependencias instaladas correctamente.
pause
