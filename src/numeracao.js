const db = require('./db');

// Numeração sequencial por documento, no formato PREFIXO-000001.
function proximoNumero(tabela, prefixo) {
  const total = db.prepare(`SELECT COUNT(*) AS total FROM ${tabela}`).get().total;
  return `${prefixo}-${String(total + 1).padStart(6, '0')}`;
}

function proximoNumeroNota(tipo) {
  const total = db.prepare('SELECT COUNT(*) AS total FROM notas_fiscais WHERE tipo = ?').get(tipo).total;
  return total + 1;
}

module.exports = { proximoNumero, proximoNumeroNota };
