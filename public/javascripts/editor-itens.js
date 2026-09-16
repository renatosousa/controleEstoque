(function () {
  const produtos = JSON.parse(document.getElementById('dados-produtos').textContent);
  const corpo = document.querySelector('#tabela-itens tbody');
  const totalGeral = document.getElementById('total-geral');
  const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  function opcoes(selecionado) {
    return produtos
      .map(function (p) {
        const rotulo = p.codigo + ' · ' + p.descricao + ' (saldo ' + p.saldo + ' ' + p.unidade + ')';
        return '<option value="' + p.id + '"' + (p.id === selecionado ? ' selected' : '') + '>' + rotulo + '</option>';
      })
      .join('');
  }

  function recalcular() {
    let total = 0;
    corpo.querySelectorAll('tr').forEach(function (linha) {
      const quantidade = Number(linha.querySelector('.campo-quantidade').value) || 0;
      const preco = Number(linha.querySelector('.campo-preco').value) || 0;
      const subtotal = quantidade * preco;
      total += subtotal;
      linha.querySelector('.subtotal').textContent = moeda.format(subtotal);
    });
    totalGeral.textContent = moeda.format(total);
  }

  function adicionarLinha() {
    const linha = document.createElement('tr');
    linha.innerHTML =
      '<td><select name="produto_id" class="form-select form-select-sm campo-produto">' + opcoes(null) + '</select></td>' +
      '<td><input type="number" name="quantidade" class="form-control form-control-sm campo-quantidade" min="0.01" step="0.01" value="1" required></td>' +
      '<td><input type="number" name="preco_unitario" class="form-control form-control-sm campo-preco" min="0" step="0.01" value="0" required></td>' +
      '<td class="text-end subtotal">R$ 0,00</td>' +
      '<td class="text-end"><button type="button" class="btn btn-outline-danger btn-sm remover-item"><i class="bi bi-trash"></i></button></td>';
    corpo.appendChild(linha);

    const selecao = linha.querySelector('.campo-produto');
    const preco = linha.querySelector('.campo-preco');
    function aplicarPreco() {
      const produto = produtos.find(function (p) { return String(p.id) === selecao.value; });
      preco.value = produto ? produto.preco.toFixed(2) : '0';
      recalcular();
    }
    aplicarPreco();

    selecao.addEventListener('change', aplicarPreco);
    linha.querySelectorAll('input').forEach(function (campo) {
      campo.addEventListener('input', recalcular);
    });
    linha.querySelector('.remover-item').addEventListener('click', function () {
      linha.remove();
      recalcular();
    });
  }

  document.getElementById('adicionar-item').addEventListener('click', adicionarLinha);
  if (produtos.length) {
    adicionarLinha();
  }
})();
