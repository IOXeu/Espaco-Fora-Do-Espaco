/**
 * GERADOR DE VÍDEO REGIONAL
 * Usa FFmpeg.wasm para gerar vídeo no navegador
 * Integra com dicionario.json via API
 */

const GeradorVideo = (function() {
    let scenes = [];
    let generatedBlob = null;
    let ffmpeg = null;
    let dictionary = []; // Aqui vamos carregar as 108 gírias

    // Inicialização
    async function init() {
        console.log("🎬 Iniciando Gerador...");
        await carregarDicionario();
        carregarGirias();
    }

    // Carrega o dicionário do backend
    async function carregarDicionario() {
        try {
            const response = await fetch('/api/dicionario');
            const data = await response.json();
            if (data.sucesso) {
                dictionary = data.dados;
                console.log(`✅ Dicionário carregado: ${dictionary.length} expressões`);
            } else {
                throw new Error("Erro na API");
            }
        } catch (error) {
            console.warn("⚠️ Usando dicionário fallback (offline)");
            // Fallback mínimo caso a API falhe
            dictionary = [
                {id:1, expressao:"oxe", regiao:"Nordeste", texto_fala:"ó xi"},
                {id:30, expressao:"mano", regiao:"Sudeste", texto_fala:"ma nu"},
                {id:50, expressao:"bah", regiao:"Sul", texto_fala:"bá"},
                {id:7, expressao:"boró", regiao:"Norte", texto_fala:"bo ró"}
            ];
        }
    }

    // Filtra e mostra as gírias na tela
    function carregarGirias() {
        const regiao = document.getElementById('regiaoSelect').value;
        const container = document.getElementById('gíriasList');
        container.innerHTML = '';

        const filtradas = dictionary.filter(g => 
            regiao === 'Geral' || g.regiao.includes(regiao) || g.regiao === 'Geral'
        );

        filtradas.forEach(g => {
            const tag = document.createElement('span');
            tag.className = 'giria-tag';
            tag.textContent = g.expressao;
            tag.title = `Significado: ${g.significado || ''}`;
            tag.onclick = () => inserirGiria(g.expressao);
            container.appendChild(tag);
        });
    }

    function inserirGiria(texto) {
        const area = document.getElementById('newSceneText');
        area.value += (area.value ? ' ' : '') + texto;
        area.focus();
    }

    function adicionarCena() {
        const texto = document.getElementById('newSceneText').value.trim();
        const cor = document.getElementById('sceneColor').value;
        
        if (!texto) return alert("Escreva algo!");

        scenes.push({
            id: Date.now(),
            texto: texto,
            cor: cor,
            palavras: texto.split(' ').length,
            duracao: Math.max(2, Math.ceil(texto.split(' ').length / 2.5))
        });

        document.getElementById('newSceneText').value = '';
        atualizarUI();
    }

    function atualizarUI() {
        // Atualiza contadores
        document.getElementById('sceneCount').innerText = scenes.length;
        const totalPalavras = scenes.reduce((acc, s) => acc + s.palavras, 0);
        document.getElementById('wordCount').innerText = totalPalavras;
        const totalDuracao = scenes.reduce((acc, s) => acc + s.duracao, 0);
        document.getElementById('durationEstimate').innerText = totalDuracao + 's';

        // Conta gírias usadas
        let countGirias = 0;
        scenes.forEach(s => {
            dictionary.forEach(d => {
                if (s.texto.toLowerCase().includes(d.expressao.toLowerCase())) countGirias++;
            });
        });
        document.getElementById('giriasCount').innerText = countGirias;

        // Lista de cenas
        const lista = document.getElementById('listaCenas');
        lista.innerHTML = scenes.map((s, i) => `
            <div style="background:#222; padding:10px; margin-bottom:5px; border-radius:5px; border-left: 3px solid ${s.cor};">
                <strong>Cena ${i+1}:</strong> ${s.texto.substring(0, 50)}...
                <span style="float:right; color:#888;">${s.duracao}s</span>
            </div>
        `).join('');

        // Calcula Custo Estimado (Preços do seu print)
        // TTS: R$0,10 por bloco (50 palavras), Video: R$1,80 por cena, Musica: R$2,50 fixo
        const blocosTTS = Math.ceil(totalPalavras / 50);
        const custoTTS = blocosTTS * 0.10;
        const custoVideo = scenes.length * 1.80;
        const custoMusica = scenes.length > 0 ? 2.50 : 0;
        const total = custoTTS + custoVideo + custoMusica;

        document.getElementById('custoTotal').innerText = `R$ ${total.toFixed(2)}`;
    }

    async function gerarVideo() {
        if (scenes.length === 0) return alert("Adicione cenas primeiro!");
        
        const btn = document.getElementById('btnGerar');
        const progresso = document.getElementById('progresso');
        const barra = document.getElementById('barraProgresso');
        const textoProg = document.getElementById('textoProgresso');
        
        btn.disabled = true;
        progresso.style.display = 'block';
        textoProg.innerText = "Carregando motor de vídeo...";

        try {
            if (!ffmpeg) {
                const { FFmpeg } = window.FFmpegWASM;
                ffmpeg = new FFmpeg();
                await ffmpeg.load({
                    coreURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js",
                    wasmURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm"
                });
            }

            const width = 720; // Vertical/Reels
            const height = 1280;
            const fps = 24;
            const frames = [];

            // Gera frames no Canvas
            for (let i = 0; i < scenes.length; i++) {
                const scene = scenes[i];
                const numFrames = scene.duracao * fps;
                textoProg.innerText = `Renderizando Cena ${i+1}/${scenes.length}...`;
                
                for (let f = 0; f < numFrames; f++) {
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');

                    // Fundo
                    ctx.fillStyle = scene.cor;
                    ctx.fillRect(0, 0, width, height);

                    // Texto Centralizado
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 40px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    // Quebra de linha simples
                    const words = scene.texto.split(' ');
                    let line = '';
                    let y = height / 2 - ((words.length * 20) / 2);
                    
                    words.forEach(word => {
                        const testLine = line + word + ' ';
                        const metrics = ctx.measureText(testLine);
                        if (metrics.width > width - 100 && line !== '') {
                            ctx.fillText(line, width/2, y);
                            line = word + ' ';
                            y += 50;
                        } else {
                            line = testLine;
                        }
                    });
                    ctx.fillText(line, width/2, y);

                    // Salva frame
                    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.9));
                    const arrayBuffer = await blob.arrayBuffer();
                    const fileName = `frame_${String(frames.length).padStart(5, '0')}.jpg`;
                    await ffmpeg.writeFile(fileName, new Uint8Array(arrayBuffer));
                    frames.push(fileName);
                }
                
                // Atualiza barra
                const pct = ((i + 1) / scenes.length) * 80;
                barra.style.width = `${pct}%`;
            }

            // Cria lista de frames pro FFmpeg
            let listContent = '';
            frames.forEach(f => listContent += `file '${f}'\n`);
            await ffmpeg.writeFile('list.txt', listContent);

            textoProg.innerText = "Codificando MP4...";
            
            // Comando FFmpeg
            await ffmpeg.exec([
                '-f', 'concat', '-safe', '0', '-i', 'list.txt',
                '-vf', `fps=${fps},format=yuv420p`,
                '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28',
                'output.mp4'
            ]);

            const data = await ffmpeg.readFile('output.mp4');
            generatedBlob = new Blob([data.buffer], { type: 'video/mp4' });
            
            // Mostra no player
            const video = document.getElementById('player');
            video.src = URL.createObjectURL(generatedBlob);
            document.getElementById('placeholder').style.display = 'none';
            document.getElementById('btnBaixar').disabled = false;

            barra.style.width = '100%';
            textoProg.innerText = "✅ Pronto!";

            // Limpeza
            frames.forEach(f => ffmpeg.deleteFile(f));
            ffmpeg.deleteFile('list.txt');
            ffmpeg.deleteFile('output.mp4');

        } catch (err) {
            console.error(err);
            alert("Erro ao gerar vídeo: " + err.message);
        } finally {
            btn.disabled = false;
        }
    }

    function baixar() {
        if (!generatedBlob) return;
        const url = URL.createObjectURL(generatedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'previa-regional.mp4';
        a.click();
    }

    function solicitarProducao() {
        if (scenes.length === 0) return alert("Crie um vídeo primeiro!");
        
        const total = document.getElementById('custoTotal').innerText;
        if(confirm(`Confirmar contratação da versão profissional por ${total}?`)) {
            // Aqui você chamaria sua API de pagamento/backend
            alert("Redirecionando para pagamento... (Integrar com /api/produzir-video)");
        }
    }

    // Inicia quando carregar
    window.addEventListener('DOMContentLoaded', init);

    return {
        carregarGirias,
        adicionarCena,
        gerarVideo,
        baixar,
        solicitarProducao
    };
})();
