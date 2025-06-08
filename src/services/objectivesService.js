const axios = require('axios');

const getWindowData = async (gameId, startingTime, hl) => {
  const url = `https://feed.lolesports.com/livestats/v1/window/${gameId}?hl=${hl}&startingTime=${startingTime}`;

  try {
    const response = await axios.get(url);
    const data = response.data;
    console.log('🔎 Keys en response.data:', Object.keys(response.data));

    if (!data || !data.frames || data.frames.length === 0 || !data.gameMetadata) {
        throw new Error('No se pudo obtener metadata o frames.');
    }
    const frames = response.data?.frames || [];
    console.log(`🔍 Total de frames: ${frames.length}`);

    const objetivos = [];
    let lastBlueDragons = [];
    let lastRedDragons = [];
    let lastBlueBarons = 0;
    let lastRedBarons = 0;

    frames.forEach((frame, i) => {
      const { rfc460Timestamp, blueTeam, redTeam } = frame;

      // 🐉 Dragones
      if (blueTeam.dragons.length > lastBlueDragons.length) {
        const newDragons = blueTeam.dragons.slice(lastBlueDragons.length);
        newDragons.forEach(dragon => {
          objetivos.push({
            timestamp: rfc460Timestamp,
            type: 'DRAGON',
            subtype: dragon,
            team: 'blue'
          });
        });
        lastBlueDragons = blueTeam.dragons;
      }

      if (redTeam.dragons.length > lastRedDragons.length) {
        const newDragons = redTeam.dragons.slice(lastRedDragons.length);
        newDragons.forEach(dragon => {
          objetivos.push({
            timestamp: rfc460Timestamp,
            type: 'DRAGON',
            subtype: dragon,
            team: 'red'
          });
        });
        lastRedDragons = redTeam.dragons;
      }

      // 🐲 Barones
      if (blueTeam.barons > lastBlueBarons) {
        const nuevos = blueTeam.barons - lastBlueBarons;
        for (let i = 0; i < nuevos; i++) {
          objetivos.push({
            timestamp: rfc460Timestamp,
            type: 'BARON',
            team: 'blue'
          });
        }
        lastBlueBarons = blueTeam.barons;
      }

      if (redTeam.barons > lastRedBarons) {
        const nuevos = redTeam.barons - lastRedBarons;
        for (let i = 0; i < nuevos; i++) {
          objetivos.push({
            timestamp: rfc460Timestamp,
            type: 'BARON',
            team: 'red'
          });
        }
        lastRedBarons = redTeam.barons;
      }
    });

    const lastFrame = frames[frames.length - 1];

    const resumen = {
      gameId,
      participants: {
        blue: data.gameMetadata.blueTeamMetadata.participantMetadata,
        red: data.gameMetadata.redTeamMetadata.participantMetadata
      },
      finalStats: {
        timestamp: lastFrame.rfc460Timestamp,
        blue: {
          totalGold: lastFrame.blueTeam.totalGold,
          barons: lastFrame.blueTeam.barons,
          dragons: lastFrame.blueTeam.dragons
        },
        red: {
          totalGold: lastFrame.redTeam.totalGold,
          barons: lastFrame.redTeam.barons,
          dragons: lastFrame.redTeam.dragons
        }
      },
      objetivos
    };

    console.log(`✅ Objetivos detectados: ${objetivos.length}`);
    return resumen;
  } catch (error) {
    console.error('❌ Error en getWindowData:', error.message);
    throw error;
  }
};

module.exports = { getWindowData };
