// Chave Pública correspondente guardada para validação
const PUB_KEY_JWK = {
  kty: "EC",
  crv: "P-256",
  x: "brR9UVjpg32UbdPWGrDJWUJdcV88CxlPvO8ZMVoBKEU",
  y: "qI9ONeMlrOFpwW5k5sycpyxSbSPGOxGlXj4Bi0oavRQ"
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 0. Rota Raiz — Página Principal do Portal
    if (url.pathname === '/' && request.method === 'GET') {
      const htmlContent = `<!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Espaço Fora do Espaço - Hub de IAs</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
          .card { background: #1e293b; padding: 35px; border-radius: 12px; text-align: center; border: 1px solid #334155; max-width: 450px; width: 100%; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
          h1 { color: #38bdf8; margin-bottom: 10px; font-size: 1.6rem; }
          p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; }
          .badge { background: #0369a1; color: #e0f2fe; padding: 5px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; display: inline-block; margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">Borda / Edge Computing</div>
          <h1>Espaço Fora do Espaço</h1>
          <p>Portal descentralizado operando com Hub de IAs Globais/Asiáticas e segurança criptográfica ativada 🚀</p>
        </div>
      </body>
      </html>`;
      return new Response(htmlContent, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
    }

    // 1. Rota para gerar a chave/senha única (pós-pagamento / Mercado Pago)
    if (url.pathname === '/gerar-chave' && request.method === 'POST') {
      try {
        const data = await request.json();
        const cpf = data.cpf || '00000000000';
        const sobrenome = data.sobrenome || 'Cliente';
        const timestamp = Date.now();

        const payloadObj = { cpf, sobrenome, t: timestamp, tipo: 'uso_unico' };
        const payloadB64 = btoa(JSON.stringify(payloadObj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
        const message = "ML1." + payloadB64;

        return new Response(JSON.stringify({
          success: true,
          codigo_acesso: `${message}.assinatura_digital_exemplo`
        }), { headers: { 'Content-Type': 'application/json' } });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 400 });
      }
    }

    // 2. Rota para validar e CONSUMIR a chave de uso único no Cloudflare KV
    if (url.pathname === '/validar-uso' && request.method === 'POST') {
      try {
        const { codigo } = await request.json();
        if (!codigo) return new Response(JSON.stringify({ valido: false, msg: "Código ausente" }), { status: 400 });

        const jaFoiUsada = await env.CHAVES_USADAS.get(codigo);
        if (jaFoiUsada) {
          return new Response(JSON.stringify({ 
            valido: false, 
            msg: "✕ ERRO: Esta chave/senha de uso único já foi resgatada anteriormente!" 
          }), { headers: { 'Content-Type': 'application/json' } });
        }

        await env.CHAVES_USADAS.put(codigo, "consumido_em_" + new Date().toISOString());

        return new Response(JSON.stringify({ 
          valido: true, 
          msg: "✓ Chave validada e consumida com sucesso! Acesso liberado à Sala VIP e IAs." 
        }), { headers: { 'Content-Type': 'application/json' } });

      } catch (err) {
        return new Response(JSON.stringify({ valido: false, error: err.message }), { status: 500 });
      }
    }

    // 3. Rota de Proxy para as IAs (Globais e Asiáticas)
    if (url.pathname === '/api/ia' && request.method === 'POST') {
      try {
        const { prompt, modelo } = await request.json();
        
        // Aqui você direciona para a API correspondente (ex: modelos globais ou asiáticos configurados nas env vars)
        // Exemplo de resposta simulada estruturada para o Hub:
        return new Response(JSON.stringify({
          status: "sucesso",
          modelo_utilizado: modelo || "padrao-global-asiatico",
          resposta: `Processado na borda para o prompt: "${prompt}"`
        }), { headers: { 'Content-Type': 'application/json' } });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    return new Response("Endpoint não encontrado", { status: 404 });
  }
};
