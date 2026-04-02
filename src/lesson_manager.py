"""
Gerenciador de aulas — carrega, valida e fornece acesso
a aulas definidas em arquivos JSON.

Cada aula é um arquivo .json no diretório src/lessons/ com
a estrutura documentada no GUIA_TUTOR.md.
"""

import json
import logging
import os
from typing import Optional

import config

logger = logging.getLogger(__name__)

# Schema mínimo esperado para validação
REQUIRED_LESSON_FIELDS = {"title", "slides"}
REQUIRED_SLIDE_FIELDS = {"id", "title", "content"}


class LessonManager:
    """
    Carrega e gerencia aulas a partir de arquivos JSON.

    Uso:
        manager = LessonManager()
        aulas = manager.list_lessons()
        aula = manager.get_lesson("aula_01_introducao_python")
    """

    def __init__(self):
        self._lessons_dir = config.LESSONS_DIR
        os.makedirs(self._lessons_dir, exist_ok=True)
        self._cache: dict = {}
        self._load_all()

    def _load_all(self):
        """Carrega e valida todas as aulas do diretório."""
        self._cache.clear()
        count = 0

        if not os.path.isdir(self._lessons_dir):
            logger.warning("Diretório de aulas não encontrado: %s", self._lessons_dir)
            return

        for filename in sorted(os.listdir(self._lessons_dir)):
            if not filename.endswith(".json"):
                continue

            filepath = os.path.join(self._lessons_dir, filename)
            lesson_id = filename.replace(".json", "")

            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)

                errors = self.validate_lesson(data)
                if errors:
                    logger.warning(
                        "Aula '%s' tem erros de validação: %s",
                        filename,
                        "; ".join(errors),
                    )
                    # Carrega mesmo assim, mas loga os avisos
                    # Isso permite aulas parcialmente preenchidas funcionarem

                data["_id"] = lesson_id
                data["_filename"] = filename
                self._cache[lesson_id] = data
                count += 1

            except json.JSONDecodeError as exc:
                logger.error("Erro de JSON em '%s': %s", filename, exc)
            except Exception as exc:
                logger.error("Erro ao carregar '%s': %s", filename, exc)

        logger.info("LessonManager: %d aula(s) carregada(s).", count)

    def list_lessons(self) -> list:
        """
        Retorna lista resumida de todas as aulas disponíveis.

        Returns:
            Lista de dicts com id, title, subject, slide_count.
        """
        result = []
        for lesson_id, data in self._cache.items():
            result.append(
                {
                    "id": lesson_id,
                    "title": data.get("title", "Sem título"),
                    "subject": data.get("subject", "geral"),
                    "slide_count": len(data.get("slides", [])),
                }
            )
        return result

    def get_lesson(self, lesson_id: str) -> Optional[dict]:
        """
        Retorna dados completos de uma aula específica.

        Args:
            lesson_id: Identificador da aula (nome do arquivo sem .json).

        Returns:
            Dict com dados da aula, ou None se não encontrada.
        """
        return self._cache.get(lesson_id)

    def reload(self):
        """Recarrega todas as aulas do disco (útil após edição de JSONs)."""
        logger.info("Recarregando aulas...")
        self._load_all()

    @staticmethod
    def validate_lesson(data: dict) -> list:
        """
        Valida a estrutura de uma aula.

        Args:
            data: Dict com os dados da aula.

        Returns:
            Lista de strings descrevendo erros encontrados.
            Lista vazia = aula válida.
        """
        errors = []

        # Garante a existência do bloco de perguntas e respostas
        if "questions" not in data or not isinstance(data["questions"], list):
            data["questions"] = []

        # Verifica campos obrigatórios da aula
        for field in REQUIRED_LESSON_FIELDS:
            if field not in data:
                errors.append(f"Campo obrigatório ausente: '{field}'")

        # Verifica slides
        slides = data.get("slides", [])
        if not isinstance(slides, list):
            errors.append("'slides' deve ser uma lista")
            return errors

        if len(slides) == 0:
            errors.append("A aula deve ter pelo menos 1 slide")

        for i, slide in enumerate(slides):
            if not isinstance(slide, dict):
                errors.append(f"Slide {i + 1}: deve ser um objeto")
                continue

            for field in REQUIRED_SLIDE_FIELDS:
                if field not in slide:
                    errors.append(
                        f"Slide {i + 1}: campo obrigatório ausente: '{field}'"
                    )

            # Avisos (não-bloqueantes)
            if "audio_description" not in slide:
                errors.append(
                    f"Slide {i + 1}: recomendado adicionar 'audio_description'"
                )
            if "code" in slide and "code_description" not in slide:
                errors.append(
                    f"Slide {i + 1}: slide com código sem 'code_description'"
                )

        return errors

    # -----------------------------------------------------------------
    # CRUD — Persistência
    # -----------------------------------------------------------------

    def save_lesson(self, lesson_id: str, data: dict) -> list:
        """
        Salva (cria ou atualiza) uma aula no disco.

        Args:
            lesson_id: Identificador da aula (será o nome do arquivo).
            data: Dict com os dados completos da aula.

        Returns:
            Lista de avisos de validação (lista vazia = sucesso sem avisos).

        Raises:
            ValueError: Se lesson_id for inválido ou data tiver erros bloqueantes.
        """
        # Sanitiza o ID
        lesson_id = self._sanitize_id(lesson_id)
        if not lesson_id:
            raise ValueError("ID da aula inválido. Use apenas letras, números e underscores.")

        # Valida
        errors = self.validate_lesson(data)
        blocking = [e for e in errors if "obrigatório" in e.lower() or "deve ser" in e.lower()]
        if blocking:
            raise ValueError(
                "Erros de validação: " + "; ".join(blocking)
            )

        # Remove campos internos antes de salvar
        clean_data = {k: v for k, v in data.items() if not k.startswith("_")}

        # Salva no disco
        filepath = os.path.join(self._lessons_dir, f"{lesson_id}.json")
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(clean_data, f, ensure_ascii=False, indent=4)

        logger.info("Aula salva: %s.json", lesson_id)

        # Atualiza cache
        clean_data["_id"] = lesson_id
        clean_data["_filename"] = f"{lesson_id}.json"
        self._cache[lesson_id] = clean_data

        # Retorna avisos não-bloqueantes
        warnings = [e for e in errors if e not in blocking]
        return warnings

    def delete_lesson(self, lesson_id: str) -> bool:
        """
        Exclui uma aula do disco e do cache.

        Args:
            lesson_id: Identificador da aula.

        Returns:
            True se excluída, False se não encontrada.
        """
        filepath = os.path.join(self._lessons_dir, f"{lesson_id}.json")
        if not os.path.exists(filepath):
            return False

        os.remove(filepath)
        self._cache.pop(lesson_id, None)
        logger.info("Aula excluída: %s.json", lesson_id)
        return True

    def create_from_template(self, lesson_id: str, template_type: str = "python") -> dict:
        """
        Cria uma nova aula a partir de um template pré-definido.

        Args:
            lesson_id: Identificador para a nova aula.
            template_type: Tipo do template ('python', 'html', 'css', 'javascript', 'vazio').

        Returns:
            Dict com os dados da aula criada.

        Raises:
            ValueError: Se o lesson_id já existir ou for inválido.
        """
        lesson_id = self._sanitize_id(lesson_id)
        if not lesson_id:
            raise ValueError("ID da aula inválido.")

        if lesson_id in self._cache:
            raise ValueError(f"Já existe uma aula com o ID '{lesson_id}'.")

        template = self.get_template(template_type)
        self.save_lesson(lesson_id, template)
        return self._cache[lesson_id]

    @staticmethod
    def get_template(template_type: str = "python") -> dict:
        """
        Retorna um template de aula para o tipo especificado.

        Args:
            template_type: 'python', 'html', 'css', 'javascript' ou 'vazio'.

        Returns:
            Dict com a estrutura da aula.
        """
        templates = {
            "python": {
                "title": "Nova Aula de Python",
                "subject": "python",
                "slides": [
                    {
                        "id": 1,
                        "title": "Título do Slide",
                        "content": "Conteúdo explicativo do slide. Descreva o conceito aqui.",
                        "code": "# Seu código Python aqui\nprint('Olá!')",
                        "code_description": "Descrição do que o código faz, em linguagem simples.",
                        "audio_description": "Slide 1. Título: Título do Slide. Este slide contém uma explicação e um exemplo de código Python.",
                        "image_alt": None,
                        "notes": "Notas do tutor para esta aula."
                    }
                ]
            },
            "html": {
                "title": "Nova Aula de HTML",
                "subject": "html",
                "slides": [
                    {
                        "id": 1,
                        "title": "Título do Slide",
                        "content": "Conteúdo explicativo do slide sobre HTML.",
                        "code": "<!-- Seu código HTML aqui -->\n<p>Olá, mundo!</p>",
                        "code_description": "Descrição do que o código HTML faz.",
                        "audio_description": "Slide 1. Título: Título do Slide. Este slide contém uma explicação e um exemplo de código HTML.",
                        "image_alt": None,
                        "notes": "Notas do tutor."
                    }
                ]
            },
            "css": {
                "title": "Nova Aula de CSS",
                "subject": "css",
                "slides": [
                    {
                        "id": 1,
                        "title": "Título do Slide",
                        "content": "Conteúdo explicativo do slide sobre CSS.",
                        "code": "/* Seu código CSS aqui */\nbody {\n    color: white;\n}",
                        "code_description": "Descrição do que o código CSS faz.",
                        "audio_description": "Slide 1. Título: Título do Slide. Este slide contém uma explicação e um exemplo de código CSS.",
                        "image_alt": None,
                        "notes": "Notas do tutor."
                    }
                ]
            },
            "javascript": {
                "title": "Nova Aula de JavaScript",
                "subject": "javascript",
                "slides": [
                    {
                        "id": 1,
                        "title": "Título do Slide",
                        "content": "Conteúdo explicativo do slide sobre JavaScript.",
                        "code": "// Seu código JavaScript aqui\nconsole.log('Olá!');",
                        "code_description": "Descrição do que o código JavaScript faz.",
                        "audio_description": "Slide 1. Título: Título do Slide. Este slide contém uma explicação e um exemplo de código JavaScript.",
                        "image_alt": None,
                        "notes": "Notas do tutor."
                    }
                ]
            },
            "vazio": {
                "title": "Nova Aula",
                "subject": "geral",
                "slides": [
                    {
                        "id": 1,
                        "title": "Título do Slide",
                        "content": "Conteúdo do slide.",
                        "code": None,
                        "code_description": None,
                        "audio_description": "Slide 1. Título: Título do Slide.",
                        "image_alt": None,
                        "notes": ""
                    }
                ]
            }
        }

        return templates.get(template_type, templates["vazio"])

    @staticmethod
    def _sanitize_id(lesson_id: str) -> str:
        """
        Sanitiza o ID de uma aula para uso como nome de arquivo.
        Permite apenas letras, números, underscores e hífens.
        """
        import re
        # Remove caracteres inseguros
        sanitized = re.sub(r'[^\w\-]', '_', lesson_id.strip().lower())
        # Remove underscores duplicados
        sanitized = re.sub(r'_+', '_', sanitized).strip('_')
        return sanitized

