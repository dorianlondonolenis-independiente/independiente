@echo off
setlocal

set "NODE_VERSION=22.12.0"

echo Verificando version de Node...

for /f "delims=" %%v in ('node -v') do set "CURRENT_VERSION=%%v"
set "CURRENT_VERSION=%CURRENT_VERSION:v=%"

if not "%CURRENT_VERSION%"=="%NODE_VERSION%" (
    echo Cambiando a Node %NODE_VERSION%...
    nvm use %NODE_VERSION%
)

node -v

echo Iniciando Angular...
call npx ng serve