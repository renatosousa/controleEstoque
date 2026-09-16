const express = require('express');
const db = require('../src/db');
const { produtosComSaldo } = require('../src/estoque');
const { proximoNumero } = require('../src/numeracao');
const { itensDoFormulario, totalDosItens } = require('../src/itens');
const { criarVenda } = require('../src/vendas');

const router = express.Router();

function orcamentoCompleto(id) {
  const orcamento = db
    .prepare(`
      SELECT o.*, c.nome AS cliente, c.documento AS cliente_documento, c.endereco AS cliente_endereco
      FROM orcamentos o JOIN clientes c ON c.id = o.cliente_id WHERE o.id = ?
    `)
    .get(id);
  if (!orcamento) return null;
  orcamento.itens = db
    .prepare(`
      SELECT oi.*, p.codigo, p.descricao, p.unidade
      FROM orcamento_itens oi JOIN produtos p ON p.id = oi.produto_id WHERE oi.orcamento_id = ?
    `)
    .all(id);
  orcamento.total = totalDosItens(orcamento.itens);
  return orcamento;
}

router.get('/', (req, res) => {
  const orcamentos = db
    .prepare(`
      SELECT o.*, c.nome AS cliente,
             (SELECT COALESCE(SUM(quantidade * preco_unitario), 0) FROM orcamento_itens WHERE orcamento_id = o.id) AS total
      FROM orcamentos o JOIN clientes c ON c.id = o.cliente_id
      ORDER BY o.id DESC
    `)
    .all();
  res.render('orcamentos/lista', {
    titulo: 'Orçamentos',
    orcamentos,
    aviso: req.query.ok ? 'Orçamento salvo.' : null,
    erro: req.query.erro || null
  });
});

router.get('/novo', (req, res) => {
  const validade = new Date();
  validade.setDate(validade.getDate() + 15);
  res.render('orcamentos/form', {
    titulo: 'Novo orçamento',
    clientes: db.prepare('SELECT * FROM clientes ORDER BY nome').all(),
    produtos: produtosComSaldo(),
    validadePadrao: validade.toISOString().slice(0, 10)
  });
});

router.post('/', (req, res, next) => {
  const { cliente_id: clienteId, validade, observacao } = req.body;
  const itens = itensDoFormulario(req.body);
  if (!itens.length) {
    return res.redirect('/orcamentos?erro=' + encodeURIComponent('Inclua ao menos um item no orçamento.'));
  }
  try {
    const numero = proximoNumero('orcamentos', 'ORC');
    const id = db.transaction(() => {
      const { lastInsertRowid } = db
        .prepare('INSERT INTO orcamentos (numero, cliente_id, validade, observacao) VALUES (?, ?, ?, ?)')
        .run(numero, clienteId, validade || null, observacao || null);
      const inserirItem = db.prepare(
        'INSERT INTO orcamento_itens (orcamento_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)'
      );
      itens.forEach((item) => inserirItem.run(lastInsertRowid, item.produto_id, item.quantidade, item.preco_unitario));
      return lastInsertRowid;
    })();
    res.redirect(`/orcamentos/${id}`);
  } catch (erro) {
    next(erro);
  }
});

router.get('/:id', (req, res, next) => {
  const orcamento = orcamentoCompleto(req.params.id);
  if (!orcamento) return next();
  res.render('orcamentos/detalhe', {
    titulo: `Orçamento ${orcamento.numero}`,
    orcamento,
    erro: req.query.erro || null
  });
});

router.post('/:id/status', (req, res) => {
  const { status } = req.body;
  if (['aberto', 'aprovado', 'recusado'].includes(status)) {
    db.prepare('UPDATE orcamentos SET status = ? WHERE id = ?').run(status, req.params.id);
  }
  res.redirect(`/orcamentos/${req.params.id}`);
});

router.post('/:id/converter', (req, res, next) => {
  const orcamento = orcamentoCompleto(req.params.id);
  if (!orcamento) return next();
  if (orcamento.status === 'convertido') {
    return res.redirect(`/orcamentos/${orcamento.id}?erro=` + encodeURIComponent('Orçamento já convertido em venda.'));
  }
  try {
    const venda = criarVenda({
      clienteId: orcamento.cliente_id,
      orcamentoId: orcamento.id,
      formaPagamento: req.body.forma_pagamento || 'dinheiro',
      itens: orcamento.itens.map((item) => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario
      }))
    });
    res.redirect(`/vendas/${venda.id}`);
  } catch (erro) {
    res.redirect(`/orcamentos/${orcamento.id}?erro=${encodeURIComponent(erro.message)}`);
  }
});

module.exports = router;
