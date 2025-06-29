const admin = require('firebase-admin');
const serviceAccount = require('../keys/msifantasy-firebase-adminsdk-fbsvc-a482e744c9.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

exports.setPlayerAverageScore = async (playerName, averageScore, ronda) => {
  const jugadoresRef = db.collection('jugadores');
  const querySnapshot = await jugadoresRef.where('summonername', '==', playerName).get();

  if (querySnapshot.empty) {
    console.warn(`Jugador ${playerName} no encontrado en Firestore.`);
    return;
  }

  const playerDoc = querySnapshot.docs[0];
  const playerRef = playerDoc.ref;
  const playerData = playerDoc.data();

  const totalPuntosPrevio = playerData.totalpuntos || 0;
  console.log({ totalPuntosPrevio, averageScore });


  const nuevoTotal = parseFloat((totalPuntosPrevio + averageScore).toFixed(2));

  await playerRef.set({
    totalpuntos: nuevoTotal,
    puntajeronda: {
      [`ronda${ronda}`]: parseFloat(averageScore.toFixed(2)),
    },
  }, { merge: true });
};

