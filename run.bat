@echo off
title Acessibilidade Educacional - Trilha TEC

echo ============================================================
echo   Sistema de Acessibilidade Educacional Auditiva
echo   Programa Trilha TEC - Florescendo Talentos / CESAR SCHOOL
echo ============================================================
echo.

REM Verifica dependencias basicas
pip show flask >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Instalando dependencias do sistema...
    pip install -r requirements.txt
)

if not exist "src\static\audio" mkdir "src\static\audio"

echo Iniciando servidor local...
start "" http://127.0.0.1:5000
python src\app.py
pause
