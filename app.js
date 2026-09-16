const path = require('path');
const express = require('express');
const logger = require('morgan');
const expressLayouts = require('express-ejs-layouts');

const formato = require('./src/format');

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  res.locals.formato = formato;
  res.locals.caminhoAtual = req.path;
  res.locals.erro = null;
  res.locals.aviso = null;
  next();
});

app.use('/', require('./routes/index'));
app.use('/produtos', require('./routes/produtos'));
app.use('/clientes', require('./routes/clientes'));
app.use('/estoque', require('./routes/estoque'));
app.use('/orcamentos', require('./routes/orcamentos'));
app.use('/vendas', require('./routes/vendas'));
app.use('/notas', require('./routes/notas'));
app.use('/recebimento', require('./routes/recebimento'));
app.use('/romaneio', require('./routes/romaneio'));

app.use((req, res, next) => {
  const err = new Error('Página não encontrada');
  err.status = 404;
  next(err);
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).render('error', {
    titulo: `Erro ${status}`,
    status,
    mensagem: err.message,
    detalhe: app.get('env') === 'development' ? err.stack : null
  });
});

module.exports = app;
