const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const db = require('../src/db');
const { registrarMovimento } = require('../src/estoque');
const { lerXmlNFe } = require('../src/nfe');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
const XML_EXEMPLO = path.join(__dirname, '..', 'public', 'exemplos', 'nfe-entrada-exemplo.xml');

router.get('/', (req, res) => {
  const entradas = db
    .prepare(`
      SELECT n.*, f.nome AS fornecedor
      FROM notas_fiscais n LEFT JOIN fornecedores f ON f.id = n.fornecedor_id
      WHERE n.tipo = 'entrada' ORDER BY n.id DESC
    `)
    .all();
  res.render('recebimento/form', {
    titulo: 'Recebimento de mercadoria',
    entradas,
    erro: req.query.erro || null
  });
});

// Dá entrada no estoque a partir do XML da NF-e do fornecedor: cadastra produtos
// ainda inexistentes, atualiza o custo e grava um movimento por item.
router.post('/importar', upload.single('xml'), async (req, res, next) => {
  try {
    let conteudo = req.body.xml_texto && req.body.xml_texto.trim();
    if (req.file) {
      conteudo = req.file.buffer.toString('utf8');
    } else if (req.body.usar_exemplo === '1') {
      conteudo = fs.readFileSync(XML_EXEMPLO, 'utf8');
    }
    if (!conteudo) {
      throw new Error('Envie o arquivo XML da NF-e ou cole o conteúdo.');
    }

    const nota = await lerXmlNFe(conteudo);
    if (!nota.itens.length) {
      throw new Error('Nenhum item encontrado no XML.');
    }
    if (nota.chave && db.prepare('SELECT id FROM notas_fiscais WHERE chave = ?').get(nota.chave)) {
      throw new Error(`A NF-e ${nota.numero} já foi recebida anteriormente.`);
    }

    const resultado = db.transaction(() => {
      let fornecedor = db.prepare('SELECT * FROM fornecedores WHERE cnpj = ?').get(nota.fornecedor.cnpj);
      if (!fornecedor) {
        const { lastInsertRowid } = db
          .prepare('INSERT INTO fornecedores (nome, cnpj) VALUES (?, ?)')
          .run(nota.fornecedor.nome, nota.fornecedor.cnpj || null);
        fornecedor = { id: lastInsertRowid, nome: nota.fornecedor.nome };
      }

      const { lastInsertRowid: notaId } = db
        .prepare(`
          INSERT INTO notas_fiscais (tipo, numero, serie, chave, fornecedor_id, valor_total, xml)
          VALUES ('entrada', ?, ?, ?, ?, ?, ?)
        `)
        .run(nota.numero, nota.serie, nota.chave || `SEM-CHAVE-${Date.now()}`, fornecedor.id, nota.valorTotal, conteudo);

      const criados = [];
      nota.itens.forEach((item) => {
        let produto = db.prepare('SELECT * FROM produtos WHERE codigo = ?').get(item.codigo);
        if (!produto) {
          const { lastInsertRowid } = db
            .prepare(`
              INSERT INTO produtos (codigo, descricao, unidade, ncm, preco_custo, preco_venda, estoque_minimo)
              VALUES (?, ?, ?, ?, ?, ?, 0)
            `)
            .run(item.codigo, item.descricao, item.unidade, item.ncm, item.valorUnitario, Number((item.valorUnitario * 1.45).toFixed(2)));
          produto = { id: lastInsertRowid, descricao: item.descricao };
          criados.push(item.descricao);
        } else {
          db.prepare('UPDATE produtos SET preco_custo = ? WHERE id = ?').run(item.valorUnitario, produto.id);
        }

        registrarMovimento({
          produtoId: produto.id,
          tipo: 'entrada',
          quantidade: item.quantidade,
          custoUnitario: item.valorUnitario,
          documento: `NF ${nota.numero}`,
          observacao: `Recebimento - ${fornecedor.nome}`
        });
      });

      return { notaId, criados };
    })();

    res.render('recebimento/resultado', {
      titulo: 'Recebimento concluído',
      nota,
      notaId: resultado.notaId,
      criados: resultado.criados
    });
  } catch (erro) {
    if (erro instanceof Error && !erro.status) {
      return res.redirect(`/recebimento?erro=${encodeURIComponent(erro.message)}`);
    }
    return next(erro);
  }
});

module.exports = router;
