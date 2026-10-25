from flask import Flask, render_template, request, jsonify, send_from_directory
import os
from pathlib import Path
import uuid  # ← NOVO: para gerar IDs de produção

# Importando os módulos da nossa arquitetura de áudio
from pipeline_completo import processar_anuncio_completo
from voz_engine import VOZES_DISPONIVEIS

# ← MODIFICADO: adicionado static_folder='assets' para servir CSS/JS do estúdio
app = Flask(__name__, 
            static_folder='assets',
            static_url_path='/assets')

# Diretórios de trabalho para os arquivos gerados
PASTA_TEMP = Path("temp")
PASTA_SAIDA = Path("audios_prontos")

PASTA_TEMP.mkdir(parents=True, exist_ok=True)
PASTA_SAIDA.mkdir(parents=True, exist_ok=True)

@app.route("/")
def index():
    # Renderiza a interface unificada da Sala VIP (index.html)
    return render_template("index.html")

@app.route("/api/gerar-audio", methods=["POST"])
def api_gerar_audio():
    dados = request.json or {}
    
    texto_bruto = dados.get("texto", "")
    nome_projeto = dados.get("projeto", "anuncio_vip")
    chave_voz = dados.get("voz", "francisca")
    caminho_beat = dados.get("beat", None) # Opcional
    
    if not texto_bruto:
        return jsonify({"sucesso": False, "erro": "O texto para locução não foi fornecido."}), 400

    try:
        # Aciona o pipeline completo (Dicionário + Voz + Mixagem)
        caminho_final = processar_anuncio_completo(
            texto_bruto=texto_bruto,
            nome_projeto=nome_projeto,
            chave_voz=chave_voz,
            caminho_beat=caminho_beat
        )
        
        if caminho_final and os.path.exists(caminho_final):
            nome_arquivo = os.path.basename(caminho_final)
            return jsonify({
                "sucesso": True,
                "mensagem": "Áudio gerado com sucesso!",
                "arquivo_url": f"/download/{nome_arquivo}"
            })
        else:
            return jsonify({"sucesso": False, "erro": "Falha no processamento do pipeline de áudio."}), 500

    except Exception as e:
        return jsonify({"sucesso": False, "erro": str(e)}), 500

@app.route("/download/<path:nome_arquivo>")
def baixar_arquivo(nome_arquivo):
    # Rota para o front-end baixar o áudio pronto gerado
    return send_from_directory(PASTA_SAIDA, nome_arquivo, as_attachment=True)

@app.route("/api/vozes", methods=["GET"])
def listar_vozes():
    # Retorna as opções de vozes disponíveis para o painel
    return jsonify({"sucesso": True, "vozes": VOZES_DISPONIVEIS})


# ============================================================
# ↓↓↓ NOVAS ROTAS DO ESTÚDIO DE PROTOTIPAGEM ↓↓↓
# ============================================================

@app.route("/estudio")
def estudio_prototipagem():
    """Página do estúdio de prototipagem gratuito (prévia de vídeo)"""
    return render_template("estudio_prototipagem.html")


@app.route("/api/produzir-video", methods=["POST"])
def produzir_video():
    """
    Recebe o rascunho aprovado pelo usuário e registra a solicitação
    de produção da versão final com IA (paga).
    
    NOTA: Esta rota apenas REGISTRA a intenção. A integração real com
    suas APIs pagas (TTS, vídeo, música) e gateway de pagamento deve
    ser implementada aqui quando você estiver pronto.
    """
    try:
        data = request.json or {}
        scenes = data.get("scenes", [])
        
        if not scenes:
            return jsonify({"sucesso": False, "erro": "Nenhuma cena encontrada"}), 400
        
        # Gera ID único para esta produção
        production_id = str(uuid.uuid4())[:8]
        
        # Calcula custo estimado baseado nos seus preços reais
        total_words = sum(scene.get("words", 0) for scene in scenes)
        total_scenes = len(scenes)
        
        # Seus preços (do print): TTS R$0,10/bloco, Vídeo R$1,80/cena, Música R$2,50/faixa
        tts_blocks = (total_words + 49) // 50  # arredonda pra cima (50 palavras/bloco)
        cost_tts = tts_blocks * 0.10
        cost_music = 2.50 if total_scenes > 0 else 0
        cost_video = total_scenes * 1.80
        total_cost = cost_tts + cost_music + cost_video
        
        # TODO: Aqui você pode salvar em banco de dados, enviar email, etc.
        # Exemplo simples: log no console
        print(f"🎬 [ESTÚDIO] Nova produção solicitada")
        print(f"   ID: {production_id}")
        print(f"   Cenas: {total_scenes} | Palavras: {total_words}")
        print(f"   Custo estimado: R$ {total_cost:.2f}")
        
        return jsonify({
            "sucesso": True,
            "productionId": production_id,
            "totalCost": total_cost,
            "mensagem": f"Produção registrada! Custo: R$ {total_cost:.2f}"
        })
        
    except Exception as e:
        print(f"❌ [ESTÚDIO] Erro ao processar produção: {str(e)}")
        return jsonify({"sucesso": False, "erro": str(e)}), 500


# ============================================================
# ↑↑↑ FIM DAS NOVAS ROTAS ↑↑↑
# ============================================================


if __name__ == "__main__":
    print("🚀 Servidor Flask da Sala VIP rodando...")
    print("🎬 Estúdio de Prototipagem disponível em: http://localhost:5000/estudio")
    app.run(host="0.0.0.0", port=5000, debug=True)
