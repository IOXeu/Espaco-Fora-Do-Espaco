# Sandbox gratuita e produção paga

## Separação de execução

- `templates/index.html` e as rotas Flask `/api/gerar-audio`, `/api/vozes` e `/api/beats` compõem a sandbox gratuita de áudio. Usa `edge-tts` para sintetizar a voz e FFmpeg para mixar; não usa as chaves de geração paga do Worker. `edge-tts` conecta-se a serviço externo, portanto a síntese não é estritamente local.
- `public/calculadora.html` consulta o orçamento do Worker, exibe os itens e valores, abre Checkout Pro do Mercado Pago e acompanha o pedido.
- O `worker.js` inicia geração de modelo pago somente depois de o webhook verificar o pagamento aprovado no Mercado Pago, a moeda BRL e o valor exato.
- O checkout exige sessão VIP em `X-Sessao`, secrets do provedor e bindings D1 `DB`, KV `CHAVES_USADAS` e secret `MP_ACCESS_TOKEN` no Worker.

## Cloudflare: inicialização de pedidos

Os bindings D1/KV já são declarados no `wrangler.jsonc`. Aplicar o schema no banco D1 de produção antes de habilitar checkout:

```sh
npx wrangler d1 execute <NOME_DO_BANCO> --remote --file=schema.sql
```

Confirme o nome/ID do banco antes de executar. A tabela `paid_orders` guarda os pedidos e estados para evitar geração duplicada quando o Mercado Pago repetir webhooks. Configure a URL `/mp/webhook` nas notificações do Mercado Pago caso a preferência não a associe automaticamente.

Secrets devem ser cadastrados no runtime do Worker, não em `wrangler.jsonc` ou Git. A antiga rota `/api/ia` retorna `402` para modelos cobrados; a interface Sala VIP direciona para a calculadora.

## Sandbox Docker local

Requer Docker e conectividade externa para `edge-tts`. Coloque beats/trilhas autorizados em `beats/` e suba:

```sh
docker compose up --build
```

Abra `http://localhost:8000/`. Os MP3 gerados ficam no volume Docker persistente `audio-output`; os beats locais ficam em `beats/` e são montados somente para leitura. Para produção, exponha esse serviço por HTTPS e defina `CORS_ALLOWED_ORIGINS` para origens específicas, nunca `*`. Este container da sandbox não precisa nem deve receber secrets das APIs pagas.

## Rotas da API gratuita de áudio

`POST /api/gerar-audio` recebe JSON, valida texto, voz, velocidade, nome do projeto, beat e volume, executa o pipeline e retorna `arquivo_url`. O beat é escolhido pelo nome entre os arquivos de `beats/`, e caminhos enviados pelo browser são recusados. Exemplo:

```json
{
  "texto": "Seu texto para locução",
  "projeto": "meu-rascunho",
  "voz": "francisca",
  "rate": "+10%",
  "beat": "instrumental.mp3",
  "volume_beat": 0.12
}
```

`GET /api/vozes` lista as vozes, `GET /api/beats` lista faixas que podem ser selecionadas e `GET /api/health` reporta o estado do serviço. O limite de texto é 8.000 caracteres por padrão (`MAX_AUDIO_TEXT_CHARS`). Se a interface estiver hospedada em outro domínio, configurar `AUDIO_API_BASE_URL` na instância Flask e `CORS_ALLOWED_ORIGINS` com a origem do frontend.

A `templates/index.html` é servida pelo Flask e envia os controles para o backend Python. O frontend público em Pages (`public/`) é diferente: Pages não executa Python, `edge-tts` nem FFmpeg. Para oferecer a geração de áudio a partir do site Pages, publique a sandbox Docker em um host HTTPS e configure o frontend para usar esse backend via `AUDIO_API_BASE_URL`/proxy e CORS. O arquivo `public/_routes.json` garante que as APIs do Worker sejam invocadas; o fallback mantém os arquivos estáticos.

## Calculadora e tabela de venda

A tabela vem do catálogo existente de `worker.js`, conforme os valores comerciais enviados pelo proprietário. Não são preços upstream do provedor.

- Grok TTS: R$ 0,12/bloco; ElevenLabs Flash/Turbo/v3: R$ 0,75/R$ 1,40/R$ 2,30 por 1.000 caracteres; Music v2: R$ 2,50/faixa.
- Bria Generate/Edit e Krea 3: R$ 1,90 por imagem.
- Pruna Draft: R$ 0,10/s; P-Video 720p: R$ 0,40/s; 1080p: R$ 0,75/s; Animate: R$ 0,40/s; Avatar 720p/1080p: R$ 0,25/R$ 0,45/s.
- MiniMax H3 Max: 480P R$ 0,50/s e 768P R$ 0,75/s. O preço legado de 2K permanece marcado como indisponível, porque H3 Max não aceita 2K.

Grok TTS conta um bloco por chamada; blocos, faixas e imagens permitem até 10 chamadas em lote e o servidor limita cálculo/execução à mesma quantidade. TTS ElevenLabs arredonda para cima por milhar de caracteres. Vídeo limita segundos cobrados ao intervalo 1–120 no catálogo do portal; os provedores aplicam ainda os limites técnicos próprios.

As versões e requisições verificadas estão em [REFERENCIAS_APIS.md](REFERENCIAS_APIS.md). Há duas ressalvas: a documentação atual da Bria não confirma um ID público exato “FIBO 1.5”, e MiniMax H3 Max não oferece 2K. O Worker usa os endpoints atuais da Bria sem inventar sufixo de versão e bloqueia H3 Max 2K.

## Fluxo pago e testes antes de habilitar

`POST /api/orcamento` calcula a cotação no Worker e `POST /api/paid/checkout` cria a preferência para o valor calculado no servidor. Depois de o webhook confirmar `approved`, moeda e valor, uma atualização atômica marca o pedido em processamento e a geração é disparada uma vez. `GET /api/paid/status?order_id=...` consulta o pedido. A rota direta `/api/ia` não executa modelos com preço positivo.

Antes de cobrar clientes reais: aplique `schema.sql`; cadastre tokens no Worker; faça smoke tests no ambiente de teste do Mercado Pago; teste chamadas dos provedores um por vez; confira entradas obrigatórias como imagem/áudio/vídeo para Pruna Avatar/Animate; e teste retries duplicados de webhook. Não há chamada real de provedor nem alteração remota de Cloudflare feita durante esta implementação.
