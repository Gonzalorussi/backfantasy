const { getWindowData } = require('../services/objectivesService');

exports.obtenerWindowData = async (req, res) => {
  try {
    const { gameId } = req.params;
    const { startingTime } = req.query;

    if (!gameId || !startingTime) {
      return res.status(400).json({ error: 'Faltan parámetros gameId o startingTime' });
    }

    const data = await getWindowData(gameId, startingTime);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error al obtener datos del window:', error.message);
    res.status(500).json({ error: 'Error al obtener datos de window' });
  }
};
