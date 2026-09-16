const express = require('express');
const db = require('../src/db');
const { vendaCompleta } = require('../src/vendas');
const { proximoNumeroNota } = require('../src/numeracao');
const nfe = require('../src/nfe');

const router = express.Router();

router.get('/', (req, res) => {
  const notas = db
    .prepare(`
      SELECT n.*, c.nome AS cliente, f.nome AS fornecedor
      FROM notas_fiscais n
      LEFT JOIN vendas v ON v.id = n.venda_id
      LEFT JOIN clientes c ON c.id = v.cliente_id
      LEFT JOIN fornecedores f ON f.id = n.fornecedor_id
      ORDER BY n.id DESC
    `)
    .all();
  res.render('notas/lista', { titulo: 'Notas fiscais', notas, erro: req.query.erro || null });
});

// Emissão simulada: gera chave de acesso válida (com DV módulo 11), protocolo e
// XML no layout 4.00, sem qualquer comunicação com a SEFAZ.
router.post('/emitir/:vendaId', (req, res, next) => {
  const venda = vendaCompleta(req.params.vendaId);
  if (!venda) return next();
  if (venda.status === 'cancelada') {
    return res.redirect(`/vendas/${venda.id}?erro=` + encodeURIComponent('Venda cancelada não pode ser faturada.'));
  }
  if (venda.nota) {
    return res.redirect(`/notas/${venda.nota.id}`);
  }

  const emissao = new Date();
  const numero = proximoNumeroNota('saida');
  const codigoNumerico = Math.floor(Math.random() * 1e8);
  const chave = nfe.gerarChaveAcesso({ numero, serie: 1, emissao, codigoNumerico });
  const protocolo = `13125${String(Date.now()).slice(-9)}`;

  const xml = nfe.gerarXml({
    chave,
    numero,
    serie: 1,
    emissao,
    destinatario: {
      nome: venda.cliente,
      documento: venda.cliente_documento || '',
      endereco: venda.cliente_endereco || ''
    },
    itens: venda.itens,
    total: venda.total,
    protocolo
  });

  const notaId = db.transaction(() => {
    const { lastInsertRowid } = db
      .prepare(`
        INSERT INTO notas_fiscais (tipo, numero, serie, chave, venda_id, valor_total, protocolo, xml)
        VALUES ('saida', ?, '1', ?, ?, ?, ?, ?)
      `)
      .run(String(numero), chave, venda.id, venda.total, protocolo, xml);
    db.prepare("UPDATE vendas SET status = 'faturada' WHERE id = ?").run(venda.id);
    return lastInsertRowid;
  })();

  res.redirect(`/notas/${notaId}`);
});

router.get('/:id', (req, res, next) => {
  const nota = db.prepare('SELECT * FROM notas_fiscais WHERE id = ?').get(req.params.id);
  if (!nota) return next();

  const venda = nota.venda_id ? vendaCompleta(nota.venda_id) : null;
  const fornecedor = nota.fornecedor_id
    ? db.prepare('SELECT * FROM fornecedores WHERE id = ?').get(nota.fornecedor_id)
    : null;
  const itensEntrada = nota.tipo === 'entrada'
    ? db
      .prepare(`
        SELECT m.*, p.codigo, p.descricao, p.unidade
        FROM estoque_movimentos m JOIN produtos p ON p.id = m.produto_id
        WHERE m.documento = ?
      `)
      .all(`NF ${nota.numero}`)
    : [];

  res.render('notas/detalhe', {
    titulo: `NF-e ${nota.numero}`,
    nota,
    venda,
    fornecedor,
    itensEntrada,
    emitente: nfe.EMITENTE,
    chaveFormatada: nfe.formatarChave(nota.chave)
  });
});

router.get('/:id/xml', (req, res, next) => {
  const nota = db.prepare('SELECT * FROM notas_fiscais WHERE id = ?').get(req.params.id);
  if (!nota || !nota.xml) return next();
  res.type('application/xml');
  res.setHeader('Content-Disposition', `attachment; filename="${nota.chave}.xml"`);
  res.send(nota.xml);
});

module.exports = router;
