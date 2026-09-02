@echo off
chcp 65001 > nul
title TaskFlow - Sistema de Lista de Tarefas
echo ========================================================
echo          🚀 Iniciando TaskFlow (Lista de Tarefas)
echo ========================================================
echo.

set PYTHON_CMD=

:: Testa py launcher
py --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set PYTHON_CMD=py
    goto FOUND
)

:: Testa python no PATH
python --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set PYTHON_CMD=python
    goto FOUND
)

:: Testa caminho comum do Python 3.12 no AppData
if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    set PYTHON_CMD="%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    goto FOUND
)

:: Se nao achou
echo [ERRO] Python nao foi detectado automaticamente.
echo Por favor, certifique-se de que o Python 3 esta instalado.
pause
exit /b 1

:FOUND
echo Python detectado: %PYTHON_CMD%
echo.
echo [1/2] Verificando dependencias...
%PYTHON_CMD% -m pip install -q -r back\requirements.txt

echo [2/2] Abrindo navegador e iniciando servidor...
start http://127.0.0.1:5000

echo.
echo ========================================================
echo Servidor rodando em http://127.0.0.1:5000
echo Pressione Ctrl + C nesta janela para encerrar o servidor.
echo ========================================================
echo.

cd back
%PYTHON_CMD% app.py

pause
