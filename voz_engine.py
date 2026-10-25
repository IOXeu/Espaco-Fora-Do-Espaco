import asyncio
import edge_tts
from pathlib import Path

VOZES_DISPONIVEIS = {
    "francisca": "pt-BR-FranciscaNeural",          # Feminina / Alegre / Comercial
    "thalita": "pt-BR-ThalitaMultilingualNeural",   # Feminina / Dinâmica
    "antonio": "pt-BR-AntonioNeural",               # Masculino / Profissional
    "humberto": "pt-BR-HumbertoNeural",             # Masculino / Promocional
}

async def gerar_fala_async(
    texto: str, 
    caminho_saida: str, 
    chave_voz: str = "francisca", 
    rate: str = "+0%", 
    pitch: str = "+0Hz"
) -> bool:
    voz = VOZES_DISPONIVEIS.get(chave_voz.lower(), "pt-BR-FranciscaNeural")
    Path(caminho_saida).parent.mkdir(parents=True, exist_ok=True)
    
    try:
        communicate = edge_tts.Communicate(texto, voice=voz, rate=rate, pitch=pitch)
        await communicate.save(caminho_saida)
        print(f"✅ [voz_engine] Áudio gerado: {caminho_saida} (Voz: {voz})")
        return True
    except Exception as e:
        print(f"❌ [voz_engine] Erro ao gerar áudio: {e}")
        return False

def gerar_fala(texto: str, caminho_saida: str, chave_voz: str = "francisca", rate: str = "+0%", pitch: str = "+0Hz") -> bool:
    return asyncio.run(gerar_fala_async(texto, caminho_saida, chave_voz, rate, pitch))
