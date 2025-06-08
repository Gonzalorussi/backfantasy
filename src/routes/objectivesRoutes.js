const express = require('express');
const router = express.Router();
const { obtenerWindowData } = require('../controllers/objectivesController');

router.get('/:gameId', obtenerWindowData);

module.exports = router;
