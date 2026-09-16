const express = require('express');
const db = require('../src/db');

const router = express.Router();

router.get('/', (req, res) => {
  const clientes = db
    .prepare(`
      SELECT c.*, COUNT(v.id) AS compras, COALESCE(SUM(v.total), 0) AS total_comprado
      FROM clientes c
      LEFT JOIN vendas v ON v.cliente_id = c.id AND v.status <> 'cancelada'
      GROUP BY c.id ORDER BY c.nome
    `)
    .all();
  res.render('clientes/lista', { titulo: 'Clientes', clientes, aviso: req.query.ok ? 'Cliente cadastrado.' : null });
});

router.get('/novo', (req, res) => {
  res.render('clientes/form', { titulo: 'Novo cliente' });
});

router.post('/', (req, res) => {
  const { nome, documento, email, telefone, endereco } = req.body;
  db.prepare('INSERT INTO clientes (nome, documento, email, telefone, endereco) VALUES (?, ?, ?, ?, ?)')
    .run(nome.trim(), documento || null, email || null, telefone || null, endereco || null);
  res.redirect('/clientes?ok=1');
});

module.exports = router;
