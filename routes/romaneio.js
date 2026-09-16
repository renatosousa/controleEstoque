const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('romaneio', { titulo: 'Romaneio de madeira' });
});

module.exports = router;
