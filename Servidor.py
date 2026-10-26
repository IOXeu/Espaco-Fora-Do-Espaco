import os
import re
import shutil
import uuid
from pathlib import Path

from flask import Flask, jsonify, make_response, render_template, request, send_from_directory, url_for

from pipeline_completo import processar_anuncio_completo
from voz_engine import VOZES_DISPONIVEIS

ROOT = Path(__file__).resolve().parent
OUTPUT_DIR = Path(os.environ.get("AUDIO_OUTPUT_DIR", ROOT / "audios_prontos")).resolve()
TEMP_DIR = Path(os.environ.get("AUDIO_TEMP_DIR", ROOT / "temp")).resolve()
BEATS_DIR = Path(os.environ.get("AUDIO_BEATS_DIR", ROOT / "beats")).resolve()
MAX_TEXT_CHARS = int(os.environ.get("MAX_AUDIO_TEXT_CHARS", "8000"))
ALLOWED_RATES = {"-10%", "+0%", "+10%", "+20%"}
ALLOWED_BEAT_EXTENSIONS = {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"}
ALLOWED_ORIGINS = {
    origin.strip().rstrip("/")
    for origin in os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
}

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)
BEATS_DIR.mkdir(parents=True, exist_ok=True)

app = Flask(__name__, template_folder="templates", static_folder="assets", static_url_path="/assets")
app.config["MAX_CONTENT_LENGTH"] = 64 * 1024
app.config["OUTPUT_DIR"] = OUTPUT_DIR


@app.after_request
def set_cors_headers(response):
    origin = request.headers.get("Origin", "").rstrip("/")
    if origin and origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        response.headers["Access-Control-Max-Age"] = "600"
    return response


def json_error(message, status):
    return jsonify({"sucesso": False, "erro": message}), status


def slugify(value):
    value = str(value or "projeto").strip().lower()
    value = re.sub(r"[^a-z0-9_-]+", "_", value, flags=re.ASCII)
    value = re.sub(r"_+", "_", value).strip("_- ")
    return (value[:48] or "projeto")


def list_beats():
    if not BEATS_DIR.exists():
        return []
    return sorted(
        path.name for path in BEATS_DIR.iterdir()
        if path.is_file() and path.suffix.lower() in ALLOWED_BEAT_EXTENSIONS
    )


@app.context_processor
def inject_runtime_config():
    return {"audio_api_base_url": os.environ.get("AUDIO_API_BASE_URL", "").rstrip("/")}


@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")


@app.route("/sala-vip", methods=["GET"])
def sala_vip():
    return render_template("sala_vip.html")


@app.route("/api/health", methods=["GET", "OPTIONS"])
def health():
    if request.method == "OPTIONS":
        return make_response("", 204)
    return jsonify({"sucesso": True, "servico": "sandbox-audio", "ffmpeg": bool(shutil.which("ffmpeg"))})


@app.route("/api/vozes", methods=["GET", "OPTIONS"])
def listar_vozes():
    if request.method == "OPTIONS":
        return make_response("", 204)
    return jsonify({"sucesso": True, "vozes": VOZES_DISPONIVEIS})


@app.route("/api/beats", methods=["GET", "OPTIONS"])
def listar_beats():
    if request.method == "OPTIONS":
        return make_response("", 204)
    return jsonify({"sucesso": True, "beats": list_beats()})


@app.route("/api/gerar-audio", methods=["POST", "OPTIONS"])
def api_gerar_audio():
    if request.method == "OPTIONS":
        return make_response("", 204)
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return json_error("Envie um corpo JSON válido.", 400)

    text = data.get("texto", "")
    if not isinstance(text, str) or not text.strip():
        return json_error("Informe o texto para locução.", 400)
    text = text.strip()
    if len(text) > MAX_TEXT_CHARS:
        return json_error(f"O texto excede o limite de {MAX_TEXT_CHARS} caracteres.", 413)

    voice = str(data.get("voz", "francisca")).lower()
    if voice not in VOZES_DISPONIVEIS:
        return json_error("Voz não reconhecida. Consulte /api/vozes.", 400)

    rate = str(data.get("rate", "+0%"))
    if rate not in ALLOWED_RATES:
        return json_error("Velocidade inválida.", 400)

    beat_name = data.get("beat") or ""
    beat_path = None
    if beat_name:
        if not isinstance(beat_name, str) or Path(beat_name).name != beat_name:
            return json_error("Beat inválido.", 400)
        candidate = (BEATS_DIR / beat_name).resolve()
        if candidate.parent != BEATS_DIR or candidate.suffix.lower() not in ALLOWED_BEAT_EXTENSIONS or not candidate.is_file():
            return json_error("Beat não encontrado. Escolha um arquivo disponível em /api/beats.", 400)
        beat_path = str(candidate)

    try:
        volume = float(data.get("volume_beat", 0.12))
    except (TypeError, ValueError):
        return json_error("Volume da trilha inválido.", 400)
    if not 0.0 <= volume <= 1.0:
        return json_error("O volume da trilha deve estar entre 0 e 1.", 400)

    project = slugify(data.get("projeto", "anuncio_vip"))
    # A unique suffix prevents overwrites and prevents users from selecting another output path.
    job_name = f"{project}_{uuid.uuid4().hex[:12]}"
    try:
        output_path = processar_anuncio_completo(
            texto_bruto=text,
            nome_projeto=job_name,
            chave_voz=voice,
            caminho_beat=beat_path,
            rate=rate,
            volume_beat=volume,
        )
        if not output_path or not Path(output_path).is_file():
            return json_error("Não foi possível concluir o pipeline de áudio.", 500)
        filename = Path(output_path).name
        return jsonify({
            "sucesso": True,
            "mensagem": "Áudio gerado na sandbox gratuita.",
            "projeto": project,
            "voz": voice,
            "rate": rate,
            "arquivo_url": url_for("baixar_arquivo", nome_arquivo=filename),
        })
    except Exception:
        app.logger.exception("Falha no pipeline gratuito de áudio")
        return json_error("Falha ao gerar o áudio. Verifique o serviço de TTS e os logs do backend.", 500)


@app.route("/download/<path:nome_arquivo>", methods=["GET"])
def baixar_arquivo(nome_arquivo):
    if Path(nome_arquivo).name != nome_arquivo or not re.fullmatch(r"[a-zA-Z0-9_-]+\.mp3", nome_arquivo):
        return json_error("Arquivo inválido.", 404)
    return send_from_directory(OUTPUT_DIR, nome_arquivo, as_attachment=True, download_name=nome_arquivo)


@app.route("/api/produzir-video", methods=["POST", "OPTIONS"])
def produzir_video():
    if request.method == "OPTIONS":
        return make_response("", 204)
    # Intentionally does not call paid providers. Paid production must use the Worker quote/checkout flow.
    return json_error("Produção paga de vídeo é iniciada somente após orçamento e confirmação do checkout no Worker.", 501)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "8000")), debug=False)
