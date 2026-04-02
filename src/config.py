"""
Configurações centrais do sistema de acessibilidade educacional.

Todas as constantes e parâmetros configuráveis ficam aqui
para facilitar manutenção e personalização pelo tutor.
"""

import os

import sys

# =============================================================
# Diretórios e Suporte a Executável (PyInstaller)
# =============================================================
if getattr(sys, 'frozen', False):
    # Rodando como executável compilado
    BASE_DIR = os.path.join(sys._MEIPASS, "src")
else:
    # Rodando como script normal
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

LESSONS_DIR = os.path.join(BASE_DIR, "lessons")
AUDIO_CACHE_DIR = os.path.join(BASE_DIR, "static", "audio")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
STATIC_DIR = os.path.join(BASE_DIR, "static")

# =============================================================
# Servidor Flask
# =============================================================
HOST = "127.0.0.1"
PORT = 5000
DEBUG = os.environ.get("FLASK_DEBUG", "false").lower() == "true"

# =============================================================
# TTS — Text-to-Speech
# =============================================================
# Voz preferida para pyttsx3 (SAPI5 no Windows)
# Se None, usa a primeira voz PT-BR encontrada
PYTTSX3_VOICE_ID = None

# Voz preferida para edge-tts (Microsoft Neural)
EDGE_TTS_VOICE = "pt-BR-FranciscaNeural"

# Taxa de fala padrão (palavras por minuto) para pyttsx3
PYTTSX3_RATE = 150

# Volume padrão (0.0 a 1.0) para pyttsx3
PYTTSX3_VOLUME = 1.0

# =============================================================
# Acessibilidade — Defaults
# =============================================================
# Tamanho base da fonte (rem)
DEFAULT_FONT_SIZE = 1.25

# Incremento ao ajustar fonte (+/-)
FONT_SIZE_STEP = 0.25

# Tamanho máximo da fonte (rem)
MAX_FONT_SIZE = 3.0

# Tamanho mínimo da fonte (rem)
MIN_FONT_SIZE = 1.0

# Velocidade TTS padrão no frontend (1.0 = normal)
DEFAULT_TTS_RATE = 1.0

# Incremento de velocidade TTS
TTS_RATE_STEP = 0.25

# Velocidade máxima TTS
MAX_TTS_RATE = 3.0

# Velocidade mínima TTS
MIN_TTS_RATE = 0.5
