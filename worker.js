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
  // Valores de venda do portal fornecidos pelo proprietário; não são tarifas de custo do provedor.
  'grok-tts':            { preco: 0.12, unidade: 'bloco',     ia: 'Grok-TTS', desc: 'TTS Padrão', providerModel: null },
  'elevenlabs-flash':    { preco: 0.75, unidade: '1k_chars', ia: 'ElevenLabs Flash v2.5', desc: 'TTS Flash', providerModel: 'eleven_flash_v2_5' },
  'elevenlabs-turbo':    { preco: 1.40, unidade: '1k_chars', ia: 'ElevenLabs Turbo v2.5', desc: 'TTS Turbo', providerModel: 'eleven_turbo_v2_5' },
  'elevenlabs-v3':       { preco: 2.30, unidade: '1k_chars', ia: 'ElevenLabs v3', desc: 'TTS Premium', providerModel: 'eleven_v3' },
  'elevenlabs-music':    { preco: 2.50, unidade: 'faixa',    ia: 'ElevenLabs Music v2', desc: 'Faixa Musical', providerModel: 'music_v2' },
  // A API atual de Bria usa endpoints Fibo sem um model_id público de FIBO 1.5.
  'bria-generate':       { preco: 1.90, unidade: 'imagem',   ia: 'BRIA FIBO Generate (versão gerenciada pelo provedor)', desc: 'Gerar Imagem', providerModel: null },
  'bria-edit':           { preco: 1.90, unidade: 'imagem',   ia: 'BRIA FIBO Edit (versão gerenciada pelo provedor)', desc: 'Editar Imagem', providerModel: null },
  'krea-3':              { preco: 1.90, unidade: 'imagem',   ia: 'KREA 3', desc: 'Imagem 4K', providerModel: null },
  'pruna-video-draft':   { preco: 0.10, unidade: 'segundo', ia: 'Pruna P-Video Draft 720p', desc: 'Vídeo Draft 720p', providerModel: 'p-video' },
  'pruna-video-padrao':  { preco: 0.40, unidade: 'segundo', ia: 'Pruna P-Video 720p', desc: 'Vídeo Padrão 720p', providerModel: 'p-video' },
  'pruna-video-alta':    { preco: 0.75, unidade: 'segundo', ia: 'Pruna P-Video 1080p', desc: 'Vídeo Alta 1080p', providerModel: 'p-video' },
  'pruna-animate':       { preco: 0.40, unidade: 'segundo', ia: 'Pruna P-Video Animate', desc: 'Animação', providerModel: 'p-video-animate' },
  'pruna-avatar-720p':   { preco: 0.25, unidade: 'segundo', ia: 'Pruna P-Video Avatar 720p', desc: 'Avatar 720p', providerModel: 'p-video-avatar' },
  'pruna-avatar-1080p':  { preco: 0.45, unidade: 'segundo', ia: 'Pruna P-Video Avatar 1080p', desc: 'Avatar 1080p', providerModel: 'p-video-avatar' },
  'minimax-480p':        { preco: 0.50, unidade: 'segundo', ia: 'MiniMax H3 Max 480P', desc: 'Vídeo IA 480p', providerModel: 'MiniMax-H3-Max' },
  'minimax-768p':        { preco: 0.75, unidade: 'segundo', ia: 'MiniMax H3 Max 768P', desc: 'Vídeo IA 768p', providerModel: 'MiniMax-H3-Max' },
  // Mantido como preço de venda cadastrado, mas bloqueado: H3 Max não aceita 2K.
  'minimax-2k':          { preco: 1.20, unidade: 'segundo', ia: 'MiniMax H3 Max 2K', desc: 'Vídeo IA 2K', providerModel: 'MiniMax-H3-Max', available: false, unavailableReason: 'MiniMax H3 Max aceita 480P ou 768P, não 2K.' },
  'gemini-2.0-flash':   { preco: 0, unidade: 'incluso', ia: 'Gemini 2.0 Flash', desc: 'Chat (incluso)', providerModel: 'gemini-2.0-flash' },
  'gemini-pro':         { preco: 0, unidade: 'incluso', ia: 'Gemini Pro', desc: 'Chat (incluso)', providerModel: 'gemini-pro' },
  'gemini-flash':       { preco: 0, unidade: 'incluso', ia: 'Gemini Flash', desc: 'Chat (incluso)', providerModel: 'gemini-1.5-flash' },
  'grok-3':             { preco: 0, unidade: 'incluso', ia: 'Grok 3', desc: 'Chat (incluso)', providerModel: 'grok-3' },
  'grok-3-mini':        { preco: 0, unidade: 'incluso', ia: 'Grok 3 Mini', desc: 'Chat (incluso)', providerModel: 'grok-3-mini' },
};
const AI_ROUTES = {
  'gemini-2.0-flash':   { provider: 'google', key: 'GOOGLE_AI_API_KEY' },
  'gemini-pro':         { provider: 'google', key: 'GOOGLE_AI_API_KEY' },
  'gemini-flash':       { provider: 'google', key: 'GOOGLE_AI_API_KEY' },
  'grok-3':             { provider: 'xai', key: 'XAI_API_KEY' },
  'grok-3-mini':        { provider: 'xai', key: 'XAI_API_KEY' },
  'grok-tts':           { provider: 'xai_tts', key: 'XAI_API_KEY' },
  'elevenlabs-flash':   { provider: 'elevenlabs', key: 'ELEVENLABS_FLASH_API_KEY' },
  'elevenlabs-turbo':   { provider: 'elevenlabs', key: 'ELEVENLABS_TURBO_API_KEY' },
  'elevenlabs-v3':      { provider: 'elevenlabs', key: 'ELEVENLABS_V3_API_KEY' },
  'elevenlabs-music':   { provider: 'elevenlabs', key: 'ELEVENLABS_MUSIC_API_KEY' },
  'bria-generate':      { provider: 'bria', key: 'BRIA_FIBO_GENERATE_API_KEY' },
  'bria-edit':          { provider: 'bria', key: 'BRIA_FIBO_EDIT_API_KEY' },
  'krea-3':             { provider: 'krea', key: 'KREA_KREA_3_API_KEY' },
  'pruna-video-draft':  { provider: 'pruna', key: 'PRUNA_VIDEO_API_KEY' },
  'pruna-video-padrao': { provider: 'pruna', key: 'PRUNA_VIDEO_API_KEY' },
  'pruna-video-alta':   { provider: 'pruna', key: 'PRUNA_VIDEO_API_KEY' },
  'pruna-animate':      { provider: 'pruna', key: 'PRUNA_ANIMATE_API_KEY' },
  'pruna-avatar-720p':  { provider: 'pruna', key: 'PRUNA_AVATAR_API_KEY' },
  'pruna-avatar-1080p': { provider: 'pruna', key: 'PRUNA_AVATAR_API_KEY' },
  'minimax-480p':       { provider: 'minimax', key: 'MINIMAX_H3_MAX_API_KEY' },
  'minimax-768p':       { provider: 'minimax', key: 'MINIMAX_H3_MAX_API_KEY' },
  'minimax-2k':         { provider: 'minimax', key: 'MINIMAX_H3_MAX_API_KEY' },
};
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Sessao',
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

// ---- Sessão: prova de que a pessoa desbloqueou a Sala VIP com um código válido ----
const SESSAO_DIAS = 30; // dura como a assinatura mensal

async function criarSessao(env) {
  const exp = Date.now() + SESSAO_DIAS * 24 * 60 * 60 * 1000;
  const payloadB64 = bufToB64Url(new TextEncoder().encode(JSON.stringify({ exp })));
  const message = `ML1S.${payloadB64}`;
  const key = await getSigningKey(env);
  const signature = await signMessage(key, message);
  return `${message}.${signature}`;
}

async function verificarSessao(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'ML1S') return false;
  try {
    const { exp } = JSON.parse(new TextDecoder().decode(b64UrlToBuf(parts[1])));
    if (!exp || Date.now() > exp) return false;
    const key = await crypto.subtle.importKey(
      'jwk', PUB_KEY_JWK, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']
    );
    return await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' }, key,
      b64UrlToBuf(parts[2]), new TextEncoder().encode(`ML1S.${parts[1]}`)
    );
  } catch { return false; }
}

function calcularPreco(modelo, prompt = '', params = {}) {
  const p = PRECOS[modelo];
  if (!p) throw new Error(`Modelo '${modelo}' não encontrado`);
  if (p.available === false) throw new Error(p.unavailableReason || 'Modelo indisponível');
  const chars = [...String(prompt || '')].length;
  let quantidade = 1;
  let unidade = p.unidade;
  switch (p.unidade) {
    case 'bloco': quantidade = Math.min(10, Math.max(1, Math.floor(Number(params.blocos) || 1))); break;
    case '1k_chars': quantidade = Math.max(1, Math.ceil(chars / 1000)); unidade = '1.000 caracteres'; break;
    case 'faixa': quantidade = Math.min(10, Math.max(1, Math.floor(Number(params.quantidade) || 1))); break;
    case 'imagem': quantidade = Math.min(10, Math.max(1, Math.floor(Number(params.quantidade) || 1))); break;
    case 'segundo':
      quantidade = Math.min(120, Math.max(1, Math.ceil(Number(params.duracao) || 10)));
      unidade = 'segundo';
      break;
    case 'incluso': quantidade = 1; break;
    default: throw new Error('Unidade de cobrança não configurada');
  }
  const subtotal = Math.round((p.preco * quantidade + Number.EPSILON) * 100) / 100;
  return {
    modelo,
    provedor: p.ia,
    descricao: p.desc,
    moeda: 'BRL',
    quantidade,
    unidade,
    preco_unitario: p.preco,
    subtotal,
    total: subtotal,
    caracteres_prompt: chars,
    observacao: p.unidade === 'bloco' ? '1 bloco corresponde a uma chamada; confirme/ajuste a regra comercial se o bloco tiver outro tamanho.' : undefined,
  };
}
async function criarOrcamento(request) {
  const body = await request.json();
  if (typeof body.prompt !== 'string' || !body.prompt.trim()) return json({ error: 'Informe o prompt/texto.' }, 400);
  try { return json({ cotacao: calcularPreco(body.modelo, body.prompt, body.params || body) }); }
  catch (err) { return json({ error: err.message }, 400); }
}
async function criarCheckoutProducao(request, env) {
  if (!(await verificarSessao(request.headers.get('X-Sessao'))))
    return json({ error: 'Acesso não autorizado. Desbloqueie a Sala VIP antes de iniciar uma produção.' }, 401);
  if (!env.DB) return json({ error: 'Binding D1 DB ausente. Crie a tabela paid_orders usando schema.sql.' }, 503);
  if (!env.MP_ACCESS_TOKEN) return json({ error: 'MP_ACCESS_TOKEN não configurado.' }, 503);
  const body = await request.json();
  const { modelo, prompt } = body;
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 5000)
    return json({ error: 'Prompt vazio ou maior que 5.000 caracteres.' }, 400);
  const route = AI_ROUTES[modelo];
  if (!route || !PRECOS[modelo] || PRECOS[modelo].preco <= 0)
    return json({ error: 'Modelo não está habilitado para produção paga.' }, 400);
  if (PRECOS[modelo].available === false)
    return json({ error: PRECOS[modelo].unavailableReason || 'Modelo indisponível.' }, 400);
  if (!env[route.key]) return json({ error: `Secret ${route.key} não configurado no Worker.` }, 503);
  const params = { ...(body.params || {}) };
  params.duracao = Math.min(120, Math.max(1, Math.ceil(Number(params.duracao) || 10)));
  for (const k of ['model','model_id','messages','contents','stream']) delete params[k];
  let quote;
  try { quote = calcularPreco(modelo, prompt, params); }
  catch (err) { return json({ error: err.message }, 400); }
  if (!(quote.total > 0)) return json({ error: 'Este item não exige checkout de produção paga.' }, 400);

  const orderId = `prod_${crypto.randomUUID()}`;
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(`INSERT INTO paid_orders
    (id, model, prompt, params_json, amount_cents, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'creating_checkout', ?)`)
    .bind(orderId, modelo, prompt, JSON.stringify(params), Math.round(quote.total * 100), now).run();

  const origin = new URL(request.url).origin;
  const preference = {
    items: [{ id: modelo, title: `Produção: ${PRECOS[modelo].desc}`, quantity: 1, unit_price: quote.total, currency_id: 'BRL' }],
    external_reference: orderId,
    metadata: { type: 'paid_production', order_id: orderId, model: modelo },
    back_urls: {
      success: `${origin}/calculadora.html?payment=success&order_id=${encodeURIComponent(orderId)}`,
      failure: `${origin}/calculadora.html?payment=failure&order_id=${encodeURIComponent(orderId)}`,
      pending: `${origin}/calculadora.html?payment=pending&order_id=${encodeURIComponent(orderId)}`,
    },
    auto_return: 'approved',
    notification_url: `${origin}/mp/webhook`,
  };
  try {
    const resp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(preference),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.message || `Mercado Pago retornou ${resp.status}`);
    await env.DB.prepare(`UPDATE paid_orders SET status='pending', mp_preference_id=? WHERE id=?`)
      .bind(data.id, orderId).run();
    return json({ order_id: orderId, cotacao: quote, preference_id: data.id, checkout_url: data.init_point, sandbox_checkout_url: data.sandbox_init_point });
  } catch (err) {
    await env.DB.prepare(`UPDATE paid_orders SET status='checkout_failed' WHERE id=?`).bind(orderId).run();
    return json({ error: `Não foi possível criar o checkout: ${err.message}` }, 502);
  }
}

async function executarProducaoPaga(env, orderId, payment) {
  const order = await env.DB.prepare('SELECT * FROM paid_orders WHERE id=?').bind(orderId).first();
  if (!order || order.status !== 'pending') return;
  if (payment.status !== 'approved' || payment.currency_id !== 'BRL' || Math.round(Number(payment.transaction_amount) * 100) !== Number(order.amount_cents)) {
    await env.DB.prepare(`UPDATE paid_orders SET status='payment_mismatch', mp_payment_id=? WHERE id=? AND status='pending'`).bind(String(payment.id), orderId).run();
    return;
  }
  // Claim atomically: Mercado Pago may retry the webhook; only one invocation can win.
  const claim = await env.DB.prepare(`UPDATE paid_orders SET status='processing', mp_payment_id=? WHERE id=? AND status='pending'`)
    .bind(String(payment.id), orderId).run();
  if (!claim.meta || claim.meta.changes !== 1) return;
  try {
    const route = AI_ROUTES[order.model];
    const key = route && env[route.key];
    if (!key) throw new Error(`Secret da API ausente para ${order.model}`);
    const params = JSON.parse(order.params_json || '{}');
    const countable = ['bloco', 'faixa', 'imagem'].includes(PRECOS[order.model]?.unidade);
    const requestedCount = PRECOS[order.model]?.unidade === 'bloco' ? params.blocos : params.quantidade;
    const count = countable ? Math.min(10, Math.max(1, Math.floor(Number(requestedCount) || 1))) : 1;
    const results = await Promise.all(Array.from({ length: count }, () => callAI(route.provider, order.model, key, order.prompt, params)));
    const result = count === 1 ? results[0] : results;
    const serialized = JSON.stringify(result);
    if (serialized.length > 20_000_000) throw new Error('Resultado excede o limite de armazenamento temporário.');
    await env.CHAVES_USADAS.put(`producao_${orderId}`, serialized, { expirationTtl: 86400 });
    const status = result && (result.task_id || result.id || result.status_url || result.get_url) ? 'submitted' : 'completed';
    await env.DB.prepare(`UPDATE paid_orders SET status=?, updated_at=? WHERE id=? AND status='processing'`)
      .bind(status, Math.floor(Date.now() / 1000), orderId).run();
  } catch (err) {
    await env.DB.prepare(`UPDATE paid_orders SET status='generation_failed', error_message=?, updated_at=? WHERE id=? AND status='processing'`)
      .bind(String(err.message || 'Falha na geração').slice(0, 500), Math.floor(Date.now() / 1000), orderId).run();
  }
}

async function statusProducao(request, env) {
  if (!env.DB) return json({ error: 'Binding D1 DB ausente.' }, 503);
  const orderId = new URL(request.url).searchParams.get('order_id') || '';
  if (!/^prod_[0-9a-f-]{36}$/i.test(orderId)) return json({ error: 'order_id inválido.' }, 400);
  const order = await env.DB.prepare('SELECT id, model, amount_cents, status, created_at, updated_at, error_message FROM paid_orders WHERE id=?').bind(orderId).first();
  if (!order) return json({ error: 'Pedido não encontrado.' }, 404);
  const result = await env.CHAVES_USADAS.get(`producao_${orderId}`, 'json');
  return json({ pedido: { ...order, valor: Number(order.amount_cents) / 100 }, resultado: result || null });
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

async function webhookMP(request, env, ctx) {
  if (request.method === 'GET') return json({ status: 'ok' });
  const body = await request.json().catch(() => ({}));
  const paymentId = body?.data?.id || body?.id;
  if (!paymentId) return json({ error: 'Sem payment_id' }, 400);
  const resp = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { 'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}` },
  });
  const payment = await resp.json().catch(() => ({}));
  if (!resp.ok) return json({ error: 'Não foi possível validar o pagamento.' }, 502);
  const externalReference = String(payment.external_reference || '');
  if (externalReference.startsWith('prod_')) {
    // Pending/in-process notifications must not consume the one-time processing claim.
    if (payment.status !== 'approved') return json({ status: 'ok', payment_status: payment.status || 'unknown' });
    const orderId = externalReference;
    const runner = executarProducaoPaga(env, orderId, payment);
    if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(runner);
    else await runner;
    return json({ status: 'ok' });
  }
  if (payment.status === 'approved') {
    const codigoExistente = await env.CHAVES_USADAS.get(`mp_${payment.id}`);
    if (codigoExistente) return json({ status: 'ok', duplicado: true });
    const { cpf, sobrenome } = payment.metadata || {};
    const codigo = await gerarChaveAssinada(env, { cpf, sobrenome, payment_id: payment.id });
    await env.CHAVES_USADAS.put(codigo, JSON.stringify({ status: 'gerada', payment_id: payment.id, created: Date.now() }));
    await env.CHAVES_USADAS.put(`mp_${payment.id}`, codigo);
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
  let sessao;
  try { sessao = await criarSessao(env); }
  catch { return json({ valido: false, msg: 'Erro interno ao liberar o acesso. Sua chave NÃO foi gasta, tente de novo.' }, 500); }
  await env.CHAVES_USADAS.put(codigo, JSON.stringify({ status: 'consumido', consumed: Date.now() }));
  return json({ valido: true, msg: '✓ Acesso liberado à Sala VIP e IAs!', sessao });
}

async function proxyIA(request, env) {
  // Só quem desbloqueou a Sala VIP pode usar as IAs (protege as suas chaves e créditos)
  if (!(await verificarSessao(request.headers.get('X-Sessao')))) {
    return json({ error: 'Acesso não autorizado. Desbloqueie a Sala VIP com o seu código.' }, 401);
  }
  const { modelo, prompt, ...params } = await request.json();
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 5000) {
    return json({ error: 'Prompt vazio ou muito longo (máximo 5000 caracteres).' }, 400);
  }
  // Impede que o usuário troque o modelo (e o custo) por fora da tabela de preços
  for (const k of ['model', 'model_id', 'messages', 'contents', 'stream']) delete params[k];
  params.duracao = Math.min(Math.max(parseInt(params.duracao) || 10, 1), 120);
  const route = AI_ROUTES[modelo];
  if (!route) return json({ error: `Modelo '${modelo}' não encontrado`, modelos: Object.keys(PRECOS) }, 404);
  if (PRECOS[modelo]?.available === false) return json({ error: PRECOS[modelo].unavailableReason || 'Modelo indisponível' }, 400);
  const apiKey = env[route.key];
  if (!apiKey) return json({ error: `API key não configurada para ${modelo}` }, 500);
  if ((PRECOS[modelo]?.preco || 0) > 0) return json({ error: 'Este modelo exige orçamento e pagamento aprovado antes da geração.', checkout: '/api/paid/checkout', cotacao: '/api/orcamento' }, 402);
  let cobranca;
  try { cobranca = calcularPreco(modelo, prompt, params); } catch (err) { return json({ error: err.message }, 400); }
  try {
    const result = await callAI(route.provider, modelo, apiKey, prompt, params);
    return json({ status: 'sucesso', modelo, resposta: result, cobranca: { valor: cobranca.valor, unidade: cobranca.unidade, descricao: PRECOS[modelo]?.desc } });
  } catch (err) { return json({ error: err.message, modelo }, 500); }
}

async function listarPrecos() {
  return json({
    assinatura: { valor: PRECO_ASSINATURA, unidade: 'mes' },
    servicos: Object.entries(PRECOS).map(([key, p]) => ({ id: key, ia: p.ia, desc: p.desc, preco: p.preco, unidade: p.unidade, provider_model_id: p.providerModel, available: p.available !== false, unavailable_reason: p.unavailableReason || null })),
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
  const resp = await fetch('https://api.x.ai/v1/tts', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: prompt, language: params.language || 'pt-BR', voice_id: params.voice_id || params.voice || 'eve', speed: params.speed || 1.0 }),
  });
  if (!resp.ok) { const data = await resp.json().catch(() => ({})); throw new Error(data.error?.message || `Erro xAI TTS (${resp.status})`); }
  return { audio: bufToB64Url(await resp.arrayBuffer()), format: 'mp3' };
}
async function callElevenLabs(model, apiKey, prompt, params) {
  if (model === 'elevenlabs-music') {
    const resp = await fetch('https://api.elevenlabs.io/v1/music', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, prompt, model_id: 'music_v2' }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.detail?.message || 'Erro ElevenLabs Music');
    return data;
  }
  const voiceId = params.voice_id || '21m00Tcm4TlvDqIKibV3';
  const modelId = model.includes('turbo') ? 'eleven_turbo_v2_5' : model.includes('flash') ? 'eleven_flash_v2_5' : 'eleven_v3';
  const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
    body: JSON.stringify({ ...params, text: prompt, model_id: modelId }),
  });
  if (!resp.ok) { const data = await resp.json().catch(() => ({})); throw new Error(data.detail?.message || 'Erro ElevenLabs'); }
  const audioBuf = await resp.arrayBuffer();
  return { audio: bufToB64Url(audioBuf), format: 'mp3' };
}

async function callBria(model, apiKey, prompt, params) {
  const editing = model.includes('edit');
  const endpoint = editing
    ? 'https://engine.prod.bria-api.com/v2/image/edit'
    : 'https://engine.prod.bria-api.com/v2/image/generate';
  const body = editing
    ? { images: params.images || (params.image ? [params.image] : []), instruction: prompt, ...(params.mask ? { mask: params.mask } : {}) }
    : { prompt, ...(params.images ? { images: params.images } : {}) };
  if (!editing && params.resolution) body.resolution = params.resolution;
  if (params.aspect_ratio) body.aspect_ratio = params.aspect_ratio;
  body.sync = params.sync !== false;
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'api_token': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.message || `Erro BRIA (${resp.status})`);
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
  const catalog = PRECOS[model];
  const modelId = catalog?.providerModel;
  if (!modelId) throw new Error('Modelo Pruna não mapeado');
  let input;
  if (model.includes('avatar')) {
    if (!params.image) throw new Error('P-Video Avatar requer uma imagem de referência.');
    if (!params.voice_script && !params.audio) throw new Error('P-Video Avatar requer voice_script ou audio.');
    input = { image: params.image, ...(params.voice_script ? { voice_script: params.voice_script } : {}), ...(params.audio ? { audio: params.audio } : {}), resolution: model.includes('1080p') ? '1080p' : '720p' };
    for (const key of ['voice','voice_language','voice_prompt','video_prompt','negative_prompt','seed']) if (params[key] !== undefined) input[key] = params[key];
  } else if (model.includes('animate')) {
    if (!params.video || !params.image) throw new Error('P-Video Animate requer URL de vídeo e imagem de referência.');
    input = { video: params.video, image: params.image, ...(params.instruction_prompt ? { instruction_prompt: params.instruction_prompt } : {}), resolution: params.resolution || '720p', save_audio: params.save_audio !== false };
    for (const key of ['turbo','ignore_audio','target_fps','seed']) if (params[key] !== undefined) input[key] = params[key];
  } else {
    input = { prompt, duration: Math.min(20, Math.max(1, parseInt(params.duracao) || 5)), resolution: model.includes('1080p') || model.includes('alta') ? '1080p' : '720p' };
    for (const key of ['image','audio','aspect_ratio','seed','save_audio','last_frame_image','prompt_upsampling']) if (params[key] !== undefined) input[key] = params[key];
    if (model.includes('draft')) input.draft = true;
  }
  const resp = await fetch('https://api.pruna.ai/v1/predictions', {
    method: 'POST',
    headers: { 'apikey': apiKey, 'Model': modelId, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.message || `Erro Pruna (${resp.status})`);
  return data;
}
async function callMiniMaxVideo(model, apiKey, prompt, params) {
  const resolution = model.includes('768') ? '768P' : '480P';
  const duration = Math.min(15, Math.max(5, parseInt(params.duracao) || 5));
  const content = [{ type: 'text', text: prompt }];
  if (params.image_url) content.push({ type: 'image_url', image_url: { url: params.image_url }, role: 'first_frame' });
  const resp = await fetch('https://api.minimax.io/v2/video_generation', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'MiniMax-H3-Max', content, resolution, duration, ratio: params.ratio || '16:9' }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.base_resp?.status_msg || `Erro MiniMax H3 Max (${resp.status})`);
  return data;
}
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Sessao' },
      });
    }
    const routes = {
      '/mp/criar-pagamento': { POST: () => criarPagamentoMP(request, env) },
      '/mp/webhook':         { GET: () => webhookMP(request, env, ctx), POST: () => webhookMP(request, env, ctx) },
      '/gerar-chave':        { POST: () => gerarChave(request, env) },
      '/validar-uso':        { POST: () => validarUso(request, env) },
      '/api/ia':             { POST: () => proxyIA(request, env) },
      '/api/precos':         { GET: () => listarPrecos() },
      '/api/orcamento':      { POST: () => criarOrcamento(request) },
      '/api/paid/checkout':  { POST: () => criarCheckoutProducao(request, env) },
      '/api/paid/status':    { GET: () => statusProducao(request, env) },
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
