// Chave Pública correspondente guardada no Portal HTML para validação no navegador
const PUB_KEY_JWK = {
  kty: "EC",
  crv: "P-256",
  x: "brR9UVjpg32UbdPWGrDJWUJdcV88CxlPvO8ZMVoBKEU",
  y: "qI9ONeMlrOFpwW5k5sycpyxSbSPGOxGlXj4Bi0oavRQ"
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Rota para gerar a chave única após o pagamento confirmado (Webhook do Mercado Pago)
    if (url.pathname === '/gerar-chave' && request.method === 'POST') {
      try {
        const data = await request.json();
        // Dados do comprador vindos do pagamento (ex: CPF, sobrenome, timestamp)
        const cpf = data.cpf || '00000000000';
        const sobrenome = data.sobrenome || 'Cliente';
        const timestamp = Date.now();

        // Monta o payload único
        const payloadObj = { cpf, sobrenome, t: timestamp, tipo: 'uso_unico' };
        const payloadB64 = btoa(JSON.stringify(payloadObj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
        const message = "ML1." + payloadB64;

        // Nota: No ambiente real do Worker, a chave privada ECDSA estaria em env.PRIVATE_KEY
        // Simulando a assinatura criptográfica para o exemplo:
        const enc = new TextEncoder();
        
        // Retorna o código gerado para o cliente
        return new Response(JSON.stringify({
          success: true,
          codigo_acesso: `${message}.assinatura_digital_exemplo`
        }), { headers: { 'Content-Type': 'application/json' } });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 400 });
      }
    }

    // 2. Rota para validar e CONSUMIR a chave de uso único (Evita reutilização)
    if (url.pathname === '/validar-uso' && request.method === 'POST') {
      try {
        const { codigo } = await request.json();
        if (!codigo) return new Response(JSON.stringify({ valido: false, msg: "Código ausente" }), { status: 400 });

        // Verifica se a chave já foi usada anteriormente no Cloudflare KV
        const jaFoiUsada = await env.CHAVES_USADAS.get(codigo);
        if (jaFoiUsada) {
          return new Response(JSON.stringify({ 
            valido: false, 
            msg: "✕ ERRO: Esta chave de uso único já foi resgatada anteriormente!" 
          }), { headers: { 'Content-Type': 'application/json' } });
        }

        // Marca a chave como USADA no Cloudflare KV permanentemente
        await env.CHAVES_USADAS.put(codigo, "consumido_em_" + new Date().toISOString());

        return new Response(JSON.stringify({ 
          valido: true, 
          msg: "✓ Chave validada e consumida com sucesso! Crédito liberado para geração." 
        }), { headers: { 'Content-Type': 'application/json' } });

      } catch (err) {
        return new Response(JSON.stringify({ valido: false, error: err.message }), { status: 500 });
      }
    }

    return new Response("Espaço Fora do Espaço — Worker Ativo 🚀", { status: 200 });
  }
};