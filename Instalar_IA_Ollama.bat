@echo off
chcp 65001 >nul
title Injetor de Inteligencia Artificial (Offline) - Trilha TEC

echo ==========================================================
echo OLLAMA - MOTOR DE INTELIGENCIA E CODIGO
echo ==========================================================
echo.
echo Para que a aplicacao Trilha TEC funcione sem conectar o Docker
echo na infraestrutura restrita do lab. da escola, sigam este roteiro:
echo.
echo PASSO 1:
echo Entre no site oficial [https://ollama.com/download] num PC com internet,
echo e passe o pendrive do instalador do Ollama.exe para os laboratorios.
echo Instale o Ollama normalmente em cada maquina apertando "Next".
echo.
echo PASSO 2:
echo Com o Ollama rodando no PC da escola (icone do lado do relogio), 
echo aperte ENTER aqui abaixo para eu baixar o cerebro da IA (TinyLlama - 1.5GB).
echo (Esse passo so exige internet uma UNICA vez na vida, depois pode desplugar).
echo.
pause

echo Injetando modulo de raciocinio Neural (TinyLlama)...
ollama pull tinyllama

echo.
echo ==========================================================
echo PRONTO! O cerebro de Programacao Python foi injetado.
echo O sistema esta completamente OFFLINE. Voce ja pode clicar 
echo no TrilhaTEC_Acessibilidade.exe para testar o microfone!
echo ==========================================================
pause
