const xml2js = require('xml2js');

// Dados fiscais fictícios do emitente — protótipo, nenhuma comunicação com a SEFAZ.
const EMITENTE = {
  cnpj: '12345678000195',
  razaoSocial: 'Alves Madeiras e Materiais de Construção LTDA',
  fantasia: 'Alves Madeira',
  ie: '1234567890',
  endereco: 'Av. das Indústrias, 1200 - Centro',
  municipio: 'Belo Horizonte',
  uf: 'MG',
  cep: '30110000',
  codigoUf: '31'
};

function digitoVerificador(chave43) {
  const pesos = [2, 3, 4, 5, 6, 7, 8, 9];
  let soma = 0;
  for (let i = chave43.length - 1, p = 0; i >= 0; i -= 1, p += 1) {
    soma += Number(chave43[i]) * pesos[p % pesos.length];
  }
  const resto = soma % 11;
  return resto === 0 || resto === 1 ? 0 : 11 - resto;
}

function gerarChaveAcesso({ numero, serie, emissao, codigoNumerico }) {
  const data = emissao instanceof Date ? emissao : new Date(emissao);
  const ano = String(data.getFullYear()).slice(2);
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const base = [
    EMITENTE.codigoUf,
    ano + mes,
    EMITENTE.cnpj,
    '55', // modelo NF-e
    String(serie).padStart(3, '0'),
    String(numero).padStart(9, '0'),
    '1', // tipo de emissão: normal
    String(codigoNumerico).padStart(8, '0')
  ].join('');
  return base + digitoVerificador(base);
}

function formatarChave(chave) {
  return (chave || '').replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function escapar(valor) {
  return String(valor == null ? '' : valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function gerarXml({ chave, numero, serie, emissao, destinatario, itens, total, protocolo }) {
  const data = emissao instanceof Date ? emissao : new Date(emissao);
  const itensXml = itens
    .map((item, indice) => `
      <det nItem="${indice + 1}">
        <prod>
          <cProd>${escapar(item.codigo)}</cProd>
          <xProd>${escapar(item.descricao)}</xProd>
          <NCM>${escapar(item.ncm || '00000000')}</NCM>
          <uCom>${escapar(item.unidade)}</uCom>
          <qCom>${item.quantidade.toFixed(4)}</qCom>
          <vUnCom>${item.preco_unitario.toFixed(2)}</vUnCom>
          <vProd>${(item.quantidade * item.preco_unitario).toFixed(2)}</vProd>
        </prod>
      </det>`)
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00">
  <NFe>
    <infNFe Id="NFe${chave}" versao="4.00">
      <ide>
        <cUF>${EMITENTE.codigoUf}</cUF>
        <natOp>Venda de mercadoria</natOp>
        <mod>55</mod>
        <serie>${serie}</serie>
        <nNF>${numero}</nNF>
        <dhEmi>${data.toISOString()}</dhEmi>
        <tpNF>1</tpNF>
      </ide>
      <emit>
        <CNPJ>${EMITENTE.cnpj}</CNPJ>
        <xNome>${escapar(EMITENTE.razaoSocial)}</xNome>
        <IE>${EMITENTE.ie}</IE>
        <enderEmit>
          <xLgr>${escapar(EMITENTE.endereco)}</xLgr>
          <xMun>${escapar(EMITENTE.municipio)}</xMun>
          <UF>${EMITENTE.uf}</UF>
          <CEP>${EMITENTE.cep}</CEP>
        </enderEmit>
      </emit>
      <dest>
        <CPF_CNPJ>${escapar(destinatario.documento)}</CPF_CNPJ>
        <xNome>${escapar(destinatario.nome)}</xNome>
        <enderDest>
          <xLgr>${escapar(destinatario.endereco)}</xLgr>
        </enderDest>
      </dest>${itensXml}
      <total>
        <ICMSTot>
          <vProd>${total.toFixed(2)}</vProd>
          <vNF>${total.toFixed(2)}</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <chNFe>${chave}</chNFe>
      <nProt>${protocolo}</nProt>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e (ambiente de homologacao - prototipo)</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>`;
}

function primeiro(valor) {
  if (Array.isArray(valor)) return primeiro(valor[0]);
  return valor;
}

function numero(valor) {
  const convertido = Number(primeiro(valor));
  return Number.isFinite(convertido) ? convertido : 0;
}

// Lê um XML de NF-e (layout 4.00) recebido de fornecedor e extrai o que o
// recebimento de mercadoria precisa para dar entrada no estoque.
async function lerXmlNFe(conteudo) {
  const parsed = await xml2js.parseStringPromise(conteudo, { explicitArray: true });
  const raiz = parsed.nfeProc || parsed;
  const nfe = primeiro(raiz.NFe) || raiz;
  const infNFe = primeiro(nfe.infNFe);
  if (!infNFe) {
    throw new Error('XML inválido: elemento infNFe não encontrado.');
  }

  const ide = primeiro(infNFe.ide) || {};
  const emit = primeiro(infNFe.emit) || {};
  const idAttr = (infNFe.$ && infNFe.$.Id) || '';
  const chaveProtocolo = raiz.protNFe
    ? primeiro(primeiro(raiz.protNFe).infProt || {}).chNFe
    : null;

  const dets = Array.isArray(infNFe.det) ? infNFe.det : [infNFe.det].filter(Boolean);
  const itens = dets.map((det) => {
    const prod = primeiro(det.prod) || {};
    return {
      codigo: String(primeiro(prod.cProd) || '').trim(),
      descricao: String(primeiro(prod.xProd) || '').trim(),
      ncm: String(primeiro(prod.NCM) || '').trim(),
      unidade: String(primeiro(prod.uCom) || 'UN').trim().toUpperCase(),
      quantidade: numero(prod.qCom),
      valorUnitario: numero(prod.vUnCom)
    };
  });

  const total = primeiro(primeiro(infNFe.total) ? primeiro(infNFe.total).ICMSTot : null) || {};

  return {
    chave: String(primeiro(chaveProtocolo) || idAttr.replace(/^NFe/, '')).trim(),
    numero: String(primeiro(ide.nNF) || '').trim(),
    serie: String(primeiro(ide.serie) || '1').trim(),
    emissao: String(primeiro(ide.dhEmi) || primeiro(ide.dEmi) || '').trim(),
    fornecedor: {
      cnpj: String(primeiro(emit.CNPJ) || primeiro(emit.CPF) || '').trim(),
      nome: String(primeiro(emit.xNome) || 'Fornecedor não identificado').trim()
    },
    valorTotal: numero(total.vNF) || itens.reduce((soma, i) => soma + i.quantidade * i.valorUnitario, 0),
    itens
  };
}

module.exports = { EMITENTE, gerarChaveAcesso, formatarChave, gerarXml, lerXmlNFe, digitoVerificador };
