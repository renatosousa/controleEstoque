const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(process.env.DB_FILE || path.join(dataDir, 'erp.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  documento TEXT,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS fornecedores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS produtos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  unidade TEXT NOT NULL DEFAULT 'UN',
  ncm TEXT,
  preco_custo REAL NOT NULL DEFAULT 0,
  preco_venda REAL NOT NULL DEFAULT 0,
  estoque_minimo REAL NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS estoque_movimentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada','saida','ajuste')),
  quantidade REAL NOT NULL,
  custo_unitario REAL NOT NULL DEFAULT 0,
  documento TEXT,
  observacao TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_movimentos_produto ON estoque_movimentos(produto_id);

CREATE TABLE IF NOT EXISTS orcamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero TEXT NOT NULL UNIQUE,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','aprovado','recusado','convertido')),
  validade TEXT,
  observacao TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS orcamento_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orcamento_id INTEGER NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  quantidade REAL NOT NULL,
  preco_unitario REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS vendas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero TEXT NOT NULL UNIQUE,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  orcamento_id INTEGER REFERENCES orcamentos(id),
  forma_pagamento TEXT NOT NULL DEFAULT 'dinheiro',
  status TEXT NOT NULL DEFAULT 'confirmada' CHECK (status IN ('confirmada','faturada','cancelada')),
  total REAL NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS venda_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venda_id INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  quantidade REAL NOT NULL,
  preco_unitario REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS notas_fiscais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL CHECK (tipo IN ('saida','entrada')),
  numero TEXT NOT NULL,
  serie TEXT NOT NULL DEFAULT '1',
  chave TEXT NOT NULL UNIQUE,
  venda_id INTEGER REFERENCES vendas(id),
  fornecedor_id INTEGER REFERENCES fornecedores(id),
  valor_total REAL NOT NULL DEFAULT 0,
  protocolo TEXT,
  xml TEXT,
  emitida_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
`);

module.exports = db;
