const axios = require('axios');

const getEventDetails = async (id, hl = 'es-AR') => {
  const url = `https://esports-api.lolesports.com/persisted/gw/getEventDetails?id=${id}&hl=${hl}`;

  try {
    const response = await axios.get(url, {
      headers: {
        'x-api-key': process.env.LOLESPORTS_API_KEY
      }
    });

    const matches = response.data?.data?.event?.match?.games;

    if (!matches || !Array.isArray(matches)) {
      throw new Error('No se encontraron partidas en el evento');
    }

    const teamsArray = response.data.data.event.match.teams;
    const games = response.data.data.event.match.games;

     if (!games || !Array.isArray(games)) {
      throw new Error('No se encontraron partidas en el evento');
    }

    const gamesMapped = games.map(g => {
      const blueTeam = g.teams?.find(t => t.side === 'blue');
      const redTeam = g.teams?.find(t => t.side === 'red');

      const blueName = teamsArray.find(team => team.id === blueTeam?.id)?.name || null;
      const redName = teamsArray.find(team => team.id === redTeam?.id)?.name || null;
      return {
        gameId: g.id,
        state: g.state,
        teams: {
          blue: blueName,
          red: redName
        }
      };
    });

    console.log(gamesMapped);
    return gamesMapped;
  } catch (error) {
    console.error('Error en getEventDetails:', error.message);
    throw error;
  }
};

module.exports = { getEventDetails };
