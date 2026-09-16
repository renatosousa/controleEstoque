const db = require('./db');
const { registrarMovimento } = require('./estoque');
const { proximoNumero } = require('./numeracao');
const { totalDosItens } = require('./itens');

// Confirma a venda e baixa o estoque em uma única transação: se qualquer item
// não tiver saldo, nada é gravado.
function criarVenda({ clienteId, orcamentoId = null, formaPagamento = 'dinheiro', itens }) {
  if (!itens.length) {
    throw new Error('Informe ao menos um item para a venda.');
  }
  const total = totalDosItens(itens);
  const numero = proximoNumero('vendas', 'VD');

  return db.transaction(() => {
    const { lastInsertRowid: vendaId } = db
      .prepare(`
        INSERT INTO vendas (numero, cliente_id, orcamento_id, forma_pagamento, status, total)
        VALUES (?, ?, ?, ?, 'confirmada', ?)
      `)
      .run(numero, clienteId, orcamentoId, formaPagamento, total);

    const inserirItem = db.prepare(
      'INSERT INTO venda_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)'
    );

    itens.forEach((item) => {
      inserirItem.run(vendaId, item.produto_id, item.quantidade, item.preco_unitario);
      registrarMovimento({
        produtoId: item.produto_id,
        tipo: 'saida',
        quantidade: item.quantidade,
        documento: numero,
        observacao: 'Baixa por venda'
      });
    });

    if (orcamentoId) {
      db.prepare("UPDATE orcamentos SET status = 'convertido' WHERE id = ?").run(orcamentoId);
    }

    return { id: vendaId, numero, total };
  })();
}

function cancelarVenda(vendaId) {
  const venda = db.prepare('SELECT * FROM vendas WHERE id = ?').get(vendaId);
  if (!venda) throw new Error('Venda não encontrada.');
  if (venda.status === 'cancelada') throw new Error('Venda já cancelada.');
  if (venda.status === 'faturada') throw new Error('Venda faturada: cancele a nota fiscal antes.');

  const itens = db.prepare('SELECT * FROM venda_itens WHERE venda_id = ?').all(vendaId);
  db.transaction(() => {
    itens.forEach((item) => {
      registrarMovimento({
        produtoId: item.produto_id,
        tipo: 'entrada',
        quantidade: item.quantidade,
        documento: venda.numero,
        observacao: 'Devolução por cancelamento de venda'
      });
    });
    db.prepare("UPDATE vendas SET status = 'cancelada' WHERE id = ?").run(vendaId);
  })();
}

function vendaCompleta(vendaId) {
  const venda = db
    .prepare(`
      SELECT v.*, c.nome AS cliente, c.documento AS cliente_documento, c.endereco AS cliente_endereco
      FROM vendas v JOIN clientes c ON c.id = v.cliente_id WHERE v.id = ?
    `)
    .get(vendaId);
  if (!venda) return null;
  venda.itens = db
    .prepare(`
      SELECT vi.*, p.codigo, p.descricao, p.unidade, p.ncm
      FROM venda_itens vi JOIN produtos p ON p.id = vi.produto_id WHERE vi.venda_id = ?
    `)
    .all(vendaId);
  venda.nota = db.prepare("SELECT * FROM notas_fiscais WHERE venda_id = ? AND tipo = 'saida'").get(vendaId);
  return venda;
}

module.exports = { criarVenda, cancelarVenda, vendaCompleta };
