import subprocess
import os
from pathlib import Path

def mixar_voz_e_musica(
    caminho_voz: str, 
    caminho_beat: str, 
    caminho_saida: str, 
    volume_beat: float = 0.12
) -> bool:
    if not os.path.exists(caminho_voz) or not os.path.exists(caminho_beat):
        print("❌ [mixador] Arquivo de voz ou beat não encontrado.")
        return False

    Path(caminho_saida).parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        "ffmpeg", "-y",
        "-i", caminho_voz,
        "-i", caminho_beat,
        "-filter_complex",
        f"[1:a]volume={volume_beat}[beat];[0:a][beat]amix=inputs=2:duration=first[aout]",
        "-map", "[aout]",
        "-c:a", "libmp3lame",
        "-q:a", "2",
        caminho_saida
    ]

    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print(f"🎵 [mixador] Mixagem concluída: {caminho_saida}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ [mixador] Erro no FFmpeg: {e.stderr.decode('utf-8', errors='ignore')}")
        return False
