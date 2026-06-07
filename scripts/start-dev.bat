@echo off
echo ============================================
echo   INICIO DESARROLLO - INDEPENDIENTE APP
echo ============================================
echo.
echo Abriendo Backend en nueva ventana...
start "Backend NestJS :3000" cmd /k "cd /d %~dp0..\backend-app && node dist\main.js"

timeout /t 3 /nobreak >nul

echo Abriendo Frontend en nueva ventana...
start "Frontend Angular :4200" cmd /k "cd /d %~dp0..\frontend-app && npm start"

echo.
echo Servicios iniciados:
echo   Backend  -> http://localhost:3000
echo   Frontend -> http://localhost:4200
echo   Swagger  -> http://localhost:3000/swagger
echo   Ollama   -> http://localhost:11434
echo.
pause
