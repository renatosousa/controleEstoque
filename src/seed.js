const db = require('./db');

const PRODUTOS = [
  ['CIM-50', 'Cimento CP II 50kg', 'SC', '25232910', 28.9, 42.5, 40],
  ['ARE-M3', 'Areia média lavada', 'M3', '25051000', 85, 145, 10],
  ['BRI-M3', 'Brita 1', 'M3', '25171000', 95, 160, 10],
  ['TIJ-8F', 'Tijolo cerâmico 8 furos', 'MIL', '69041000', 780, 1150, 5],
  ['VER-30', 'Vergalhão CA-50 8mm 12m', 'UN', '72142000', 34.5, 52.9, 60],
  ['MAD-CX', 'Caibro de madeira 5x6 3m', 'UN', '44071100', 22.4, 38.9, 80],
  ['TEL-FC', 'Telha fibrocimento 2,44m', 'UN', '68118200', 62, 98.5, 30],
  ['ARG-AC3', 'Argamassa ACIII 20kg', 'SC', '38245000', 31, 49.9, 25],
  ['TIN-18L', 'Tinta acrílica branca 18L', 'UN', '32091010', 210, 329, 8],
  ['CAN-100', 'Cano PVC 100mm 6m', 'UN', '39172310', 58, 92, 20]
];

const CLIENTES = [
  ['Construtora Horizonte LTDA', '11222333000181', 'compras@horizonte.com.br', '(31) 3222-1010', 'Rua das Acácias, 450 - Belo Horizonte/MG'],
  ['Marcelo Ribeiro da Silva', '52398741020', 'marcelo.ribeiro@email.com', '(31) 99812-4455', 'Rua Piauí, 88 - Contagem/MG'],
  ['Reforma Fácil Engenharia', '44555666000199', 'financeiro@reformafacil.com.br', '(31) 3555-7788', 'Av. Amazonas, 2100 - Belo Horizonte/MG']
];

const FORNECEDORES = [
  ['Cimentos Minas S.A.', '98765432000155'],
  ['Depósito Areia & Brita LTDA', '33444555000166']
];

function bancoVazio() {
  return db.prepare('SELECT COUNT(*) AS total FROM produtos').get().total === 0;
}

function semear() {
  const inserirProduto = db.prepare(`
    INSERT INTO produtos (codigo, descricao, unidade, ncm, preco_custo, preco_venda, estoque_minimo)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const inserirCliente = db.prepare(`
    INSERT INTO clientes (nome, documento, email, telefone, endereco) VALUES (?, ?, ?, ?, ?)
  `);
  const inserirFornecedor = db.prepare('INSERT INTO fornecedores (nome, cnpj) VALUES (?, ?)');
  const inserirMovimento = db.prepare(`
    INSERT INTO estoque_movimentos (produto_id, tipo, quantidade, custo_unitario, documento, observacao)
    VALUES (?, 'entrada', ?, ?, 'CARGA-INICIAL', 'Estoque inicial de demonstração')
  `);

  db.transaction(() => {
    PRODUTOS.forEach((produto) => {
      const { lastInsertRowid } = inserirProduto.run(...produto);
      const estoqueMinimo = produto[6];
      // Dois produtos entram abaixo do mínimo para demonstrar o alerta de reposição.
      const fator = ['TIN-18L', 'TEL-FC'].includes(produto[0]) ? 0.5 : 4;
      inserirMovimento.run(lastInsertRowid, Math.round(estoqueMinimo * fator), produto[4]);
    });
    CLIENTES.forEach((cliente) => inserirCliente.run(...cliente));
    FORNECEDORES.forEach((fornecedor) => inserirFornecedor.run(...fornecedor));
  })();
}

function semearSeVazio() {
  if (bancoVazio()) {
    semear();
    return true;
  }
  return false;
}

module.exports = { semear, semearSeVazio, bancoVazio };

if (require.main === module) {
  semear();
  console.log('Base de demonstração criada.');
}
