const { getDetails } = require('../services/detailsService');

exports.obtenerDetalles = async (req, res) => {
  const { gameId } = req.params;
  const { hl = 'en-US', startingTime } = req.query;

  if (!gameId || !startingTime) {
    return res.status(400).json({ error: 'Faltan parámetros: gameId o startingTime' });
  }

  try {
    const detalles = await getDetails(gameId, hl, startingTime);
    res.status(200).json(detalles);
  } catch (error) {
    console.error('Error en obtenerDetalles:', error.message);
    res.status(500).json({ error: 'Error al obtener detalles del juego' });
  }
};
