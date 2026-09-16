const express = require('express');
const db = require('../src/db');
const { produtosComSaldo, registrarMovimento } = require('../src/estoque');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('produtos/lista', {
    titulo: 'Produtos',
    produtos: produtosComSaldo(),
    aviso: req.query.ok ? 'Produto salvo com sucesso.' : null
  });
});

router.get('/novo', (req, res) => {
  res.render('produtos/form', { titulo: 'Novo produto', produto: null, erro: null });
});

router.post('/', (req, res, next) => {
  const { codigo, descricao, unidade, ncm, preco_custo: custo, preco_venda: venda, estoque_minimo: minimo, estoque_inicial: inicial } = req.body;
  try {
    const { lastInsertRowid } = db
      .prepare(`
        INSERT INTO produtos (codigo, descricao, unidade, ncm, preco_custo, preco_venda, estoque_minimo)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(codigo.trim(), descricao.trim(), (unidade || 'UN').toUpperCase(), ncm || null, Number(custo) || 0, Number(venda) || 0, Number(minimo) || 0);

    if (Number(inicial) > 0) {
      registrarMovimento({
        produtoId: lastInsertRowid,
        tipo: 'entrada',
        quantidade: Number(inicial),
        custoUnitario: Number(custo) || 0,
        documento: 'CADASTRO',
        observacao: 'Estoque inicial informado no cadastro'
      });
    }
    res.redirect('/produtos?ok=1');
  } catch (erro) {
    if (String(erro.message).includes('UNIQUE')) {
      return res.status(400).render('produtos/form', {
        titulo: 'Novo produto',
        produto: req.body,
        erro: `Já existe um produto com o código "${codigo}".`
      });
    }
    return next(erro);
  }
});

router.get('/:id/editar', (req, res, next) => {
  const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
  if (!produto) return next();
  res.render('produtos/form', { titulo: `Editar ${produto.descricao}`, produto, erro: null });
});

router.post('/:id', (req, res) => {
  const { descricao, unidade, ncm, preco_custo: custo, preco_venda: venda, estoque_minimo: minimo } = req.body;
  db.prepare(`
    UPDATE produtos SET descricao = ?, unidade = ?, ncm = ?, preco_custo = ?, preco_venda = ?, estoque_minimo = ?
    WHERE id = ?
  `).run(descricao.trim(), (unidade || 'UN').toUpperCase(), ncm || null, Number(custo) || 0, Number(venda) || 0, Number(minimo) || 0, req.params.id);
  res.redirect('/produtos?ok=1');
});

module.exports = router;
