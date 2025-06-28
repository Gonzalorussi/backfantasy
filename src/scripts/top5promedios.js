const admin = require("firebase-admin");
const serviceAccount = require('../keys/msifantasy-firebase-adminsdk-fbsvc-a482e744c9.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  ignoreUndefinedProperties: true,
});

const db = admin.firestore();

async function generarTop5Promedios() {
  try {
    const jugadoresSnap = await db.collection("jugadores")
      .orderBy("promediopuntos", "desc")
      .limit(5)
      .get();

    const top5 = jugadoresSnap.docs.map((doc, index) => {
      const jugador = doc.data();
      return {
        posicion: index + 1,
        nombre: jugador.nombre,
        foto: jugador.foto,
        club: jugador.club,
        rol: jugador.rol,
        valor: jugador.valor,
        promediopuntos: jugador.promediopuntos || 0,
      };
    });

    await db.collection("topplayers").doc("top5promedios").set({
      jugadores: top5,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log("✔️ Top 5 jugadores con mejor promedio actualizado.");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

generarTop5Promedios();