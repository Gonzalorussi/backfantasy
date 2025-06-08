const express = require('express');
const router = express.Router();
const { obtenerSchedule } = require('../controllers/scheduleController');

router.get('/', obtenerSchedule);

module.exports = router;

