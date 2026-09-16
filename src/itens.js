function comoLista(valor) {
  if (valor === undefined || valor === null) return [];
  return Array.isArray(valor) ? valor : [valor];
}

// Lê as linhas do editor de itens (produto/quantidade/preço) enviadas pelo formulário.
function itensDoFormulario(body) {
  const produtos = comoLista(body.produto_id);
  const quantidades = comoLista(body.quantidade);
  const precos = comoLista(body.preco_unitario);

  return produtos
    .map((produtoId, indice) => ({
      produto_id: Number(produtoId),
      quantidade: Number(quantidades[indice]),
      preco_unitario: Number(precos[indice])
    }))
    .filter((item) => item.produto_id && item.quantidade > 0);
}

function totalDosItens(itens) {
  return itens.reduce((total, item) => total + item.quantidade * item.preco_unitario, 0);
}

module.exports = { itensDoFormulario, totalDosItens, comoLista };
