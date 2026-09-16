const express = require('express');
const db = require('../src/db');
const { produtosComSaldo } = require('../src/estoque');
const { itensDoFormulario } = require('../src/itens');
const { criarVenda, cancelarVenda, vendaCompleta } = require('../src/vendas');

const router = express.Router();

router.get('/', (req, res) => {
  const vendas = db
    .prepare(`
      SELECT v.*, c.nome AS cliente, n.numero AS nota_numero, n.id AS nota_id
      FROM vendas v
      JOIN clientes c ON c.id = v.cliente_id
      LEFT JOIN notas_fiscais n ON n.venda_id = v.id AND n.tipo = 'saida'
      ORDER BY v.id DESC
    `)
    .all();
  res.render('vendas/lista', { titulo: 'Vendas', vendas, erro: req.query.erro || null });
});

router.get('/nova', (req, res) => {
  res.render('vendas/form', {
    titulo: 'Nova venda',
    clientes: db.prepare('SELECT * FROM clientes ORDER BY nome').all(),
    produtos: produtosComSaldo()
  });
});

router.post('/', (req, res) => {
  const itens = itensDoFormulario(req.body);
  try {
    const venda = criarVenda({
      clienteId: Number(req.body.cliente_id),
      formaPagamento: req.body.forma_pagamento || 'dinheiro',
      itens
    });
    res.redirect(`/vendas/${venda.id}`);
  } catch (erro) {
    res.redirect(`/vendas?erro=${encodeURIComponent(erro.message)}`);
  }
});

router.get('/:id', (req, res, next) => {
  const venda = vendaCompleta(req.params.id);
  if (!venda) return next();
  res.render('vendas/detalhe', {
    titulo: `Venda ${venda.numero}`,
    venda,
    erro: req.query.erro || null
  });
});

router.post('/:id/cancelar', (req, res) => {
  try {
    cancelarVenda(Number(req.params.id));
    res.redirect(`/vendas/${req.params.id}`);
  } catch (erro) {
    res.redirect(`/vendas/${req.params.id}?erro=${encodeURIComponent(erro.message)}`);
  }
});

module.exports = router;
