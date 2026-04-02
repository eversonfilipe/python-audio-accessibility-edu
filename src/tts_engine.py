"""
Motor de Text-to-Speech (TTS) com estratégia de fallback.

Arquitetura de resiliência:
    1. pyttsx3 (offline, SAPI5 no Windows / espeak no Linux)
    2. edge-tts (online, vozes neurais Microsoft)

O módulo gerencia cache de áudios gerados para evitar
re-síntese de textos já processados.
"""

import asyncio
import hashlib
import logging
import os
import platform
from typing import Optional

import config

logger = logging.getLogger(__name__)


class TTSEngine:
    """
    Motor TTS unificado com fallback automático.

    Uso:
        engine = TTSEngine()
        caminho = engine.synthesize("Olá, mundo!")
        # retorna o caminho do arquivo .mp3 gerado
    """

    def __init__(self):
        self._cache_dir = config.AUDIO_CACHE_DIR
        os.makedirs(self._cache_dir, exist_ok=True)

        # Tenta inicializar pyttsx3
        self._pyttsx3_available = False
        self._pyttsx3_engine = None
        self._init_pyttsx3()

        # edge-tts é sempre "disponível" (depende de internet no momento do uso)
        self._edge_tts_available = True

        logger.info(
            "TTSEngine inicializado — pyttsx3: %s | edge-tts: %s",
            "disponível" if self._pyttsx3_available else "indisponível",
            "disponível (requer internet)",
        )

    # -----------------------------------------------------------------
    # Inicialização do pyttsx3
    # -----------------------------------------------------------------
    def _init_pyttsx3(self):
        """Tenta inicializar o motor pyttsx3 com voz PT-BR."""
        try:
            import pyttsx3

            self._pyttsx3_engine = pyttsx3.init()

            # Configura taxa e volume
            self._pyttsx3_engine.setProperty("rate", config.PYTTSX3_RATE)
            self._pyttsx3_engine.setProperty("volume", config.PYTTSX3_VOLUME)

            # Tenta encontrar voz PT-BR
            voice_set = False
            if config.PYTTSX3_VOICE_ID:
                # Voz explicitamente configurada
                self._pyttsx3_engine.setProperty("voice", config.PYTTSX3_VOICE_ID)
                voice_set = True
            else:
                # Busca automática por voz PT-BR
                voices = self._pyttsx3_engine.getProperty("voices")
                for voice in voices:
                    voice_id_lower = voice.id.lower()
                    voice_name_lower = voice.name.lower()
                    if any(
                        marker in voice_id_lower or marker in voice_name_lower
                        for marker in ["pt-br", "pt_br", "portuguese", "brazil"]
                    ):
                        self._pyttsx3_engine.setProperty("voice", voice.id)
                        voice_set = True
                        logger.info("pyttsx3: voz PT-BR encontrada — %s", voice.name)
                        break

            if not voice_set:
                logger.warning(
                    "pyttsx3: nenhuma voz PT-BR encontrada. "
                    "Usando voz padrão do sistema."
                )

            self._pyttsx3_available = True

        except Exception as exc:
            logger.warning("pyttsx3 não disponível: %s", exc)
            self._pyttsx3_available = False

    # -----------------------------------------------------------------
    # Interface Pública
    # -----------------------------------------------------------------
    def synthesize(self, text: str, force_engine: Optional[str] = None) -> Optional[str]:
        """
        Sintetiza texto em áudio e retorna o caminho do arquivo.

        Args:
            text: Texto a ser sintetizado.
            force_engine: Forçar engine específica ("pyttsx3" ou "edge-tts").

        Returns:
            Caminho absoluto do arquivo de áudio gerado, ou None em caso de falha.
        """
        if not text or not text.strip():
            logger.warning("Texto vazio recebido para síntese.")
            return None

        text = text.strip()

        # Verifica cache
        cache_path = self._get_cache_path(text)
        if os.path.exists(cache_path):
            logger.debug("Cache hit para texto: '%s...'", text[:50])
            return cache_path

        # Tenta sintetizar com fallback
        if force_engine == "pyttsx3":
            return self._synthesize_pyttsx3(text, cache_path)
        elif force_engine == "edge-tts":
            return self._synthesize_edge_tts(text, cache_path)

        # Fallback automático: pyttsx3 → edge-tts
        if self._pyttsx3_available:
            result = self._synthesize_pyttsx3(text, cache_path)
            if result:
                return result

        if self._edge_tts_available:
            result = self._synthesize_edge_tts(text, cache_path)
            if result:
                return result

        logger.error("Nenhuma engine TTS conseguiu sintetizar o texto.")
        return None

    def get_status(self) -> dict:
        """Retorna o status de disponibilidade das engines TTS."""
        return {
            "pyttsx3": {
                "available": self._pyttsx3_available,
                "type": "offline",
                "description": "SAPI5 (Windows) / espeak (Linux)",
            },
            "edge_tts": {
                "available": self._edge_tts_available,
                "type": "online",
                "description": "Microsoft Neural TTS (requer internet)",
                "voice": config.EDGE_TTS_VOICE,
            },
        }

    def get_voices(self) -> list:
        """Lista vozes PT-BR disponíveis no pyttsx3."""
        voices_list = []
        if self._pyttsx3_available and self._pyttsx3_engine:
            try:
                voices = self._pyttsx3_engine.getProperty("voices")
                for voice in voices:
                    voice_id_lower = voice.id.lower()
                    voice_name_lower = voice.name.lower()
                    is_ptbr = any(
                        marker in voice_id_lower or marker in voice_name_lower
                        for marker in ["pt-br", "pt_br", "portuguese", "brazil"]
                    )
                    voices_list.append(
                        {
                            "id": voice.id,
                            "name": voice.name,
                            "is_ptbr": is_ptbr,
                        }
                    )
            except Exception as exc:
                logger.warning("Erro ao listar vozes pyttsx3: %s", exc)

        return voices_list

    # -----------------------------------------------------------------
    # Engines Internas
    # -----------------------------------------------------------------
    def _synthesize_pyttsx3(self, text: str, output_path: str) -> Optional[str]:
        """Sintetiza com pyttsx3 (offline)."""
        try:
            self._pyttsx3_engine.save_to_file(text, output_path)
            self._pyttsx3_engine.runAndWait()

            if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                logger.info(
                    "pyttsx3: áudio gerado — %s (%d bytes)",
                    output_path,
                    os.path.getsize(output_path),
                )
                return output_path
            else:
                logger.warning("pyttsx3: arquivo gerado vazio ou inexistente.")
                return None

        except Exception as exc:
            logger.warning("pyttsx3 falhou: %s", exc)
            return None

    def _synthesize_edge_tts(self, text: str, output_path: str) -> Optional[str]:
        """Sintetiza com edge-tts (online, vozes neurais Microsoft)."""
        try:
            import edge_tts

            async def _generate():
                communicate = edge_tts.Communicate(
                    text, config.EDGE_TTS_VOICE
                )
                await communicate.save(output_path)

            # Executa a coroutine
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # Se já há um event loop rodando (ex: dentro de Flask com async)
                    import concurrent.futures
                    with concurrent.futures.ThreadPoolExecutor() as pool:
                        future = pool.submit(asyncio.run, _generate())
                        future.result(timeout=30)
                else:
                    loop.run_until_complete(_generate())
            except RuntimeError:
                asyncio.run(_generate())

            if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                logger.info(
                    "edge-tts: áudio gerado — %s (%d bytes)",
                    output_path,
                    os.path.getsize(output_path),
                )
                return output_path
            else:
                logger.warning("edge-tts: arquivo gerado vazio ou inexistente.")
                return None

        except Exception as exc:
            logger.warning("edge-tts falhou: %s", exc)
            return None

    # -----------------------------------------------------------------
    # Cache
    # -----------------------------------------------------------------
    def _get_cache_path(self, text: str) -> str:
        """
        Gera caminho de cache baseado no hash do texto.
        Evita re-síntese de textos já processados.
        """
        text_hash = hashlib.md5(text.encode("utf-8")).hexdigest()
        # pyttsx3 gera .wav no Windows; edge-tts gera .mp3
        # Usamos .mp3 como extensão padrão (edge-tts)
        # pyttsx3 pode gerar .wav que funciona igualmente no browser
        extension = ".mp3"
        return os.path.join(self._cache_dir, f"tts_{text_hash}{extension}")
