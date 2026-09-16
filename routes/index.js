const express = require('express');
const db = require('../src/db');
const { produtosComSaldo } = require('../src/estoque');

const router = express.Router();

router.get('/', (req, res) => {
  const produtos = produtosComSaldo();
  const abaixoDoMinimo = produtos.filter((p) => p.saldo < p.estoque_minimo);
  const valorEstoque = produtos.reduce((total, p) => total + p.saldo * p.preco_custo, 0);

  const vendas = db
    .prepare(`
      SELECT v.*, c.nome AS cliente
      FROM vendas v JOIN clientes c ON c.id = v.cliente_id
      WHERE v.status <> 'cancelada'
      ORDER BY v.id DESC LIMIT 5
    `)
    .all();

  const totalVendido = db
    .prepare("SELECT COALESCE(SUM(total), 0) AS total FROM vendas WHERE status <> 'cancelada'")
    .get().total;

  const orcamentosAbertos = db
    .prepare("SELECT COUNT(*) AS total FROM orcamentos WHERE status = 'aberto'")
    .get().total;

  const notasEmitidas = db
    .prepare("SELECT COUNT(*) AS total FROM notas_fiscais WHERE tipo = 'saida'")
    .get().total;

  const movimentos = db
    .prepare(`
      SELECT m.*, p.descricao, p.unidade
      FROM estoque_movimentos m JOIN produtos p ON p.id = m.produto_id
      ORDER BY m.id DESC LIMIT 8
    `)
    .all();

  res.render('index', {
    titulo: 'Painel',
    totalProdutos: produtos.length,
    valorEstoque,
    totalVendido,
    orcamentosAbertos,
    notasEmitidas,
    abaixoDoMinimo,
    vendas,
    movimentos
  });
});

module.exports = router;
