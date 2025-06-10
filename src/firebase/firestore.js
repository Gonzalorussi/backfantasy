const admin = require('firebase-admin');
const serviceAccount = require('../keys/msifantasy-firebase-adminsdk-fbsvc-a482e744c9.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

exports.updatePlayerScore = async (playerId, ronda, score) => {
  const playerRef = db.collection('jugadores').doc(playerId);
  await playerRef.set({
    puntajeronda: {
      [`ronda${ronda}`]: score,
    },
    totalpuntos: admin.firestore.FieldValue.increment(score),
  }, { merge: true });
};
