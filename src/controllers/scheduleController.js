const { getScheduleData } = require('../services/scheduleService');

exports.obtenerSchedule = async (req, res) => {
  try {
    const {hl} = req.query.hl || 'en-US';
    const data = await getScheduleData(hl);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error en obtenerSchedule:', error.message);
    res.status(500).json({ error: 'Error al obtener el schedule' });
  }
};
