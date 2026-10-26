import json
import os
import re
import shutil
from pathlib import Path

from voz_engine import gerar_fala
from mixador_audio import mixar_voz_e_musica

ROOT = Path(__file__).resolve().parent


def carregar_dicionario(caminho_json: str = "dicionario.json") -> dict:
    path = Path(caminho_json)
    if not path.is_absolute():
        path = ROOT / path
    if path.exists():
        with path.open("r", encoding="utf-8") as file:
            return json.load(file)
    return {}


def aplicar_dicionario(texto: str, dicionario: dict) -> str:
    texto_processado = texto
    if isinstance(dicionario, list):
        for item in dicionario:
            expr = item.get("expressao", "")
            fala = item.get("texto_fala", "")
            if expr and fala:
                texto_processado = texto_processado.replace(expr, fala)
    return texto_processado


def processar_anuncio_completo(
    texto_bruto: str,
    nome_projeto: str,
    chave_voz: str = "francisca",
    caminho_beat: str = None,
    rate: str = "+0%",
    volume_beat: float = 0.12,
) -> str:
    # Defense in depth: project names cannot introduce path separators or shell syntax.
    safe_name = re.sub(r"[^a-zA-Z0-9_-]", "_", str(nome_projeto))[:64] or "anuncio_vip"
    text_to_speak = aplicar_dicionario(texto_bruto, carregar_dicionario())
    temp_dir = Path(os.environ.get("AUDIO_TEMP_DIR", ROOT / "temp")).resolve()
    output_dir = Path(os.environ.get("AUDIO_OUTPUT_DIR", ROOT / "audios_prontos")).resolve()
    temp_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    voice_path = temp_dir / f"{safe_name}_voz.mp3"
    final_path = output_dir / f"{safe_name}.mp3"
    try:
        if not gerar_fala(text_to_speak, str(voice_path), chave_voz=chave_voz, rate=rate):
            return ""
        if caminho_beat:
            if not mixar_voz_e_musica(str(voice_path), caminho_beat, str(final_path), volume_beat=volume_beat):
                return ""
        else:
            shutil.copyfile(voice_path, final_path)
        return str(final_path)
    finally:
        try:
            voice_path.unlink(missing_ok=True)
        except OSError:
            pass
