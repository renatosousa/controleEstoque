const db = require('./db');

const SALDO_SQL = `
  SELECT COALESCE(SUM(CASE WHEN tipo = 'saida' THEN -quantidade ELSE quantidade END), 0) AS saldo
  FROM estoque_movimentos WHERE produto_id = ?
`;

function saldoDoProduto(produtoId) {
  return db.prepare(SALDO_SQL).get(produtoId).saldo;
}

function produtosComSaldo() {
  return db
    .prepare(`
      SELECT p.*,
             COALESCE(SUM(CASE WHEN m.tipo = 'saida' THEN -m.quantidade ELSE m.quantidade END), 0) AS saldo
      FROM produtos p
      LEFT JOIN estoque_movimentos m ON m.produto_id = p.id
      GROUP BY p.id
      ORDER BY p.descricao
    `)
    .all();
}

function registrarMovimento({ produtoId, tipo, quantidade, custoUnitario = 0, documento = null, observacao = null }) {
  if (!(quantidade > 0) && tipo !== 'ajuste') {
    throw new Error('Quantidade deve ser maior que zero.');
  }
  if (tipo === 'saida' && saldoDoProduto(produtoId) < quantidade) {
    const produto = db.prepare('SELECT descricao FROM produtos WHERE id = ?').get(produtoId);
    throw new Error(`Estoque insuficiente para "${produto ? produto.descricao : produtoId}".`);
  }
  return db
    .prepare(`
      INSERT INTO estoque_movimentos (produto_id, tipo, quantidade, custo_unitario, documento, observacao)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(produtoId, tipo, quantidade, custoUnitario, documento, observacao);
}

module.exports = { saldoDoProduto, produtosComSaldo, registrarMovimento };
