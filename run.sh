#!/usr/bin/env bash
# =============================================================
# Sistema de Acessibilidade Educacional Auditiva
# Programa Trilha TEC — Florescendo Talentos / CESAR SCHOOL
# =============================================================

set -e

echo "============================================================"
echo "  Sistema de Acessibilidade Educacional Auditiva"
echo "  Programa Trilha TEC — Florescendo Talentos / CESAR SCHOOL"
echo "============================================================"
echo ""

# Verifica se Python está instalado
if ! command -v python3 &> /dev/null; then
    echo "[ERRO] Python3 não encontrado. Instale Python 3.10+"
    exit 1
fi

# Verifica/instala dependências
echo "[1/3] Verificando dependências..."
if ! python3 -c "import flask" 2>/dev/null; then
    echo "[1/3] Instalando dependências..."
    pip3 install -r requirements.txt
fi
echo "[1/3] Dependências OK."

# Cria diretório de cache de áudio
mkdir -p src/static/audio

# Inicia o servidor
echo "[2/3] Iniciando servidor..."
echo ""
echo "============================================================"
echo "  O sistema está rodando!"
echo "  Abra o navegador em: http://127.0.0.1:5000"
echo ""
echo "  Pressione Ctrl+C para parar o servidor."
echo "============================================================"
echo ""

# Abre o navegador automaticamente (tenta diferentes comandos)
(sleep 2 && (xdg-open http://127.0.0.1:5000 2>/dev/null || open http://127.0.0.1:5000 2>/dev/null || true)) &

# Inicia a aplicação
python3 src/app.py
