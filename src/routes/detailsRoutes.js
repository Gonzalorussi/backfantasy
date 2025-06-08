const express = require('express');
const router = express.Router();
const { obtenerDetalles } = require('../controllers/detailsController');

router.get('/:gameId', obtenerDetalles);

module.exports = router;
