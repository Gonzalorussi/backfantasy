const fs = require('fs');
const path = require('path');
const readline = require('readline');
const axios = require('axios');
require('dotenv').config();

const hl = process.argv[2] || 'en-US';
const startingTime = process.argv[2] || '025-06-07T18:00:00Z';

const { getWindowData } = require('../services/objectivesService');
const { getDetails } = require('../services/detailsService');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('📁 Ingresá el nombre del archivo (sin .json) en /src/data/series/: ', async (filename) => {
  try {
    const filePath = path.join(__dirname, '../../src/data/series', `${filename}.json`);
    if (!fs.existsSync(filePath)) throw new Error('Archivo no encontrado');

    const rawData = fs.readFileSync(filePath);
    const serieData = JSON.parse(rawData);

    const team1 = serieData.teams[0].replace(/\s+/g, '');
    const team2 = serieData.teams[1].replace(/\s+/g, '');
    const outputDir = path.join(__dirname, `../data/gamedata/${team1}vs${team2}`);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const objectives = [];
    const playerStats = [];

    for (const game of serieData.games) {
      const gameId = game.gameId;

      console.log(`\n🎯 Procesando objetivos para gameId ${gameId}...`);
      try {
        const objData = await getWindowData(gameId, startingTime, hl);
        console.log(objData);
        objectives.push(objData);
      } catch (err) {
        console.error(`❌ Error en objetivos para ${gameId}: ${err.message}`);
      }

      console.log(`\n📊 Procesando detalles para gameId ${gameId}...`);
      try {
        const detailData = await getDetails(gameId, hl, startingTime);
        playerStats.push({ gameId, detailData });
      } catch (err) {
        console.error(`❌ Error en detalles para ${gameId}: ${err.message}`);
      }
    }

    fs.writeFileSync(path.join(outputDir, 'objectives.json'), JSON.stringify(objectives, null, 2));
    fs.writeFileSync(path.join(outputDir, 'playerstats.json'), JSON.stringify(playerStats, null, 2));

    console.log(`\n✅ ¡Proceso finalizado! Datos guardados en ${outputDir}`);
  } catch (error) {
    console.error('❌ Error en el procesamiento:', error.message);
  } finally {
    rl.close();
  }
});
