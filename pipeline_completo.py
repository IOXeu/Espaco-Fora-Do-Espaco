import json
import os
import shutil
from pathlib import Path
from voz_engine import gerar_fala
from mixador_audio import mixar_voz_e_musica

def carregar_dicionario(caminho_json: str = "dicionario.json") -> dict:
    if os.path.exists(caminho_json):
        with open(caminho_json, "r", encoding="utf-8") as f:
            return json.load(f)
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
    caminho_beat: str = None
) -> str:
    dic = carregar_dicionario()
    texto_fala = aplicar_dicionario(texto_bruto, dic)
    
    pasta_temp = Path("temp")
    pasta_saida = Path("audios_prontos")
    
    pasta_temp.mkdir(parents=True, exist_ok=True)
    pasta_saida.mkdir(parents=True, exist_ok=True)
    
    voz_temp_path = str(pasta_temp / f"{nome_projeto}_voz.mp3")
    final_path = str(pasta_saida / f"{nome_projeto}.mp3")

    # 1. Gerar voz neural local
    sucesso_voz = gerar_fala(texto_fala, voz_temp_path, chave_voz=chave_voz)
    if not sucesso_voz:
        return ""

    # 2. Mixar com beat se selecionado, senão enviar diretamente para a pasta final
    if caminho_beat and os.path.exists(caminho_beat):
        sucesso_mix = mixar_voz_e_musica(voz_temp_path, caminho_beat, final_path)
        if sucesso_mix:
            return final_path
    else:
        # Se não houver beat, copia o áudio gerado diretamente para a pasta de reprodução
        shutil.copy(voz_temp_path, final_path)
        return final_path

    return ""
