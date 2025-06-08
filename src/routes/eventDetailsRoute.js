const express = require('express');
const router = express.Router();
const { obtenerEventDetails } = require('../controllers/eventDetailsController');

router.get('/', obtenerEventDetails);

module.exports = router;
