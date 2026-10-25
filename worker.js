// worker.js — Espaço Fora do Espaço
// Hub de IAs com assinatura Mercado Pago, validação ECDSA, proxy de APIs e precificação
// ====================================================================

const PRECO_ASSINATURA = 11.00;

const PUB_KEY_JWK = {
  kty: 'EC', crv: 'P-256',
  x: 'brR9UVjpg32UbdPWGrDJWUJdcV88CxlPvO8ZMVoBKEU',
  y: 'qI9ONeMlrOFpwW5k5sycpyxSbSPGOxGlXj4Bi0oavRQ',
};

const PRECOS = {
  'grok-tts':            { preco: 0.12, unidade: 'bloco',     ia: 'Grok-TTS',          desc: 'TTS Padrão' },
  'elevenlabs-flash':    { preco: 0.75, unidade: '1k_chars', ia: 'ElevenLabs Flash',  desc: 'TTS Flash' },
  'elevenlabs-turbo':    { preco: 1.40, unidade: '1k_chars', ia: 'ElevenLabs Turbo',  desc: 'TTS Turbo' },
  'elevenlabs-v3':       { preco: 2.30, unidade: '1k_chars', ia: 'ElevenLabs v3',     desc: 'TTS Premium' },
  'elevenlabs-music':    { preco: 2.50, unidade: 'faixa',    ia: 'ElevenLabs Music',  desc: 'Faixa Musical' },
  'bria-generate':      { preco: 1.90, unidade: 'imagem',    ia: 'BRIA Generate',    desc: 'Gerar Imagem' },
  'bria-edit':          { preco: 1.90, unidade: 'imagem',    ia: 'BRIA Edit',        desc: 'Editar Imagem' },
  'krea-3':             { preco: 1.90, unidade: 'imagem',    ia: 'KREA 3',           desc: 'Imagem 4K' },
  'pruna-video-draft':  { preco: 0.10, unidade: 'segundo',  ia: 'Pruna Draft',      desc: 'Vídeo Draft 720p' },
  'pruna-video-padrao': { preco: 0.40, unidade: 'segundo',  ia: 'Pruna Padrão',     desc: 'Vídeo Padrão 720p' },
  'pruna-video-alta':   { preco: 0.75, unidade: 'segundo',  ia: 'Pruna Alta',       desc: 'Vídeo Alta 1080p' },
  'pruna-animate':      { preco: 0.40, unidade: 'segundo',  ia: 'Pruna Animate',    desc: 'Animação' },
  'pruna-avatar-720p':  { preco: 0.25, unidade: 'segundo',  ia: 'Pruna Avatar 720', desc: 'Avatar 720p' },
  'pruna-avatar-1080p': { preco: 0.45, unidade: 'segundo',  ia: 'Pruna Avatar 1080', desc: 'Avatar 1080p' },
  'minimax-480p':       { preco: 0.50, unidade: 'segundo',  ia: 'MiniMax 480p',     desc: 'Vídeo IA 480p' },
  'minimax-768p':       { preco: 0.75, unidade: 'segundo',  ia: 'MiniMax 768p',     desc: 'Vídeo IA 768p' },
  'minimax-2k':         { preco: 1.20, unidade: 'segundo',  ia: 'MiniMax 2K',       desc: 'Vídeo IA 2K' },
  'gemini-2.0-flash':   { preco: 0,    unidade: 'incluso',   ia: 'Gemini 2.0 Flash', desc: 'Chat (incluso)' },
  'gemini-pro':         { preco: 0,    unidade: 'incluso',   ia: 'Gemini Pro',       desc: 'Chat (incluso)' },
  'gemini-flash':       { preco: 0,    unidade: 'incluso',   ia: 'Gemini Flash',     desc: 'Chat (incluso)' },
  'grok-3':             { preco: 0,    unidade: 'incluso',   ia: 'Grok 3',           desc: 'Chat (incluso)' },
  'grok-3-mini':        { preco: 0,    unidade: 'incluso',   ia: 'Grok 3 Mini',      desc: 'Chat (incluso)' },
};

const AI_ROUTES = {
  'gemini-2.0-flash':   { provider: 'google',     key: 'GOOGLE_AI_API_KEY' },
  'gemini-pro':         { provider: 'google',     key: 'GOOGLE_AI_API_KEY' },
  'gemini-flash':       { provider: 'google',     key: 'GOOGLE_AI_API_KEY' },
  'grok-3':             { provider: 'xai',        key: 'XAI_API_KEY' },
  'grok-3-mini':        { provider: 'xai',        key: 'XAI_API_KEY' },
  'grok-tts':           { provider: 'xai_tts',    key: 'XAI_API_KEY' },
  'elevenlabs-flash':   { provider: 'elevenlabs', key: 'ELEVENLABS_FLASH_API_KEY' },
  'elevenlabs-turbo':   { provider: 'elevenlabs', key: 'ELEVENLABS_TURBO_API_KEY' },
  'elevenlabs-v3':      { provider: 'elevenlabs', key: 'ELEVENLABS_V3_API_KEY' },
  'elevenlabs-music':   { provider: 'elevenlabs', key: 'ELEVENLABS_MUSIC_API_KEY' },
  'bria-generate':      { provider: 'bria',       key: 'BRIA_FIBO_GENERATE_API_KEY' },
  'bria-edit':          { provider: 'bria',       key: 'BRIA_FIBO_EDIT_API_KEY' },
  'krea-3':             { provider: 'krea',       key: 'KREA_KREA_3_API_KEY' },
  'pruna-video-draft':  { provider: 'pruna',      key: 'PRUNA_VIDEO_API_KEY' },
  'pruna-video-padrao': { provider: 'pruna',      key: 'PRUNA_VIDEO_API_KEY' },
  'pruna-video-alta':   { provider: 'pruna',      key: 'PRUNA_VIDEO_API_KEY' },
  'pruna-animate':      { provider: 'pruna',      key: 'PRUNA_ANIMATE_API_KEY' },
  'pruna-avatar-720p':  { provider: 'pruna',      key: 'PRUNA_AVATAR_API_KEY' },
  'pruna-avatar-1080p': { provider: 'pruna',      key: 'PRUNA_AVATAR_API_KEY' },
  'minimax-480p':       { provider: 'minimax',    key: 'MINIMAX_H3_MAX_API_KEY' },
  'minimax-768p':       { provider: 'minimax',    key: 'MINIMAX_H3_MAX_API_KEY' },
  'minimax-2k':         { provider: 'minimax',    key: 'MINIMAX_H3_MAX_API_KEY' },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function bufToB64Url(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64UrlToBuf(b64) {
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function getSigningKey(env) {
  const jwk = JSON.parse(env.PRIVATE_KEY_JWK);
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

async function signMessage(key, message) {
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(message)
  );
  return bufToB64Url(sig);
}

async function verifySignature(code) {
  const parts = code.split('.');
  if (parts.length !== 3 || parts[0] !== 'ML1') return false;
  try {
    const key = await crypto.subtle.importKey(
      'jwk', PUB_KEY_JWK, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']
    );
    return await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' }, key,
      b64UrlToBuf(parts[2]), new TextEncoder().encode(`ML1.${parts[1]}`)
    );
  } catch { return false; }
}

function calcularPreco(modelo, prompt, params) {
  const p = PRECOS[modelo];
  if (!p) return { valor: 0, unidade: 'desconhecido' };
  switch (p.unidade) {
    case 'bloco':     return { valor: p.preco, unidade: 'bloco' };
    case '1k_chars':  return { valor: p.preco * Math.ceil(prompt.length / 1000), unidade: '1k chars' };
    case 'faixa':     return { valor: p.preco, unidade: 'faixa' };
    case 'imagem':    return { valor: p.preco, unidade: 'imagem' };
    case 'segundo':   return { valor: p.preco * (params.duracao || 10), unidade: 'segundo' };
    case 'incluso':   return { valor: 0, unidade: 'incluso na assinatura' };
    default:          return { valor: 0, unidade: '?' };
  }
}

async function criarPagamentoMP(request, env) {
  const { cpf, sobrenome, servico, valor } = await request.json();
  const origin = new URL(request.url).origin;
  const preco = valor || PRECO_ASSINATURA;
  const titulo = servico || 'Assinatura Mensal — Espaço Fora do Espaço';
  const preference = {
    items: [{ id: servico || 'espaco-mensal', title: titulo, quantity: 1, unit_price: preco, currency_id: 'BRL' }],
    payer: { name: sobrenome || 'Cliente', identification: { type: 'CPF', number: cpf || '' } },
    back_urls: { success: `${origin}/pagamento-sucesso`, failure: `${origin}/?pagamento=erro`, pending: `${origin}/?pagamento=pendente` },
    auto_return: 'approved',
    notification_url: `${origin}/mp/webhook`,
    metadata: { cpf, sobrenome, servico },
    external_reference: `espaco_${Date.now()}`,
  };
  const resp = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(preference),
  });
  const data = await resp.json();
  if (!resp.ok) return json({ error: 'Erro ao criar pagamento', details: data }, 500);
  return json({ init_point: data.init_point, preference_id: data.id });
}

async function webhookMP(request, env) {
  if (request.method === 'GET') return json({ status: 'ok' });
  const body = await request.json();
  const paymentId = body?.data?.id || body?.id;
  if (!paymentId) return json({ error: 'Sem payment_id' }, 400);
  const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { 'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}` },
  });
  const payment = await resp.json();
  if (payment.status === 'approved') {
    const { cpf, sobrenome } = payment.metadata || {};
    const codigo = await gerarChaveAssinada(env, { cpf, sobrenome, payment_id: paymentId });
    await env.CHAVES_USADAS.put(codigo, JSON.stringify({ status: 'gerada', payment_id: paymentId, created: Date.now() }));
    await env.CHAVES_USADAS.put(`mp_${paymentId}`, codigo);
  }
  return json({ status: 'ok' });
}

async function gerarChaveAssinada(env, { cpf, sobrenome, payment_id }) {
  const timestamp = Date.now();
  const payloadObj = { cpf, sobrenome, t: timestamp, tipo: 'uso_unico', payment_id };
  const payloadB64 = bufToB64Url(new TextEncoder().encode(JSON.stringify(payloadObj)));
  const message = `ML1.${payloadB64}`;
  const key = await getSigningKey(env);
  const signature = await signMessage(key, message);
  return `${message}.${signature}`;
}

async function gerarChave(request, env) {
  const { payment_id, cpf, sobrenome } = await request.json();
  const resp = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
    headers: { 'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}` },
  });
  const payment = await resp.json();
  if (payment.status !== 'approved')
    return json({ error: 'Pagamento não aprovado', status: payment.status }, 403);
  const existing = await env.CHAVES_USADAS.get(`mp_${payment_id}`);
  if (existing) return json({ success: true, codigo_acesso: existing });
  const codigo = await gerarChaveAssinada(env, { cpf, sobrenome, payment_id });
  await env.CHAVES_USADAS.put(codigo, JSON.stringify({ status: 'gerada', payment_id, created: Date.now() }));
  await env.CHAVES_USADAS.put(`mp_${payment_id}`, codigo);
  return json({ success: true, codigo_acesso: codigo });
}

async function validarUso(request, env) {
  const { codigo } = await request.json();
  if (!codigo) return json({ valido: false, msg: 'Código ausente' }, 400);
  const stored = await env.CHAVES_USADAS.get(codigo);
  if (stored) {
    const data = JSON.parse(stored);
    if (data.status === 'consumido')
      return json({ valido: false, msg: '✕ Esta chave já foi resgatada.' });
  }
  const isValid = await verifySignature(codigo);
  if (!isValid) return json({ valido: false, msg: '✕ Assinatura inválida ou chave falsa.' }, 403);
  await env.CHAVES_USADAS.put(codigo, JSON.stringify({ status: 'consumido', consumed: Date.now() }));
  return json({ valido: true, msg: '✓ Acesso liberado à Sala VIP e IAs!' });
}

async function proxyIA(request, env) {
  const { modelo, prompt, ...params } = await request.json();
  const route = AI_ROUTES[modelo];
  if (!route) return json({ error: `Modelo '${modelo}' não encontrado`, modelos: Object.keys(PRECOS) }, 404);
  const apiKey = env[route.key];
  if (!apiKey) return json({ error: `API key não configurada para ${modelo}` }, 500);
  const cobranca = calcularPreco(modelo, prompt, params);
  try {
    const result = await callAI(route.provider, modelo, apiKey, prompt, params);
    return json({ status: 'sucesso', modelo, resposta: result, cobranca: { valor: cobranca.valor, unidade: cobranca.unidade, descricao: PRECOS[modelo]?.desc } });
  } catch (err) { return json({ error: err.message, modelo }, 500); }
}

async function listarPrecos() {
  return json({
    assinatura: { valor: PRECO_ASSINATURA, unidade: 'mes' },
    servicos: Object.entries(PRECOS).map(([key, p]) => ({ id: key, ia: p.ia, desc: p.desc, preco: p.preco, unidade: p.unidade })),
  });
}

async function callAI(provider, model, apiKey, prompt, params) {
  switch (provider) {
    case 'google':     return callGoogleAI(model, apiKey, prompt, params);
    case 'xai':        return callXAI(model, apiKey, prompt, params);
    case 'xai_tts':    return callGrokTTS(apiKey, prompt, params);
    case 'elevenlabs': return callElevenLabs(model, apiKey, prompt, params);
    case 'bria':       return callBria(model, apiKey, prompt, params);
    case 'krea':       return callKrea(apiKey, prompt, params);
    case 'pruna':      return callPruna(model, apiKey, prompt, params);
    case 'minimax':    return callMiniMaxVideo(model, apiKey, prompt, params);
    default: throw new Error(`Provider ${provider} não implementado`);
  }
}

async function callGoogleAI(model, apiKey, prompt, params) {
  const modelMap = { 'gemini-pro': 'gemini-pro', 'gemini-flash': 'gemini-1.5-flash', 'gemini-2.0-flash': 'gemini-2.0-flash' };
  const name = modelMap[model] || model;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${name}:generateContent?key=${apiKey}`;
  const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], ...params }) });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error?.message || 'Erro Google AI');
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta';
}

async function callXAI(model, apiKey, prompt, params) {
  const resp = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], ...params }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error?.message || 'Erro xAI');
  return data.choices?.[0]?.message?.content || 'Sem resposta';
}

async function callGrokTTS(apiKey, prompt, params) {
  const resp = await fetch('https://api.x.ai/v1/audio/speech', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'grok-tts', input: prompt, voice: params.voice || 'alloy', ...params }),
  });
  if (!resp.ok) { const data = await resp.json().catch(() => ({})); throw new Error(data.error?.message || 'Erro Grok-TTS'); }
  const audioBuf = await resp.arrayBuffer();
  return { audio: bufToB64Url(audioBuf), format: 'mp3' };
}

async function callElevenLabs(model, apiKey, prompt, params) {
  if (model === 'elevenlabs-music') {
    const resp = await fetch('https://api.elevenlabs.io/v1/music', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, ...params }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.detail?.message || 'Erro ElevenLabs Music');
    return data;
  }
  const voiceId = params.voice_id || '21m00Tcm4TlvDqIKibV3';
  const modelId = model.includes('turbo') ? 'eleven_turbo_v2_5' : model.includes('flash') ? 'eleven_flash_v2_5' : 'eleven_multilingual_v3';
  const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
    body: JSON.stringify({ text: prompt, model_id: modelId, ...params }),
  });
  if (!resp.ok) { const data = await resp.json().catch(() => ({})); throw new Error(data.detail?.message || 'Erro ElevenLabs'); }
  const audioBuf = await resp.arrayBuffer();
  return { audio: bufToB64Url(audioBuf), format: 'mp3' };
}

async function callBria(model, apiKey, prompt, params) {
  const endpoint = model.includes('edit') ? 'https://api.bria.ai/v1/eraser' : 'https://api.bria.ai/v1/text-to-image';
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, ...params }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.message || 'Erro BRIA');
  return data;
}

async function callKrea(apiKey, prompt, params) {
  const resp = await fetch('https://api.krea.ai/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, ...params }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.message || 'Erro KREA');
  return data;
}

async function callPruna(model, apiKey, prompt, params) {
  let endpoint = 'https://api.pruna.ai/v1/video/generate';
  let body = { prompt, ...params };
  if (model.includes('animate')) { endpoint = 'https://api.pruna.ai/v1/animate/generate'; }
  else if (model.includes('avatar')) { endpoint = 'https://api.pruna.ai/v1/avatar/generate'; body.resolution = model.includes('1080p') ? '1080p' : '720p'; }
  else if (model.includes('draft')) { body.quality = 'draft'; body.resolution = '720p'; }
  else if (model.includes('padrao')) { body.quality = 'standard'; body.resolution = '720p'; }
  else if (model.includes('alta')) { body.quality = 'high'; body.resolution = '1080p'; }
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.message || 'Erro Pruna');
  return data;
}

async function callMiniMaxVideo(model, apiKey, prompt, params) {
  const resolution = model.includes('2k') ? '2k' : model.includes('768') ? '768p' : '480p';
  const resp = await fetch('https://api.minimaxi.com/v1/video_generation', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'video-01', prompt, resolution, ...params }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.base_resp?.status_msg || 'Erro MiniMax Video');
  return data;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
      });
    }
    const routes = {
      '/mp/criar-pagamento': { POST: () => criarPagamentoMP(request, env) },
      '/mp/webhook':         { GET: () => json({ status: 'ok' }), POST: () => webhookMP(request, env) },
      '/gerar-chave':        { POST: () => gerarChave(request, env) },
      '/validar-uso':        { POST: () => validarUso(request, env) },
      '/api/ia':             { POST: () => proxyIA(request, env) },
      '/api/precos':         { GET: () => listarPrecos() },
    };
    const route = routes[path];
    if (route && route[method]) {
      try { return await route[method](); }
      catch (err) { return json({ error: err.message }, 500); }
    }
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Endpoint não encontrado', { status: 404 });
  },
};
