const axios = require('axios');

const getScheduleData = async (hl = 'es-AR') => {
  const url = `https://esports-api.lolesports.com/persisted/gw/getSchedule?hl=${hl}`;
  
  try {
    const response = await axios.get(url, {
      headers: {
        'x-api-key': process.env.LOLESPORTS_API_KEY // 👈 si la API requiere auth
      }
    });
    console.log(response.data.data.schedule.events)
    const eventos = response.data?.data?.schedule?.events;

    if (!eventos || !Array.isArray(eventos)) {
      throw new Error('No se encontraron eventos en el schedule');
    }

    // Filtramos los eventos relevantes (por ejemplo, los que tienen estado upcoming o inProgress)
    const ligasPermitidas = ['LTA South', 'LTA North','LEC', 'LCK', 'LPL', 'PCS'];
    const filtrados = eventos
      .filter(e => 
        ligasPermitidas.includes(e.league?.name) && 
        e.match?.id &&
        e.state === 'completed' // <-- filtro por estado 'completed'
      )
      .map(e => ({
        id: e.match?.id,
        league: e.league?.name,
        teams: e.match?.teams?.map(t => t?.name),
        startTime: e.startTime,
        state: e.state,
        type: e.match?.type
      }));

    return filtrados;
  } catch (err) {
    console.error('Error al obtener el schedule:', err.message);
    throw err;
  }
};

module.exports = { getScheduleData };
