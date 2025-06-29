const admin = require('firebase-admin');
const chalk = require('chalk');

const serviceAccount = require('../keys/msifantasy-firebase-adminsdk-fbsvc-a482e744c9.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error(chalk.red('⚠️  Debes indicar el número de ronda a procesar.'));
  process.exit(1);
}

const numeroRonda = parseInt(args[0]);
const verbose = args.includes('verbose');

console.log('Args:', args);
console.log('numeroRonda:', numeroRonda);
console.log('Ronda key:', `rankingronda${numeroRonda}`);

if (isNaN(numeroRonda) || numeroRonda < 1 || numeroRonda > 12) {
  console.error(chalk.red('⚠️  El número de ronda debe estar entre 1 y 9.'));
  process.exit(1);
}

const rondaKey = `ronda${numeroRonda}`;
const rondaPuntosKey = `ronda${numeroRonda}Puntos`;
const rondaPuntosJugadoresKey = `ronda${numeroRonda}PuntosJugadores`;
const rondasPuntosKeys = Array.from({ length: 9 }, (_, i) => `ronda${i + 1}Puntos`);

const rostersSinRosterConfirmado = [];
const rostersSinEquipo = [];

async function calcularPuntajeRonda() {
  const rostersSnap = await db.collection('rosters').get();

  let rostersProcesados = 0;
  let rostersSaltados = 0;
  let rostersRecovery = 0;
  let jugadoresNoEncontrados = 0;

  for (const rosterDoc of rostersSnap.docs) {
    const rosterData = rosterDoc.data();

    // Ya no validamos si existe rondaXPuntos en rosters, porque no lo vamos a guardar más ahí
    const rondaConfirmada = rosterData[rondaKey];
    if (!rondaConfirmada) {
      rostersSinRosterConfirmado.push(rosterData.userid);
      console.log(chalk.yellow(`⚠️ ${rosterData.userid} no tiene roster confirmado en ${rondaKey}. Puntaje 0 asignado en equipos.`));

      // Aún así actualizamos en equipos con 0
      const equiposSnap = await db.collection('equipos').where('userid', '==', rosterData.userid).get();
      if (!equiposSnap.empty) {
        const equipoDoc = equiposSnap.docs[0];
        const equipoData = equipoDoc.data();

        const puntajeAnterior = equipoData.puntajesronda?.[rondaKey] || 0;
        const totalActual = equipoData.totalpuntos || 0;
        const nuevoPuntaje = 0;

        await db.collection('equipos').doc(equipoDoc.id).update({
          [`puntajesronda.${rondaKey}`]: nuevoPuntaje,
          totalpuntos: totalActual - puntajeAnterior + nuevoPuntaje
          });

        console.log(chalk.cyan(`📊 Equipo ${equipoData.nombreequipo} actualizado con 0.`));
      }else{
        rostersSinEquipo.push(rosterData.userid);
        console.log(chalk.red(`❌ No se encontró equipo para userid ${rosterData.userid}, se omite.`));
        continue;
      }

      rostersSaltados++;
      console.log(chalk.gray(`🛑 ${rosterData.userid} omitido del ranking por falta de roster confirmado.`));
      continue;
    }

    let puntajeTotalRonda = 0;
    const roles = ['top', 'jungle', 'mid', 'bottom', 'support'];

    const updateRonda = {};

    for (const rol of roles) {
      const jugador = rondaConfirmada[rol];
      if (jugador) {
        const jugadorDoc = await db.collection('jugadores').doc(jugador.id).get();
        if (jugadorDoc.exists) {
          const jugadorData = jugadorDoc.data();
          const puntajeJugador = jugadorData?.puntajeronda?.[rondaKey] || 0;
          puntajeTotalRonda += puntajeJugador;

          updateRonda[`${rondaKey}.${rol}.puntos`] = puntajeJugador;

          if (verbose) console.log(chalk.green(`✅ ${jugador.nombre} (${rol}): ${puntajeJugador}`));
        } else {
          console.log(chalk.red(`❌ Jugador no encontrado: ${jugador.id} (${jugador.nombre})`));
          jugadoresNoEncontrados++;

          updateRonda[`${rondaKey}.${rol}.puntos`] = 0;
        }
      }
    }

    // Solo actualizamos el roster con los puntajes individuales de cada jugador
    await db.collection('rosters').doc(rosterDoc.id).update(updateRonda);

    console.log(chalk.green(`✅ ${rosterData.userid} - ${rondaKey}: ${puntajeTotalRonda}`));
    rostersProcesados++;

    // --- Actualizamos el documento de equipos ---
    const equiposSnap = await db.collection('equipos').where('usuarioid', '==', rosterData.userid).get();
    if (!equiposSnap.empty) {
      const equipoDoc = equiposSnap.docs[0];
      const equipoData = equipoDoc.data();

      const puntajeAnterior = equipoData.puntajesronda?.[rondaKey] || 0;
      const totalActual = equipoData.totalpuntos || 0;
      const nuevoPuntaje = puntajeTotalRonda;

      await db.collection('equipos').doc(equipoDoc.id).update({
        [`puntajesronda.${rondaKey}`]: nuevoPuntaje,
        totalpuntos: totalActual - puntajeAnterior + nuevoPuntaje
      });

      console.log(chalk.cyan(`📊 Equipo ${equipoData.nombreequipo} actualizado.`));
    } else {
      console.log(chalk.red(`❌ No se encontró equipo para userid ${rosterData.userid}`));
    }
  }

  if (rostersSinRosterConfirmado.length > 0) {
    console.log(chalk.yellow(`\n📋 Los siguientes equipos aún NO CONFIRMARON su roster:`));
    console.log(chalk.yellow(rostersSinRosterConfirmado.join(', ')));
  }
  if (rostersSinEquipo.length > 0) {
    console.log(chalk.red(`\n📋 No se encontró equipo para los siguientes ${rostersSinEquipo.length} rosters:`));

  const chunkSize = 5;
  for (let i = 0; i < rostersSinEquipo.length; i += chunkSize) {
    const chunk = rostersSinEquipo.slice(i, i + chunkSize);
    console.log(chalk.red('  🔸 ' + chunk.join(', ')));
  }
  }

  console.log(chalk.blue(`🎯 Puntajes de ronda ${rondaKey} calculados para ${rostersProcesados} rosters.`));
  console.log(chalk.yellow(`⚠️ ${rostersSaltados} rosters no tenían roster confirmado.`));
  console.log(chalk.red(`❌ ${jugadoresNoEncontrados} jugadores no fueron encontrados en la colección.`));
}

/*async function calcularTotales() {
  const rostersSnap = await db.collection('rosters').get();

  let rostersProcesados = 0;

  for (const rosterDoc of rostersSnap.docs) {
    const rosterData = rosterDoc.data();

    let total = 0;
    rondasPuntosKeys.forEach(ronda => {
      total += rosterData[ronda] || 0;
    });

    await db.collection('rosters').doc(rosterDoc.id).update({
      totalPuntos: total,
      lastScoreUpdate: admin.firestore.FieldValue.serverTimestamp()
    });

    if (verbose) console.log(chalk.green(`🏅 ${rosterData.userid} - Total acumulado: ${total}`));
    rostersProcesados++;
  }

  console.log(chalk.blue(`🎯 Totales acumulados actualizados para ${rostersProcesados} rosters.`));
}*/

async function generarRankings() {
  // Obtener ranking equipos para la ronda
  const rankingRondaSnap = await db
    .collection('equipos')
    .orderBy(`puntajesronda.ronda${numeroRonda}`, 'desc')
    .get();

  const rankingRonda = [];

  for (const docSnap of rankingRondaSnap.docs) {
  const data = docSnap.data();
  const puntosRonda = data.puntajesronda?.[`ronda${numeroRonda}`];

  if (puntosRonda !== undefined && data.nombreequipo) {
    rankingRonda.push({
      id: docSnap.id,
      nombreequipo: data.nombreequipo,
      usuarioid: data.usuarioid,
      puntos: puntosRonda,
      escudoid: data.escudoid || null,
      rellenoid: data.rellenoid || null,
      colorprimario: data.colorprimario || null,
      colorsecundario: data.colorsecundario || null,
    });
  } else {
    console.log(chalk.gray(`🛑 Equipo omitido del ranking ronda: ${docSnap.id}`));
  }
}

const rankingRondaConPosicion = rankingRonda.map((equipo, index) => ({
    ...equipo,
    posicion: index + 1
  }));

  // Obtener ranking equipos por puntaje acumulado
  const rankingAcumuladoSnap = await db
    .collection('equipos')
    .orderBy('totalpuntos', 'desc')
    .get();

  const rankingAcumulado = [];

   for (const docSnap of rankingAcumuladoSnap.docs) {
  const data = docSnap.data();

  if (data.totalpuntos !== undefined && data.nombreequipo) {
    rankingAcumulado.push({
      id: docSnap.id,
      nombreequipo: data.nombreequipo,
      usuarioid: data.usuarioid,
      puntos: data.totalpuntos,
      escudoid: data.escudoid || null,
      rellenoid: data.rellenoid || null,
      colorprimario: data.colorprimario || null,
      colorsecundario: data.colorsecundario || null,
    });
  } else {
    console.log(chalk.gray(`🛑 Equipo omitido del ranking acumulado: ${docSnap.id}`));
  }
}

const rankingAcumuladoConPosicion = rankingAcumulado.map((equipo, index) => ({
    ...equipo,
    posicion: index + 1
  }));

console.log('📦 Generando ranking de ronda...');
console.log('ID documento ranking ronda:', `rankingronda${numeroRonda}`);

  // Escribir documento rankingronda{numeroRonda}
  await db.collection('rankings').doc(`rankingronda${numeroRonda}`).set({
    equipos: rankingRondaConPosicion,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  console.log('📦 Generando ranking acumulado...');
console.log('ID documento ranking acumulado: rankingacumulado');

  // Escribir documento rankingacumulado
  await db.collection('rankings').doc('rankingacumulado').set({
    equipos: rankingAcumuladoConPosicion,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Guardar top 3 por ronda
await db.collection('rankings').doc(`top3ronda${numeroRonda}`).set({
  equipos: rankingRondaConPosicion.slice(0, 3),
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
});

// Guardar top 3 acumulado
await db.collection('rankings').doc('top3acumulado').set({
  equipos: rankingAcumuladoConPosicion.slice(0, 3),
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
});

  console.log(`🏆 Rankings actualizados en Firestore para ronda ${numeroRonda}`);
  }

async function master() {
  console.log(chalk.magenta(`🚀 Iniciando cálculo de ronda ${numeroRonda}...`));
  const inicio = Date.now();
  await calcularPuntajeRonda();
  //await calcularTotales();
  await generarRankings();
  const fin = Date.now();
  const duracion = ((fin - inicio) / 1000).toFixed(2);
  console.log(chalk.magenta(`🏁 Proceso COMPLETO en ${duracion} segundos.`));
}

master()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(chalk.red('❌ Error:', err));
    process.exit(1);
  });
