# Dockerfile para o Trilha TEC — Acessibilidade
FROM python:3.11-slim

# Metadados Básicos
LABEL maintainer="Trilha TEC CESAR SCHOOL"
LABEL description="Backend Acessível Educacional para Alunos com Deficiência Visual"

# Configurações do Ambiente para evitar bugs do Python no shell de Log
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=src/app.py
ENV FLASK_ENV=production

# Pasta Principal de Trabalho no Container
WORKDIR /app

# Instala dependências nativas do Linux exigidas pelo PyAudio, TTS e lib de Áudio
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    portaudio19-dev \
    python3-pyaudio \
    alsa-utils \
    && rm -rf /var/lib/apt/lists/*

# Copia os requisitos locais primeiro para cache inteligente
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Adiciona Flask explicitamente e Gunicorn (Para produção)
RUN pip install flask werkzeug gunicorn pyttsx3 edge-tts requests python-dotenv

# Copia o Código Fonte
COPY . .

# Expõe a porta de trafego local do Laboratório
EXPOSE 5000

# Roda no Gunicorn com múltiplas threads para suportar dezenas de tablets simultâneos, se necessário
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--threads", "4", "--timeout", "120", "src.app:app"]
