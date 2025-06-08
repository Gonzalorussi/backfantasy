const axios = require('axios');

const getDetails = async (gameId, hl = 'en-US', startingTime) => {
  const url = `https://feed.lolesports.com/livestats/v1/details/${gameId}?hl=${hl}&startingTime=${startingTime}`;

  try {
    const response = await axios.get(url, {
      headers: {
        'x-api-key': process.env.LOLESPORTS_API_KEY // Si la API lo requiere
      }
    });

    // Acá podrías procesar la data o devolverla directa
    return response.data;
  } catch (error) {
    console.error('Error al obtener detalles:', error.message);
    throw error;
  }
};

module.exports = { getDetails };
