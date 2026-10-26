-- Espaço Fora do Espaço — Cloudflare D1
-- Schema necessário para o fluxo de produção paga do worker.js.
-- Não contém segredos, tokens nem dados de clientes.
-- Execução recomendada: wrangler d1 execute <database-name-or-id> --remote --file=./schema.sql

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS paid_orders (
  id                TEXT PRIMARY KEY NOT NULL,
  model             TEXT NOT NULL CHECK (length(trim(model)) > 0),
  prompt            TEXT NOT NULL CHECK (length(trim(prompt)) BETWEEN 1 AND 5000),
  params_json       TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(params_json)),
  amount_cents      INTEGER NOT NULL CHECK (amount_cents > 0),
  status            TEXT NOT NULL CHECK (status IN (
                      'creating_checkout',
                      'pending',
                      'checkout_failed',
                      'payment_mismatch',
                      'processing',
                      'submitted',
                      'completed',
                      'generation_failed'
                    )),
  mp_preference_id  TEXT,
  mp_payment_id     TEXT,
  error_message     TEXT,
  created_at        INTEGER NOT NULL CHECK (created_at > 0),
  updated_at        INTEGER CHECK (updated_at IS NULL OR updated_at > 0)
);

-- Um pagamento/preferência do Mercado Pago não pode pertencer a dois pedidos.
-- SQLite permite vários NULLs em índices UNIQUE, como desejado antes do checkout.
CREATE UNIQUE INDEX IF NOT EXISTS ux_paid_orders_mp_preference_id
  ON paid_orders(mp_preference_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_paid_orders_mp_payment_id
  ON paid_orders(mp_payment_id);

-- Consultas operacionais e suporte por estado/data e por modelo/data.
CREATE INDEX IF NOT EXISTS idx_paid_orders_status_created
  ON paid_orders(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_paid_orders_model_created
  ON paid_orders(model, created_at DESC);
