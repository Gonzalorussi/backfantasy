const admin = require('firebase-admin');
const jugadoresData = require('../utils/jugadorespermitidos.json');
const serviceAccount = require('../keys/msifantasy-firebase-adminsdk-fbsvc-a482e744c9.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  ignoreUndefinedProperties: true,
});

const db = admin.firestore();

const cargarJugadoresEnDocumentoUnico = async () => {
  try {
    // Preparar array con estructura limpia
    const jugadoresLimpios = jugadoresData.map(jugador => ({
      id: jugador.id || '',
      nombre: jugador.name || '',
      club: (jugador.club || '').toLowerCase(),
      foto: jugador.image || '',
      rol: jugador.role || '',
      valor: 10,
      totalpuntos: 0,
      promediopuntos: 0,
      esportsplayerid: jugador.esportsPlayerId || '',
      summonername: jugador.summonerName || '',
      puntajeronda: {
        ronda1: 0,
        ronda2: 0,
        ronda3: 0
      }
    }));

    // Guardar en un único documento
    const docRef = db.collection('jugadorespermitidos').doc('agregado');
    await docRef.set({ jugadores: jugadoresLimpios });

    console.log(`✅ ${jugadoresLimpios.length} jugadores cargados en documento único.`);
  } catch (error) {
    console.error('❌ Error cargando jugadores:', error);
  }
};

cargarJugadoresEnDocumentoUnico();
