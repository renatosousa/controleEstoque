(function () {
  // A lista de peças é a única fonte de verdade: cada linha da tabela é
  // renderizada a partir dela, então remover uma peça nunca desalinha índices.
  const pecas = [];

  const form = document.getElementById('form-peca');
  const corpo = document.getElementById('corpo-romaneio');
  const linhaVazia = document.getElementById('linha-vazia');
  const totalVolume = document.getElementById('total-volume');
  const totalValor = document.getElementById('total-valor');

  const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const volume = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  function volumeDaPeca(peca) {
    // largura e espessura são informadas em centímetros.
    return peca.comprimento * (peca.largura / 100) * (peca.espessura / 100) * peca.quantidade;
  }

  function renderizar() {
    corpo.querySelectorAll('tr[data-peca]').forEach(function (linha) { linha.remove(); });
    linhaVazia.hidden = pecas.length > 0;

    let somaVolume = 0;
    let somaValor = 0;

    pecas.forEach(function (peca, indice) {
      const cubagem = volumeDaPeca(peca);
      const valor = cubagem * peca.preco;
      somaVolume += cubagem;
      somaValor += valor;

      const linha = document.createElement('tr');
      linha.dataset.peca = String(indice);
      linha.innerHTML =
        '<td></td>' +
        '<td>' + peca.largura + ' × ' + peca.espessura + ' cm · ' + peca.comprimento + ' m</td>' +
        '<td class="text-end">' + peca.quantidade + '</td>' +
        '<td class="text-end">' + volume.format(cubagem) + '</td>' +
        '<td class="text-end">' + moeda.format(valor) + '</td>' +
        '<td class="text-end"><button type="button" class="btn btn-sm btn-outline-danger"><i class="bi bi-trash"></i></button></td>';
      linha.firstElementChild.textContent = peca.descricao;
      linha.querySelector('button').addEventListener('click', function () {
        pecas.splice(indice, 1);
        renderizar();
      });
      corpo.appendChild(linha);
    });

    totalVolume.textContent = volume.format(somaVolume) + ' m³';
    totalValor.textContent = moeda.format(somaValor);
  }

  form.addEventListener('submit', function (evento) {
    evento.preventDefault();
    const dados = new FormData(form);
    const peca = {
      descricao: String(dados.get('descricao') || '').trim(),
      comprimento: Number(dados.get('comprimento')),
      largura: Number(dados.get('largura')),
      espessura: Number(dados.get('espessura')),
      quantidade: Number(dados.get('quantidade')),
      preco: Number(dados.get('preco')) || 0
    };

    if (!peca.descricao || !(peca.comprimento > 0) || !(peca.largura > 0) || !(peca.espessura > 0) || !(peca.quantidade > 0)) {
      return;
    }

    pecas.push(peca);
    renderizar();
    form.querySelector('[name="descricao"]').focus();
  });

  renderizar();
})();
