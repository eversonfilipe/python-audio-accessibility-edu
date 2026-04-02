"""
Módulo de Assistente de IA — Interface segura com a API Gemini.

Responsabilidades:
    1. Manter a chave API segura (nunca exposta ao frontend)
    2. Enviar prompts contextualizados ao Gemini
    3. Retornar código Python simples e explicações acessíveis
    4. Sanitizar e validar todas as entradas/saídas

A chave API é carregada por variável de ambiente (GEMINI_API_KEY)
ou, como fallback para desenvolvimento local, do arquivo .env.
Em produção/executável, a chave é embarcada de forma segura.
"""

import json
import logging
import os
import re
from typing import Optional

import config

logger = logging.getLogger(__name__)

# =============================================================
# Constantes
# =============================================================

# URL da API do Ollama (Local)
OLLAMA_API_URL = os.environ.get("OLLAMA_API_URL", "http://localhost:11434/api/chat")

# Modelo padrão (Ollama local)
DEFAULT_MODEL = "tinyllama"

# Prompt de sistema hiper-simplificado (modelos de 1B param como TinyLlama se perdem em regras longas)
# Utilizamos Inglês para o comando-base da IA pois modelos pequenos funcionam melhor assim
SYSTEM_PROMPT = """You are a Python programming assistant for beginners.
Your goal is to write a simple Python script based on the user's instruction.
Use only basic concepts: print, input, variables, simple if/else, for loops.
CRITICAL RULES:
1. Output ONLY the Python code. Do not output any chat or explanation text.
2. The code must have comments in Portuguese explaining exactly what it does.
3. Keep the code under 15 lines."""


# =============================================================
# Classe Principal
# =============================================================

class AIAssistant:
    """
    Assistente de IA para geração de código Python via Ollama (Local).

    Uso:
        assistant = AIAssistant()
        if assistant.is_available():
            result = assistant.generate_code("Faça um programa que soma dois números")
            # result = {"success": True, "code": "...", "explanation": "..."}
    """

    def __init__(self):
        """Inicializa o assistente e carrega a chave API."""
        self._model = DEFAULT_MODEL
        logger.info("AIAssistant: Motor conectado via Ollama Local (%s)", self._model)

    def _load_api_key(self) -> Optional[str]:
        """
        Carrega a chave API do Gemini de forma segura.

        Ordem de prioridade:
            1. Variável de ambiente GEMINI_API_KEY
            2. Arquivo .env na raiz do projeto
            3. Arquivo config (fallback para dev local)
        """
        # 1. Variável de ambiente
        key = os.environ.get("GEMINI_API_KEY")
        if key and key.strip():
            return key.strip()

        # 2. Arquivo .env na raiz do projeto
        env_path = os.path.join(config.BASE_DIR, "..", ".env")
        if os.path.exists(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith("GEMINI_API_KEY="):
                            key = line.split("=", 1)[1].strip().strip("'\"")
                            if key:
                                return key
            except Exception as e:
                logger.warning("AIAssistant: Erro ao ler .env: %s", e)

        # 3. Atributo de config (fallback desenvolvimento)
        key = getattr(config, "GEMINI_API_KEY", None)
        if key and key.strip():
            return key.strip()

        return None

    def is_available(self) -> bool:
        """Verifica se o assistente está disponível. Como usamos Ollama, sempre tentará conectar."""
        return True

    def generate_code(self, instruction: str, context: str = "") -> dict:
        """
        Gera código Python baseado na instrução da estudante.

        Args:
            instruction: Instrução em linguagem natural descrevendo
                         o que o código deve fazer.
            context: Contexto adicional (pergunta original, tema da aula).

        Returns:
            Dict com:
                - success (bool)
                - code (str): Código Python gerado
                - explanation (str): Explicação simples do código
        """

        if not instruction or not instruction.strip():
            return {
                "success": False,
                "error": "Instrução vazia. Descreva o que o código deve fazer.",
            }

        # Sanitiza a instrução
        instruction = self._sanitize_input(instruction)
        if len(instruction) > 500:
            instruction = instruction[:500]

        # Monta o prompt
        user_prompt = self._build_prompt(instruction, context)

        # Chama a API
        try:
            response = self._call_ollama(user_prompt)
            if response is None:
                return {
                    "success": False,
                    "error": "Erro ao comunicar com a IA. Tente novamente.",
                }

            # Extrai e limpa o código
            code = self._extract_code(response)
            if not code:
                # Fallback: repassa a própria resposta se o extrator falhar
                code = response.strip()

            # Gera explicação acessível
            explanation = self._generate_explanation(code)

            return {
                "success": True,
                "code": code,
                "explanation": explanation,
            }

        except Exception as e:
            logger.error("AIAssistant: Erro ao gerar código: %s", e)
            return {
                "success": False,
                "error": "Erro interno ao gerar código. Tente novamente.",
            }

    def _build_prompt(self, instruction: str, context: str = "") -> str:
        """Monta o prompt para o TinyLlama gerar código pragmático."""
        prompt = f"Por favor, escreva um código em Python simples para a seguinte instrução.\n\nINSTRUÇÃO DA ESTUDANTE:\n{instruction}\n\n"
        if context:
            prompt += f"CONTEXTO DO EXERCÍCIO:\n{context}\n\n"
        prompt += "LEMBRE-SE: Retorne APENAS o código em Python puro, sem conversar comigo."
        return prompt

    def _call_ollama(self, user_prompt: str) -> Optional[str]:
        """
        Faz a chamada HTTP à API local do Ollama.

        Usa urllib para evitar dependência de requests.
        """
        import urllib.request
        import urllib.error

        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            "stream": False,
            "options": {
                "temperature": 0.1  # Muito baixo para evitar alucinações e eco no tinyllama
            }
        }

        data = json.dumps(payload).encode("utf-8")

        req = urllib.request.Request(
            OLLAMA_API_URL,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            # Tempo limite maior pois modelos locais podem demorar para iniciar a inferência
            with urllib.request.urlopen(req, timeout=120) as resp:
                result = json.loads(resp.read().decode("utf-8"))

            if "message" in result and "content" in result["message"]:
                return result["message"]["content"]
            
            logger.warning("AIAssistant: Resposta inesperada do Ollama: %s", result)
            return None

        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8", errors="replace")
            logger.error(
                "AIAssistant: Ollama HTTP %s — %s", e.code, error_body[:300]
            )
            return None
        except urllib.error.URLError as e:
            logger.error("AIAssistant: Erro de conexão com Ollama (está rodando?) — %s", e.reason)
            return None
        except Exception as e:
            logger.error("AIAssistant: Erro inesperado Ollama — %s", e)
            return None

    def _extract_code(self, response_text: str) -> str:
        """
        Extrai código Python limpo da resposta do Ollama.
        """
        if not response_text:
            return ""

        text = response_text.strip()

        # Limpeza de possíveis vazamentos de templates de modelos pequenos (ex: <|assistant|>)
        text = re.sub(r"<\|.*?\|>", "", text).strip()

        # Remove blocos de código markdown (```python ... ```)
        code_block_pattern = r"```(?:python)?\s*\n?(.*?)```"
        matches = re.findall(code_block_pattern, text, re.DOTALL)
        if matches:
            return matches[0].strip()
        
        # Fallback: Remove possíveis ``` no início/fim e devolve o texto
        text = re.sub(r"^```(?:python)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        
        return text.strip()

    def _generate_explanation(self, code: str) -> str:
        """
        Gera uma explicação simples do código para narração TTS.

        Não chama a IA novamente — analisa o código localmente.
        """
        lines = [l.strip() for l in code.split("\n") if l.strip()]
        total_lines = len(lines)
        comment_lines = len([l for l in lines if l.startswith("#")])
        code_lines = total_lines - comment_lines

        explanation = f"Código gerado com {code_lines} linhas de código"
        if comment_lines > 0:
            explanation += f" e {comment_lines} comentários explicativos"
        explanation += "."

        # Detecta conceitos usados
        concepts = []
        code_lower = code.lower()
        if "print(" in code_lower:
            concepts.append("comando print")
        if "input(" in code_lower:
            concepts.append("comando input")
        if "if " in code_lower:
            concepts.append("condição if")
        if "for " in code_lower:
            concepts.append("laço for")
        if "while " in code_lower:
            concepts.append("laço while")
        if "def " in code_lower:
            concepts.append("definição de função")

        if concepts:
            explanation += f" Usa: {', '.join(concepts)}."

        return explanation

    @staticmethod
    def _sanitize_input(text: str) -> str:
        """Remove caracteres potencialmente perigosos da entrada."""
        # Remove caracteres de controle
        text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
        # Normaliza espaços
        text = re.sub(r"\s+", " ", text).strip()
        return text
