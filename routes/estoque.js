const express = require('express');
const db = require('../src/db');
const { produtosComSaldo, registrarMovimento } = require('../src/estoque');

const router = express.Router();

router.get('/', (req, res) => {
  const produtos = produtosComSaldo();
  const movimentos = db
    .prepare(`
      SELECT m.*, p.descricao, p.unidade, p.codigo
      FROM estoque_movimentos m JOIN produtos p ON p.id = m.produto_id
      ORDER BY m.id DESC LIMIT 60
    `)
    .all();

  res.render('estoque/lista', {
    titulo: 'Estoque',
    produtos,
    movimentos,
    aviso: req.query.ok ? 'Movimento registrado.' : null,
    erro: req.query.erro || null
  });
});

router.post('/movimentos', (req, res) => {
  const { produto_id: produtoId, tipo, quantidade, observacao } = req.body;
  const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(produtoId);
  try {
    registrarMovimento({
      produtoId: Number(produtoId),
      tipo,
      quantidade: Number(quantidade),
      custoUnitario: produto ? produto.preco_custo : 0,
      documento: 'MANUAL',
      observacao: observacao || 'Lançamento manual'
    });
    res.redirect('/estoque?ok=1');
  } catch (erro) {
    res.redirect(`/estoque?erro=${encodeURIComponent(erro.message)}`);
  }
});

module.exports = router;
