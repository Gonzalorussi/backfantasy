const axios = require('axios');
require('dotenv').config();

const API_BASE = 'https://feed.lolesports.com/livestats/v1/details';

function getSafeStartingTimestamp() {
  const now = new Date();
  const ms = now.getTime();
  const safeMs = Math.floor((ms - 40000) / 10000) * 10000; // 30 segundos antes, múltiplo de 10
  return new Date(safeMs).toISOString();
}

exports.getGameStats = async (gameId) => {
  const startingTime = getSafeStartingTimestamp();
  const url = `${API_BASE}/${gameId}`;

  try {
    const response = await axios.get(url, {
      params: {
        hl: 'es-MX',
        startingTime,
      },
      headers: {
        'x-api-key': process.env.LOLESPORTS_API_KEY,
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Node.js)',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error al obtener stats del game:', error.response?.data || error.message);
    throw error;
  }
};
