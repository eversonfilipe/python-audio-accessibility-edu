"""
Servidor Flask Principal - Trilha TEC (Acessibilidade Educacional)

Responsável por orquestrar a interface de baixo consumo de recursos (CPU/RAM)
e servir as rotas da aplicação web local. Desenvolvido com foco em execução
offline e compatibilidade com computadores de laboratório escolar.

Rotas Principais:
    GET  /                  -> Interface do aluno (index.html)
    GET  /tutor             -> Painel de gerenciamento do tutor
    GET  /api/lessons       -> Carregamento estruturado de aulas
    POST /api/tts           -> Backend de síntese de voz (TTS)
"""

import logging
import os
import sys

# Adiciona o diretório src ao path para imports locais
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, jsonify, render_template, request, send_file

import config
from lesson_manager import LessonManager
from tts_engine import TTSEngine
from ai_assistant import AIAssistant

import mimetypes
# Patch mandatorio para ambientes Windows empacotados via PyInstaller.
# Contorna falhas do Registro do Windows (HKEY_CLASSES_ROOT) que frequentemente
# interpretam arquivos CSS e JS como 'text/plain'. Sem isso, a aplicacao
# renderizaria em 'HTML Puro', quebrando completamente a interface de True Black.
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('image/svg+xml', '.svg')

# =============================================================
# Configuração de Logging
# =============================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# =============================================================
# Inicialização do Flask
# =============================================================
app = Flask(
    __name__,
    template_folder=config.TEMPLATES_DIR,
    static_folder=config.STATIC_DIR,
)

# =============================================================
# Inicialização dos Módulos
# =============================================================
lesson_manager = LessonManager()
tts_engine = TTSEngine()
ai_assistant = AIAssistant()

# =============================================================
# Rotas — Páginas
# =============================================================
@app.route("/")
def index():
    """Serve a página principal."""
    return render_template("index.html")


# =============================================================
# Rotas — API de Aulas
# =============================================================
@app.route("/api/lessons", methods=["GET"])
def api_list_lessons():
    """Retorna lista resumida de todas as aulas."""
    lessons = lesson_manager.list_lessons()
    return jsonify({"success": True, "lessons": lessons})


@app.route("/api/lessons/<lesson_id>", methods=["GET"])
def api_get_lesson(lesson_id):
    """Retorna dados completos de uma aula específica."""
    lesson = lesson_manager.get_lesson(lesson_id)
    if lesson is None:
        return jsonify(
            {
                "success": False,
                "error": f"Aula '{lesson_id}' não encontrada.",
            }
        ), 404

    return jsonify({"success": True, "lesson": lesson})


@app.route("/api/lessons/reload", methods=["POST"])
def api_reload_lessons():
    """Recarrega todas as aulas do disco."""
    lesson_manager.reload()
    lessons = lesson_manager.list_lessons()
    return jsonify(
        {
            "success": True,
            "message": f"{len(lessons)} aula(s) recarregada(s).",
            "lessons": lessons,
        }
    )


# =============================================================
# Rotas — Painel do Tutor
# =============================================================
@app.route("/tutor")
def tutor_panel():
    """Serve o painel de gerenciamento de aulas do tutor."""
    return render_template("tutor.html")


# =============================================================
# Rotas — API CRUD de Aulas (Tutor)
# =============================================================
@app.route("/api/lessons", methods=["POST"])
def api_create_lesson():
    """
    Cria uma nova aula.

    Espera JSON com:
        - id (str): Identificador da aula.
        - template (str, opcional): Tipo do template para inicializar.
        - data (dict, opcional): Dados completos da aula (sobrepõe template).
    """
    payload = request.get_json()
    if not payload or "id" not in payload:
        return jsonify(
            {"success": False, "error": "Campo 'id' é obrigatório."}
        ), 400

    lesson_id = payload["id"]

    try:
        if "data" in payload:
            # Criação com dados completos
            warnings = lesson_manager.save_lesson(lesson_id, payload["data"])
            lesson = lesson_manager.get_lesson(
                lesson_manager._sanitize_id(lesson_id)
            )
        else:
            # Criação a partir de template
            template_type = payload.get("template", "python")
            lesson = lesson_manager.create_from_template(lesson_id, template_type)
            warnings = []

        return jsonify(
            {
                "success": True,
                "message": "Aula criada com sucesso.",
                "lesson": lesson,
                "warnings": warnings,
            }
        ), 201

    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        logger.error("Erro ao criar aula: %s", e)
        return jsonify({"success": False, "error": "Erro interno ao criar aula."}), 500


@app.route("/api/lessons/<lesson_id>", methods=["PUT"])
def api_update_lesson(lesson_id):
    """
    Atualiza uma aula existente.

    Espera JSON com os dados completos da aula.
    """
    data = request.get_json()
    if not data:
        return jsonify(
            {"success": False, "error": "Dados da aula são obrigatórios."}
        ), 400

    try:
        warnings = lesson_manager.save_lesson(lesson_id, data)
        lesson = lesson_manager.get_lesson(
            lesson_manager._sanitize_id(lesson_id)
        )
        return jsonify(
            {
                "success": True,
                "message": "Aula atualizada com sucesso.",
                "lesson": lesson,
                "warnings": warnings,
            }
        )

    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        logger.error("Erro ao atualizar aula: %s", e)
        return jsonify(
            {"success": False, "error": "Erro interno ao atualizar aula."}
        ), 500


@app.route("/api/lessons/<lesson_id>", methods=["DELETE"])
def api_delete_lesson(lesson_id):
    """Exclui uma aula."""
    deleted = lesson_manager.delete_lesson(lesson_id)
    if not deleted:
        return jsonify(
            {"success": False, "error": f"Aula '{lesson_id}' não encontrada."}
        ), 404

    return jsonify({"success": True, "message": "Aula excluída com sucesso."})


@app.route("/api/templates/<template_type>", methods=["GET"])
def api_get_template(template_type):
    """Retorna um template de aula para o tipo especificado."""
    template = lesson_manager.get_template(template_type)
    return jsonify({"success": True, "template": template})

# =============================================================
# Rotas — API de TTS
# =============================================================
@app.route("/api/tts", methods=["POST"])
def api_tts():
    """
    Gera áudio a partir de texto via backend TTS.

    Espera JSON com:
        - text (str): Texto para sintetizar.
        - engine (str, opcional): Forçar engine ("pyttsx3" ou "edge-tts").

    Retorna:
        Arquivo de áudio (.mp3 ou .wav).
    """
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify(
            {
                "success": False,
                "error": "Campo 'text' é obrigatório.",
            }
        ), 400

    text = data["text"]
    engine = data.get("engine")

    audio_path = tts_engine.synthesize(text, force_engine=engine)
    if audio_path is None:
        return jsonify(
            {
                "success": False,
                "error": "Falha ao gerar áudio. Nenhuma engine TTS disponível.",
            }
        ), 500

    return send_file(
        audio_path,
        mimetype="audio/mpeg",
        as_attachment=False,
    )


@app.route("/api/tts/status", methods=["GET"])
def api_tts_status():
    """Retorna status de disponibilidade das engines TTS."""
    status = tts_engine.get_status()
    voices = tts_engine.get_voices()
    return jsonify(
        {
            "success": True,
            "engines": status,
            "voices_ptbr": [v for v in voices if v.get("is_ptbr")],
            "voices_all": voices,
        }
    )

# =============================================================
# Rotas — API do Duelo de Lógica (IA)
# =============================================================
@app.route("/api/ai/generate", methods=["POST"])
def api_ai_generate():
    """Gera código Python baseado na lógica cognitiva da estudante."""
    data = request.get_json()
    if not data or "instruction" not in data:
        return jsonify({"success": False, "error": "Forneça a instrução lógica para a IA."}), 400
    
    result = ai_assistant.generate_code(data["instruction"], data.get("context", ""))
    return jsonify(result), 200 if result.get("success") else 400

# =============================================================
# Tratamento de Erros
# =============================================================
@app.errorhandler(404)
def not_found(error):
    """Erro 404 com mensagem acessível."""
    return jsonify(
        {
            "success": False,
            "error": "Recurso não encontrado.",
        }
    ), 404


@app.errorhandler(500)
def internal_error(error):
    """Erro 500 com mensagem acessível."""
    logger.error("Erro interno: %s", error)
    return jsonify(
        {
            "success": False,
            "error": "Erro interno do servidor.",
        }
    ), 500


# =============================================================
# Ponto de Entrada
# =============================================================
if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("  Sistema de Acessibilidade Educacional Auditiva")
    logger.info("  Programa Trilha TEC — Florescendo Talentos")
    logger.info("=" * 60)
    logger.info("  Servidor: http://%s:%s", config.HOST, config.PORT)
    logger.info("  Aulas: %d carregada(s)", len(lesson_manager.list_lessons()))
    logger.info("=" * 60)

    # Usa o servidor Flask nativo.
    # NOTA: waitress foi removido porque suas worker threads conflitam
    # com os objetos COM do pyttsx3 (SAPI5) no Windows, causando
    # travamento silencioso. O servidor Flask nativo é adequado para
    # uso local nos laboratórios da escola.
    app.run(
        host=config.HOST,
        port=config.PORT,
        debug=config.DEBUG,
        use_reloader=False,  # Evita double-init do pyttsx3
    )
