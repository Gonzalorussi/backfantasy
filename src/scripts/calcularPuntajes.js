const fs = require('fs');
const path = require('path');
const readline = require('readline');
const chalk = require('chalk');
const db = require('../firebase/firebaseConfig');
const { setPlayerAverageScore } = require('../firebase/firestore');

function prompt(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(chalk.cyan(query), (ans) => {
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
  const rondaField = `ronda${ronda}`;
  const mejoresPorRol = {
    top: { puntaje: -Infinity, valor: Infinity, jugador: null },
    jungle: { puntaje: -Infinity, valor: Infinity, jugador: null },
    mid: { puntaje: -Infinity, valor: Infinity, jugador: null },
    bottom: { puntaje: -Infinity, valor: Infinity, jugador: null },
    support: { puntaje: -Infinity, valor: Infinity, jugador: null },
  };

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
            team,
          };
        }
      }

      console.log(chalk.magentaBright(`\n🧮 Calculando puntajes para el game: ${playerStats.gameId}\n`));

      const mids = Object.entries(participantInfo).filter(([_, i]) => i.role === 'mid').map(([id, i]) => ({ ...i, participantId: Number(id) }));
      const bots = Object.entries(participantInfo).filter(([_, i]) => i.role === 'bottom').map(([id, i]) => ({ ...i, participantId: Number(id) }));
      const tops = Object.entries(participantInfo).filter(([_, i]) => i.role === 'top').map(([id, i]) => ({ ...i, participantId: Number(id) }));

      const farmMidBlue = parseFloat(await prompt(`Farm de mid ${mids.find(p => p.team === 'blue')?.name || 'Desconocido'} (blue): `));
      const farmMidRed = parseFloat(await prompt(`Farm de mid ${mids.find(p => p.team === 'red')?.name || 'Desconocido'} (red): `));
      const farmBotBlue = parseFloat(await prompt(`Farm de bot ${bots.find(p => p.team === 'blue')?.name || 'Desconocido'} (blue): `));
      const farmBotRed = parseFloat(await prompt(`Farm de bot ${bots.find(p => p.team === 'red')?.name || 'Desconocido'} (red): `));

      const [min, sec] = (await prompt('Duración del game (mm:ss): ')).split(':').map(Number);
      const gameDurationMinutes = min + sec / 60;

      const supportVisionScores = {};
      const supports = Object.entries(participantInfo).filter(([_, i]) => i.role === 'support').map(([id, i]) => ({ ...i, participantId: Number(id) }));
      for (const support of supports) {
        const raw = parseFloat(await prompt(`Vision score de ${support.name} (${support.team}): `));
        supportVisionScores[support.participantId] = raw / gameDurationMinutes;
      }

      const winnerTeam = (await prompt(`¿Quién ganó? blue o red (b/r): `)).toLowerCase() === 'b' ? 'blue' : 'red';

      const gameScores = {};

      for (const p of players) {
        const info = participantInfo[p.participantId];
        if (!info) continue;

        const { kills, deaths, assists, creepScore, killParticipation, championDamageShare, totalGoldEarned } = p;
        const kda = kills + assists;
        let score = 0;

        score += kills * 1.5 + assists * 1 - deaths * 1 + creepScore * 0.01;
        if (killParticipation >= 0.7) score += 2;
        if (kills >= 10) score += 3;
        if (championDamageShare >= 0.2) score += 3;
        if (info.team === winnerTeam) score += 1;
        if (objectives.goldDiff >= 10000 && info.team === winnerTeam) score += 2;
        if (deaths === 0 && kda >= 5) score += 3;

        if (info.role === 'top') {
          if (championDamageShare >= 0.25) score += 2;
          const enemy = tops.find(t => t.team !== info.team);
          const enemyStats = players.find(pl => pl.participantId === enemy?.participantId);
          if (enemyStats) {
            const diff = totalGoldEarned - enemyStats.totalGoldEarned;
            if (diff >= 2000) score += 2;
          }
        }

        if (info.role === 'jungle') {
          if (killParticipation >= 0.75) score += 2;
          if (objectives.dragons >= 4 && info.team === 'blue') score += 1.5;
          score += (objectives.barons?.[info.team] || 0) * 2;
        }

        if (info.role === 'mid') {
          if (championDamageShare >= 0.3) score += 3;
          const farm = info.team === 'blue' ? farmMidBlue : farmMidRed;
          if (farm / gameDurationMinutes >= 10) score += 1.5;
        }

        if (info.role === 'bottom') {
          const farm = info.team === 'blue' ? farmBotBlue : farmBotRed;
          if (farm / gameDurationMinutes >= 10) score += 1.5;
          const enemy = bots.find(b => b.team !== info.team);
          const enemyStats = players.find(pl => pl.participantId === enemy?.participantId);
          if (enemyStats && kills - enemyStats.kills >= 5) score += 2;
        }

        if (info.role === 'support') {
          if (assists >= 10) score += 2;
          if (killParticipation >= 0.75) score += 2;
          score += supportVisionScores[p.participantId] || 0;
        }

        const name = info.name;
        gameScores[name] = score;
        puntajesFinales[name] = puntajesFinales[name] || [];
        puntajesFinales[name].push(score);
      }

      console.log(chalk.greenBright(`\n📊 Puntaje game ${playerStats.gameId}:`));
      Object.entries(gameScores).forEach(([name, score]) => {
        console.log(chalk.white(`${name}: `) + chalk.green(score.toFixed(2)));
      });
    }
  }

  console.log(chalk.yellowBright(`\n🏁 Puntaje final promedio:`));
  const jugadoresPermitidosRef = db.collection("jugadorespermitidos").doc("todos");
  const snapshot = await jugadoresPermitidosRef.get();
  const dataActual = snapshot.exists ? snapshot.data() : {};

  for (const [name, scores] of Object.entries(puntajesFinales)) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    console.log(chalk.white(`${name}: `) + chalk.blueBright(avg.toFixed(2)));

    await setPlayerAverageScore(name, avg, ronda); // guarda en jugadores

    // Actualiza en jugadorespermitidos
    if (dataActual[name]) {
      if (!dataActual[name].puntajeronda) dataActual[name].puntajeronda = {};
      dataActual[name].puntajeronda[rondaField] = avg;

      // Calcular promedio torneo
      const puntajes = Object.values(dataActual[name].puntajeronda).filter(p => p > 0);
      const promedioTorneo = puntajes.length > 0 ? puntajes.reduce((a, b) => a + b, 0) / puntajes.length : 0;

      dataActual[name].promediotorneo = parseFloat(promedioTorneo.toFixed(2));

      const jugadoresRef = db.collection('jugadores');
      const querySnapshot = await jugadoresRef.where('summonername', '==', name).get();
      if (!querySnapshot.empty) {
        const playerDoc = querySnapshot.docs[0];
        await playerDoc.ref.set({
          promediopuntos: dataActual[name].promediotorneo,
        }, { merge: true });
      }

      // Evaluar para roster ideal
      /*const rol = dataActual[name].rol?.toLowerCase();
      const valor = dataActual[name].valor ?? Infinity;
      if (
        mejoresPorRol[rol] &&
        (avg > mejoresPorRol[rol].puntaje || (avg === mejoresPorRol[rol].puntaje && valor < mejoresPorRol[rol].valor))
      ) {
        mejoresPorRol[rol] = {
          puntaje: avg,
          valor,
          jugador: {
            nombre: dataActual[name].nombre ?? "",
            club: dataActual[name].club ?? "",
            rol,
            puntajeronda: avg,
            foto: dataActual[name].foto ?? "",
          },
        };
      }*/
    }
  }

  // Guardamos los puntajes en jugadorespermitidos
  await jugadoresPermitidosRef.set(dataActual);
  console.log(chalk.greenBright("\n✅ Puntajes guardados en jugadorespermitidos."));

  // Guardar roster ideal
  const rosterIdeal = {};
  Object.keys(mejoresPorRol).forEach((rol) => {
    rosterIdeal[rol] = mejoresPorRol[rol].jugador;
  });

  await db.collection("rosterideal").doc(`ronda${ronda}`).set(rosterIdeal);
  console.log(chalk.magentaBright(`\n🌟 Roster ideal de ronda ${ronda} guardado con éxito.`));

  console.log(chalk.greenBright('\n✨ Cálculo terminado. ¡Todo guardado correctamente!\n'));
  process.exit();
}

calcularPuntajes();
