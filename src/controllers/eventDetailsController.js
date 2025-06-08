const { getEventDetails } = require('../services/eventDetailsService');

exports.obtenerEventDetails = async (req, res) => {
  try {
    const { id, hl = 'es-AR' } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Falta el parámetro id' });
    }

    const games = await getEventDetails(id, hl);
    res.status(200).json(games);
  } catch (error) {
    console.error('Error en obtenerEventDetails:', error.message);
    res.status(500).json({ error: 'Error al obtener detalles del evento' });
  }
};
