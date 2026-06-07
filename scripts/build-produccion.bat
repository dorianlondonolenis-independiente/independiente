@echo off
echo ============================================
echo   BUILD PRODUCCION - INDEPENDIENTE APP
echo ============================================
echo.

REM -- 1. Backend --
echo [1/3] Compilando Backend (NestJS)...
cd /d "%~dp0..\backend-app"
call npm run build
if errorlevel 1 ( echo ERROR en backend. Abortando. & pause & exit /b 1 )
echo    Backend OK -> dist/

REM -- 2. Frontend --
echo [2/3] Compilando Frontend (Angular)...
cd /d "%~dp0..\frontend-app"
call npm run build
if errorlevel 1 ( echo ERROR en frontend. Abortando. & pause & exit /b 1 )
echo    Frontend OK -> dist/

REM -- 3. Copiar a dist-produccion --
echo [3/3] Copiando artefactos a dist-produccion\...
cd /d "%~dp0.."
if exist dist-produccion rmdir /s /q dist-produccion
mkdir dist-produccion
mkdir dist-produccion\backend
mkdir dist-produccion\frontend

xcopy /E /I /Q backend-app\dist dist-produccion\backend\dist
xcopy /E /I /Q backend-app\node_modules dist-produccion\backend\node_modules
copy backend-app\package.json dist-produccion\backend\

xcopy /E /I /Q frontend-app\dist dist-produccion\frontend

echo.
echo ============================================
echo   BUILD COMPLETO
echo   Backend  -> dist-produccion\backend\
echo   Frontend -> dist-produccion\frontend\
echo ============================================
pause
