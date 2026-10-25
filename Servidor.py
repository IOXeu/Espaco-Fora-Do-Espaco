from flask import Flask, render_template, request, jsonify, send_from_directory
import os
from pathlib import Path

# Importando os módulos da nossa arquitetura de áudio
from pipeline_completo import processar_anuncio_completo
from voz_engine import VOZES_DISPONIVEIS

app = Flask(__name__)

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

if __name__ == "__main__":
    print("🚀 Servidor Flask da Sala VIP rodando...")
    app.run(host="0.0.0.0", port=5000, debug=True)
