# Alves Madeira ERP — protótipo

Protótipo navegável de um ERP para loja de material de construção: orçamento, venda,
emissão de NF-e (simulada), recebimento de mercadoria por XML e controle de estoque.
O objetivo é demonstração para o cliente — não é um sistema fiscal homologado.

## Como rodar

```bash
npm install
npm start          # http://localhost:3000
```

Na primeira execução o banco SQLite é criado em `data/erp.db` e populado com produtos,
clientes e estoque de demonstração (`npm run seed` recria a carga em um banco vazio).
Para começar do zero, apague `data/erp.db` e suba a aplicação novamente.

## Módulos

| Módulo | Rota | O que faz |
| --- | --- | --- |
| Painel | `/` | Faturamento, estoque valorizado, produtos abaixo do mínimo e últimos movimentos |
| Orçamentos | `/orcamentos` | Proposta ao cliente, aprovação/recusa e conversão em venda |
| Vendas | `/vendas` | Venda de balcão ou vinda de orçamento, com baixa de estoque e cancelamento (devolve o saldo) |
| Notas fiscais | `/notas` | DANFE em tela, download do XML e histórico de notas de saída e entrada |
| Recebimento | `/recebimento` | Importa o XML da NF-e do fornecedor e dá entrada no estoque |
| Estoque | `/estoque` | Saldos, kardex e lançamentos manuais (entrada, saída, ajuste de inventário) |
| Produtos / Clientes | `/produtos`, `/clientes` | Cadastros básicos |
| Romaneio | `/romaneio` | Cálculo de cubagem de madeira (m³) por peça |

## Regras implementadas

- O saldo de estoque é sempre derivado dos movimentos (`estoque_movimentos`), nunca de um
  campo de saldo — o kardex é a fonte da verdade.
- Venda e baixa de estoque acontecem na mesma transação: se um item não tiver saldo,
  a venda inteira é rejeitada.
- Converter um orçamento cria a venda, marca o orçamento como `convertido` e baixa o estoque.
- O recebimento cadastra automaticamente produtos que ainda não existem, atualiza o preço
  de custo dos existentes e bloqueia a reimportação da mesma chave de acesso.

## NF-e simulada

A emissão gera número sequencial, chave de acesso de 44 dígitos (com dígito verificador
módulo 11 calculado de verdade), protocolo fictício e XML no layout 4.00, exibidos como DANFE.
**Não há comunicação com a SEFAZ, certificado digital ou assinatura XML.** Para produção seria
necessário certificado A1/A3, assinatura XMLDSig e integração com os webservices da SEFAZ.

Há um XML de exemplo em `public/exemplos/nfe-entrada-exemplo.xml` para testar o recebimento
(botão "Usar XML de exemplo").

## Stack

Node.js 18+, Express 4, EJS + Bootstrap 5, SQLite (better-sqlite3), sem build de frontend.
