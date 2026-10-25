const EstudioPrototipagem = (function() {
    let scenes = [];
    let generatedVideoBlob = null;
    let ffmpegInstance = null;
    let isGenerating = false;

    const PRICES = { tts: 0.10, video: 1.80, music: 2.50, avatar: 3.50 };

    async function init() {
        console.log('🎬 Estúdio carregado');
        loadDraftFromStorage();
        setupEventListeners();
        updateUI();
    }

    function setupEventListeners() {
        document.getElementById('videoStyle')?.addEventListener('change', updateCostCalculator);
        document.getElementById('newSceneText')?.addEventListener('input', function() {
            localStorage.setItem('estudio_draft_text', this.value);
        });
    }

    async function generateVideo() {
        if (scenes.length === 0) {
            showNotification('⚠️ Adicione pelo menos 1 cena!', 'warning');
            return;
        }
        if (isGenerating) return;

        isGenerating = true;
        const btn = document.getElementById('btnGenerate');
        const progressContainer = document.getElementById('progressContainer');
        const progressText = document.getElementById('progressText');
        const progressPercent = document.getElementById('progressPercent');
        const renderProgress = document.getElementById('renderProgress');
        const videoPlayer = document.getElementById('videoPlayer');
        const placeholder = document.getElementById('videoPlaceholder');

        try {
            btn.disabled = true;
            btn.innerHTML = '<span class="loading-spinner"></span> Gerando...';
            progressContainer.style.display = 'block';
            progressText.textContent = 'Carregando motor de vídeo...';
            progressPercent.textContent = '5%';
            renderProgress.style.width = '5%';

            if (!ffmpegInstance || !ffmpegInstance.loaded) {
                const { FFmpeg } = window.FFmpegWASM;
                if (!FFmpeg) throw new Error('ffmpeg.wasm não carregou');
                
                ffmpegInstance = new FFmpeg();
                const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
                
                ffmpegInstance.on('progress', ({ progress }) => {
                    const pct = Math.round(progress * 100);
                    progressPercent.textContent = `${pct}%`;
                    renderProgress.style.width = `${pct}%`;
                    progressText.textContent = `Renderizando... ${pct}%`;
                });

                await ffmpegInstance.load({
                    coreURL: `${baseURL}/ffmpeg-core.js`,
                    wasmURL: `${baseURL}/ffmpeg-core.wasm`,
                });
            }

            const style = document.getElementById('videoStyle')?.value || 'youtube';
            const width = style === 'reels' ? 720 : 1280;
            const height = style === 'reels' ? 1280 : 720;
            const fps = 24;

            const frameFiles = [];
            const totalFrames = scenes.reduce((sum, s) => sum + (s.duration * fps), 0);
            let currentFrame = 0;

            for (let i = 0; i < scenes.length; i++) {
                const scene = scenes[i];
                const sceneFrames = scene.duration * fps;
                progressText.textContent = `Cena ${i + 1}/${scenes.length}`;
                
                for (let f = 0; f < sceneFrames; f++) {
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');

                    ctx.fillStyle = scene.color || '#1a0a2e';
                    ctx.fillRect(0, 0, width, height);

                    ctx.fillStyle = 'rgba(255,255,255,0.1)';
                    ctx.font = `bold ${Math.floor(width/3)}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.fillText(`${scene.number}`, width/2, height/2 + width/10);

                    ctx.fillStyle = '#ffffff';
                    ctx.font = `bold ${Math.floor(width/20)}px Arial`;
                    wrapText(ctx, scene.text, width/2, height/2 - 50, width - 100, Math.floor(width/15));

                    const progress = (currentFrame + f) / totalFrames;
                    ctx.fillStyle = 'rgba(138, 96, 255, 0.5)';
                    ctx.fillRect(0, height - 20, width * progress, 20);

                    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.9));
                    const buf = await blob.arrayBuffer();
                    const name = `frame_${String(currentFrame + f).padStart(5, '0')}.jpg`;
                    await ffmpegInstance.writeFile(name, new Uint8Array(buf));
                    frameFiles.push(name);
                }
                currentFrame += sceneFrames;
                const pct = 15 + Math.round((i + 1) / scenes.length * 60);
                progressPercent.textContent = `${pct}%`;
                renderProgress.style.width = `${pct}%`;
            }

            progressText.textContent = 'Montando vídeo...';
            let listContent = '';
            frameFiles.forEach(f => listContent += `file '${f}'\n`);
            await ffmpegInstance.writeFile('frames.txt', listContent);

            await ffmpegInstance.exec([
                '-f', 'concat', '-safe', '0', '-i', 'frames.txt',
                '-vf', `fps=${fps},format=yuv420p`,
                '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28',
                '-movflags', '+faststart', 'output.mp4'
            ]);

            const data = await ffmpegInstance.readFile('output.mp4');
            generatedVideoBlob = new Blob([data.buffer], { type: 'video/mp4' });
            videoPlayer.src = URL.createObjectURL(generatedVideoBlob);
            videoPlayer.style.display = 'block';
            placeholder.classList.add('hidden');
            document.getElementById('btnDownload').disabled = false;

            progressPercent.textContent = '100%';
            renderProgress.style.width = '100%';
            progressText.textContent = '✅ Pronto!';
            showNotification('🎉 Vídeo gerado! Clique play.', 'success');

            frameFiles.forEach(f => ffmpegInstance.deleteFile(f).catch(()=>{}));
            ffmpegInstance.deleteFile('frames.txt').catch(()=>{});
            ffmpegInstance.deleteFile('output.mp4').catch(()=>{});

        } catch (error) {
            console.error(error);
            showNotification(`❌ Erro: ${error.message}`, 'error');
        } finally {
            isGenerating = false;
            btn.disabled = false;
            btn.innerHTML = '▶️ Gerar Prévia Real (Grátis)';
            setTimeout(() => progressContainer.style.display = 'none', 3000);
        }
    }

    function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        const lines = [];
        for (let n = 0; n < words.length; n++) {
            const test = line + words[n] + ' ';
            if (ctx.measureText(test).width > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
            } else {
                line = test;
            }
        }
        lines.push(line);
        const startY = y - ((lines.length - 1) * lineHeight) / 2;
        lines.forEach((l, i) => ctx.fillText(l.trim(), x, startY + (i * lineHeight)));
    }

    function downloadVideo() {
        if (!generatedVideoBlob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(generatedVideoBlob);
        a.download = `previa-${Date.now()}.mp4`;
        a.click();
        showNotification('💾 Download iniciado!', 'success');
    }

    function addScene() {
        const text = document.getElementById('newSceneText')?.value.trim();
        const color = document.getElementById('sceneColor')?.value || '#1a0a2e';
        if (!text) { showNotification('⚠️ Escreva um texto!', 'warning'); return; }

        scenes.push({
            id: Date.now(),
            number: scenes.length + 1,
            text, color,
            words: text.split(/\s+/).length,
            duration: Math.max(2, Math.ceil(text.split(/\s+/).length / 2.5))
        });
        updateUI();
        document.getElementById('newSceneText').value = '';
        saveDraftToStorage();
        showNotification('✅ Cena adicionada!');
    }

    function removeScene(id) {
        scenes = scenes.filter(s => s.id !== id);
        scenes.forEach((s, i) => s.number = i + 1);
        updateUI();
        saveDraftToStorage();
    }

    function moveSceneUp(id) {
        const i = scenes.findIndex(s => s.id === id);
        if (i > 0) { [scenes[i], scenes[i-1]] = [scenes[i-1], scenes[i]]; scenes.forEach((s,idx)=>s.number=idx+1); updateUI(); saveDraftToStorage(); }
    }

    function moveSceneDown(id) {
        const i = scenes.findIndex(s => s.id === id);
        if (i < scenes.length - 1) { [scenes[i], scenes[i+1]] = [scenes[i+1], scenes[i]]; scenes.forEach((s,idx)=>s.number=idx+1); updateUI(); saveDraftToStorage(); }
    }

    function updateUI() { updateStats(); updateSceneList(); updateCostCalculator(); }

    function updateStats() {
        document.getElementById('sceneCount').textContent = scenes.length;
        document.getElementById('wordCount').textContent = scenes.reduce((s,x)=>s+x.words,0);
        document.getElementById('durationEstimate').textContent = scenes.reduce((s,x)=>s+x.duration,0) + 's';
    }

    function updateSceneList() {
        const c = document.getElementById('sceneList');
        if (!c) return;
        if (scenes.length === 0) { c.innerHTML = '<p style="color:#606080;text-align:center;padding:20px;">Nenhuma cena ainda</p>'; return; }
        c.innerHTML = scenes.map((s, i) => `
            <div class="scene-item">
                <div class="scene-header">
                    <span class="scene-number" style="background:${s.color}">Cena ${s.number}</span>
                    <div class="scene-actions">
                        ${i > 0 ? `<button onclick="EstudioPrototipagem.moveSceneUp(${s.id})">⬆️</button>` : ''}
                        ${i < scenes.length-1 ? `<button onclick="EstudioPrototipagem.moveSceneDown(${s.id})">⬇️</button>` : ''}
                        <button onclick="EstudioPrototipagem.removeScene(${s.id})">🗑️</button>
                    </div>
                </div>
                <div style="color:#e0e0ff;margin-bottom:8px;">${escapeHtml(s.text.substring(0,80))}${s.text.length>80?'...':''}</div>
                <div style="font-size:0.85em;color:#a0a0c0;">⏱️ ~${s.duration}s | 📊 ${s.words} palavras</div>
            </div>
        `).join('');
    }

    function updateCostCalculator() {
        const w = scenes.reduce((s,x)=>s+x.words,0);
        const n = scenes.length;
        const cost = ((w+49)//50)*0.10 + (n>0?2.50:0) + n*1.80;
        document.getElementById('costTTS').textContent = `R$ ${(((w+49)//50)*0.10).toFixed(2)}`;
        document.getElementById('costMusic').textContent = `R$ ${(n>0?2.50:0).toFixed(2)}`;
        document.getElementById('costVideo').textContent = `R$ ${(n*1.80).toFixed(2)}`;
        document.getElementById('costAvatar').textContent = 'R$ 0,00';
        document.getElementById('totalCost').textContent = `R$ ${cost.toFixed(2)}`;
        document.getElementById('btnProduce').disabled = n === 0;
    }

    function requestProduction() {
        const total = document.getElementById('totalCost').textContent;
        if (confirm(`Produzir versão final com IA?\nCusto: ${total}`)) {
            fetch('/api/produzir-video', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ scenes, estimatedCost: total })
            }).then(r=>r.json()).then(d => {
                if (d.success) showNotification(`✅ ID: ${d.productionId}`, 'success');
            }).catch(()=>showNotification('❌ Erro','error'));
        }
    }

    function escapeHtml(t) { const d=document.createElement('div'); d.textContent=t; return d.innerHTML; }

    function showNotification(msg, type='info') {
        const n = document.createElement('div');
        const bg = type==='success'?'#00c853':type==='warning'?'#ff9800':type==='error'?'#f44336':'#8a60ff';
        n.style.cssText = `position:fixed;top:20px;right:20px;background:${bg};color:white;padding:15px 25px;border-radius:8px;z-index:2000;animation:slideIn 0.3s;box-shadow:0 5px 20px rgba(0,0,0,0.3);max-width:350px;`;
        n.textContent = msg;
        document.body.appendChild(n);
        setTimeout(()=>{ n.style.animation='slideOut 0.3s'; setTimeout(()=>n.remove(),300); }, 4000);
    }

    function saveDraftToStorage() {
        localStorage.setItem('estudio_draft', JSON.stringify({
            title: document.getElementById('videoTitle')?.value || '',
            style: document.getElementById('videoStyle')?.value || 'youtube',
            scenes, savedAt: new Date().toISOString()
        }));
    }

    function loadDraftFromStorage() {
        try {
            const s = localStorage.getItem('estudio_draft');
            if (s) {
                const d = JSON.parse(s);
                scenes = d.scenes || [];
                if (d.title) document.getElementById('videoTitle').value = d.title;
                if (d.style) document.getElementById('videoStyle').value = d.style;
            }
            const t = localStorage.getItem('estudio_draft_text');
            if (t) document.getElementById('newSceneText').value = t;
        } catch(e) {}
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    return { addScene, removeScene, moveSceneUp, moveSceneDown, generateVideo, downloadVideo, requestProduction };
})();
