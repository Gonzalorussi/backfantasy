const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();

const { getWindowData } = require('../services/objectivesService');
const { getDetails } = require('../services/detailsService');

const hl = 'en-US';

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

    if (!serieData.startTime) throw new Error('La serie no tiene startTime definido.');
    const rawStart = new Date(serieData.startTime).getTime() + 6 * 60 * 60 * 1000;
    const roundedStart = Math.floor(rawStart / 10000) * 10000; // 10s = 10000ms
    const adjustedStartTime = new Date(roundedStart).toISOString();
    //const now = new Date();
//const fixedStart = new Date(Date.UTC(
 // now.getFullYear(),
//  now.getMonth(),
//  now.getDate(),
//  4, // 01:30 ARG son 04:30 UTC
//  30,
//  0
//));
//const adjustedStartTime = fixedStart.toISOString();
    

    console.log(`\n🕒 StartingTime usado para todos los endpoints: ${adjustedStartTime}`);

    for (const game of serieData.games) {
      const { gameId, state } = game;

      if (state === 'unneeded') continue;

      console.log(`\n🎯 Procesando objetivos para gameId ${gameId}...`);
      try {
        const objData = await getWindowData(gameId, adjustedStartTime, hl);
        objectives.push(objData);
      } catch (err) {
        console.error(`❌ Error en objetivos para ${gameId}: ${err.message}`);
      }

      console.log(`\n📊 Procesando detalles para gameId ${gameId}...`);
      try {
        const detailData = await getDetails(gameId, hl, adjustedStartTime);
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
