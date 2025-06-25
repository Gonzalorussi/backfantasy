const admin = require('firebase-admin');
const jugadoresData = require('../utils/jugadorespermitidos.json');

const serviceAccount = require('../keys/msifantasy-firebase-adminsdk-fbsvc-a482e744c9.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  ignoreUndefinedProperties: true, // Evita error por undefined en Firestore
});

const db = admin.firestore();

const cargarJugadores = async () => {
  try {
    const batch = db.batch();

    jugadoresData.forEach(jugador => {
      const docRef = db.collection('jugadorespermitidos').doc(jugador.id);

      const data = {
        club: jugador.club || '',
        esportsplayerid: jugador.esportsPlayerId || '',
        summonername: jugador.summonerName || '',
        nombre: jugador.name || '',
        foto: jugador.image || '',
        rol: jugador.role || '',
        totalpuntos: 0,
        promediopuntos: 0,
        valor: 10,
        puntajeronda: {
          ronda1: 0,
          ronda2: 0,
          ronda3: 0,
        }
      };

      batch.set(docRef, data);
    });

    jugadoresData.forEach(jugador => {
  if (!jugador.name) {
    console.log('⚠️ Jugador sin campo name:', jugador);
  }
});


    await batch.commit();
    console.log('✅ Jugadores cargados correctamente.');
  } catch (error) {
    console.error('❌ Error cargando jugadores:', error);
  }
};

cargarJugadores();
