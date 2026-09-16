const moedaBR = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numeroBR = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });

function moeda(valor) {
  return moedaBR.format(Number(valor) || 0);
}

function quantidade(valor) {
  return numeroBR.format(Number(valor) || 0);
}

function dataHora(valor) {
  if (!valor) return '-';
  const data = new Date(String(valor).includes('T') ? valor : String(valor).replace(' ', 'T'));
  if (Number.isNaN(data.getTime())) return String(valor);
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function data(valor) {
  if (!valor) return '-';
  const d = new Date(String(valor).includes('T') ? valor : `${valor}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(valor);
  return d.toLocaleDateString('pt-BR');
}

module.exports = { moeda, quantidade, dataHora, data };
