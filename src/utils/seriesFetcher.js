const { getScheduleData } = require('../services/scheduleService');
const { getEventDetails } = require('../services/eventDetailsService');

const obtenerTodosLosGameIds = async (hl = 'en-US') => {
  console.log('🔄 Obteniendo gameIds...');
  try {
    console.log('📅 Obteniendo eventos del schedule...');
    const eventos = await getScheduleData(hl);
    console.log(`🔢 ${eventos.length} eventos encontrados`);

    const seriesConGames = [];

    for (const evento of eventos) {
      const { id, league, teams, startTime, type, state } = evento;
      console.log(`➡️ Procesando evento ${id} (${teams.join(' vs ')})`);

      try {
        const games = await getEventDetails(id, hl);
        console.log(`✅ Games obtenidos para ${id}:`, games.map(g => g.id));
        seriesConGames.push({
          serieId: id,
          league,
          teams,
          startTime,
          type,
          state,
          games
        });
      } catch (error) {
        console.warn(`❌ Falló al obtener juegos para serie ${id}:`, error.message);
      }
    }

    return seriesConGames;
  } catch (error) {
    console.error('Error al obtener los gameId de todas las series:', error.message);
    throw error;
  }
};

module.exports = { obtenerTodosLosGameIds };
