const fs = require('fs');
const path = require('path');
const readline = require('readline');
const chalk = require('chalk');
const db = require('../firebase/firebaseConfig'); // Importamos la configuración de Firestore
const { setPlayerAverageScore } = require('../firebase/firestore');  // Cambia la ruta

function prompt(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(chalk.cyan(query), (ans) => { // preguntas en cian para resaltar input
      rl.close();
      resolve(ans);
    })
  );
}

async function calcularPuntajes() {
  const ronda = await prompt('¿Número de ronda a guardar?: ');
  console.log(chalk.yellowBright(`\n🚀 Iniciando cálculo de puntajes para ronda ${ronda}...\n`));

  const gamedataPath = path.join(__dirname, '..', 'data', 'gamedata');
  const matches = fs.readdirSync(gamedataPath);

  const puntajesFinales = {};

  for (const matchFolder of matches) {
    const matchPath = path.join(gamedataPath, matchFolder);
    const playerStatsArray = require(path.join(matchPath, 'playerstats.json'));
    const objectivesArray = require(path.join(matchPath, 'objectives.json'));

    for (let i = 0; i < playerStatsArray.length; i++) {
      const playerStats = playerStatsArray[i];
      const objectives = objectivesArray[i];

      const detailFrames = playerStats.detailData?.frames;
      if (!detailFrames) continue;

      const lastFrame = detailFrames.at(-1);
      const players = lastFrame.participants;

      const participantInfo = {};
      for (const team of ['blue', 'red']) {
        for (const player of objectives.participants[team]) {
          participantInfo[player.participantId] = {
            name: player.summonerName,
            role: player.role,
            team: team,
          };
        }
      }

      console.log(chalk.magentaBright(`\n🧮 Calculando puntajes para el game: ${playerStats.gameId}\n`));

      // ... (código sin cambios para filtrar mids, bots, tops, supports)

      const mids = Object.entries(participantInfo)
        .filter(([_, info]) => info.role === 'mid')
        .map(([id, info]) => ({ ...info, participantId: Number(id) }));

      const bots = Object.entries(participantInfo)
        .filter(([_, info]) => info.role === 'bottom')
        .map(([id, info]) => ({ ...info, participantId: Number(id) }));

      const tops = Object.entries(participantInfo)
        .filter(([_, info]) => info.role === 'top')
        .map(([id, info]) => ({ ...info, participantId: Number(id) }));

      const farmMidBlue = parseFloat(await prompt(`Farm de mid ${mids.find(p => p.team === 'blue')?.name || 'Desconocido'} (blue): `));
      const farmMidRed = parseFloat(await prompt(`Farm de mid ${mids.find(p => p.team === 'red')?.name || 'Desconocido'} (red): `));
      const farmBotBlue = parseFloat(await prompt(`Farm de bot ${bots.find(p => p.team === 'blue')?.name || 'Desconocido'} (blue): `));
      const farmBotRed = parseFloat(await prompt(`Farm de bot ${bots.find(p => p.team === 'red')?.name || 'Desconocido'} (red): `));

      const gameDurationInput = await prompt('Duración del game (mm:ss): ');
      const [minutes, seconds] = gameDurationInput.split(':').map(Number);
      const gameDurationMinutes = minutes + seconds / 60;

      const supportVisionScores = {};
      const supports = Object.entries(participantInfo)
        .filter(([_, info]) => info.role === 'support')
        .map(([id, info]) => ({ ...info, participantId: Number(id) }));

      for (const support of supports) {
        const rawVisionScore = parseFloat(await prompt(`Vision score de ${support.name} (${support.team}): `));
        const visionPerMinute = rawVisionScore / gameDurationMinutes;
        supportVisionScores[support.participantId] = visionPerMinute;
      }

      const winnerInput = await prompt(`¿Quién ganó? blue o red (b/r): `);
      const winnerTeam = winnerInput.toLowerCase() === 'b' ? 'blue' : 'red';

      const gameScores = {};

      for (const p of players) {
        const info = participantInfo[p.participantId];
        if (!info) continue;

        let score = 0;
        const { kills, deaths, assists, creepScore, killParticipation, championDamageShare, totalGoldEarned } = p;
        const kda = kills + assists;

        score += kills * 1.5;
        score += assists * 1;
        score -= deaths * 1;
        score += creepScore * 0.01;

        if (killParticipation >= 0.7) score += 2;
        if (kills >= 10) score += 3;
        if (championDamageShare >= 0.2) score += 3;
        if (info.team === winnerTeam) score += 1;
        if (objectives.goldDiff >= 10000 && info.team === winnerTeam) score += 2;
        if (deaths === 0 && kda >= 5) score += 3;

        if (info.role === 'top') {
          if (championDamageShare >= 0.25) score += 2;

          const enemyTop = tops.find(t => t.team !== info.team);
          if (enemyTop) {
            const enemyStats = players.find(pl => pl.participantId === enemyTop.participantId);
            if (enemyStats && typeof totalGoldEarned === 'number' && typeof enemyStats.totalGoldEarned === 'number') {
              const diff = totalGoldEarned - enemyStats.totalGoldEarned;
              if (diff >= 2000) {
                score += 2;
              }
            } else {
              console.warn(chalk.yellow(`⚠️ No se pudo calcular diferencia de oro entre tops: ${info.name} vs ${enemyTop.name}`));
            }
          }
        }

        if (info.role === 'jungle') {
          if (killParticipation >= 0.75) score += 2;
          if (objectives.dragons >= 4 && info.team === 'blue') score += 1.5;
          if (objectives.barons?.[info.team]) score += objectives.barons[info.team] * 2;
        }

        if (info.role === 'mid') {
          if (championDamageShare >= 0.3) score += 3;
          const farm = info.team === 'blue' ? farmMidBlue : farmMidRed;
          if (farm / gameDurationMinutes >= 10) score += 1.5;
        }

        if (info.role === 'bottom') {
          const farm = info.team === 'blue' ? farmBotBlue : farmBotRed;
          if (farm / gameDurationMinutes >= 10) score += 1.5;
          const selfKills = kills;
          const enemyBot = bots.find(b => b.team !== info.team);
          const enemyStats = players.find(pl => pl.participantId === enemyBot.participantId);
          const killDiff = selfKills - enemyStats.kills;
          if (killDiff >= 5) score += 2;
        }

        if (info.role === 'support') {
          if (assists >= 10) score += 2;
          if (killParticipation >= 0.75) score += 2;
          score += supportVisionScores[p.participantId] || 0;
        }

        gameScores[info.name] = score;
        puntajesFinales[info.name] = puntajesFinales[info.name] || [];
        puntajesFinales[info.name].push(score);
      }

      console.log(chalk.greenBright(`\n📊 Puntaje game ${playerStats.gameId}:`));
      Object.entries(gameScores).forEach(([name, score]) => {
        console.log(chalk.white(`${name}: `) + chalk.green(score.toFixed(2)));
      });
    }
  }

  console.log(chalk.yellowBright(`\n🏁 Puntaje final promedio:`));

  for (const [name, scores] of Object.entries(puntajesFinales)) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    console.log(chalk.white(`${name}: `) + chalk.blueBright(avg.toFixed(2)));
    await setPlayerAverageScore(name, avg, ronda);
  }

  console.log(chalk.magentaBright('\n✨ Cálculo terminado. ¡Datos guardados correctamente!\n'));

  process.exit();
}

calcularPuntajes();
