import math
import os
import subprocess
from pathlib import Path


def mixar_voz_e_musica(
    caminho_voz: str,
    caminho_beat: str,
    caminho_saida: str,
    volume_beat: float = 0.12,
) -> bool:
    voice = Path(caminho_voz).resolve()
    beat = Path(caminho_beat).resolve()
    output = Path(caminho_saida).resolve()
    if not voice.is_file() or not beat.is_file():
        print("❌ [mixador] Arquivo de voz ou beat não encontrado.")
        return False
    if not math.isfinite(float(volume_beat)) or not 0.0 <= float(volume_beat) <= 1.0:
        print("❌ [mixador] Volume fora do intervalo permitido (0–1).")
        return False
    if not os.path.isfile("/usr/bin/ffmpeg") and not __import__("shutil").which("ffmpeg"):
        print("❌ [mixador] FFmpeg não está instalado.")
        return False

    output.parent.mkdir(parents=True, exist_ok=True)
    volume = f"{float(volume_beat):.3f}"
    cmd = [
        "ffmpeg", "-nostdin", "-y",
        "-i", str(voice),
        "-i", str(beat),
        "-filter_complex", f"[1:a]volume={volume}[beat];[0:a][beat]amix=inputs=2:duration=first[aout]",
        "-map", "[aout]",
        "-c:a", "libmp3lame",
        "-q:a", "2",
        str(output),
    ]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
        print(f"🎵 [mixador] Mixagem concluída: {output}")
        return True
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
        detail = getattr(exc, "stderr", b"")
        if isinstance(detail, bytes):
            detail = detail.decode("utf-8", errors="ignore")
        print(f"❌ [mixador] Erro no FFmpeg: {detail or exc}")
        return False
