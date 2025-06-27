const admin = require("firebase-admin");
const readline = require("readline");

const serviceAccount = require('../keys/msifantasy-firebase-adminsdk-fbsvc-a482e744c9.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  ignoreUndefinedProperties: true, // Evita error por undefined en Firestore
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Número de ronda: ", async (numeroRonda) => {
  try {
    const rondaKey = `ronda${numeroRonda}`;
    const conteoSelecciones = {}; // { jugadorId: cantidad }
    const jugadoresData = {}; // cache de datos

    // 1. Consultar todos los rosters que tengan rondaN
    const rostersSnap = await db.collection("rosters").get();

    rostersSnap.forEach(doc => {
      const data = doc.data();
      if (data[rondaKey]) {
        const alineacion = data[rondaKey]; // ej: { top: "faker", mid: "chovy", ... }
        Object.values(alineacion).forEach(jugadorId => {
          conteoSelecciones[jugadorId] = (conteoSelecciones[jugadorId] || 0) + 1;
        });
      }
    });

    // 2. Ordenar por cantidad de selecciones
    const top5Ids = Object.entries(conteoSelecciones)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // 3. Actualizar la colección 'jugadores' con los nuevos conteos
    for (const [jugadorId, cantidad] of Object.entries(conteoSelecciones)) {
      const ref = db.collection("jugadores").doc(jugadorId);
      const doc = await ref.get();
      if (doc.exists) {
        const datos = doc.data();
        jugadoresData[jugadorId] = datos;
        const seleccionesPrevias = datos.selecciones || 0;
        await ref.update({ selecciones: seleccionesPrevias + cantidad });
      }
    }

    // 4. Crear top5seleccionados
    const top5Seleccionados = top5Ids.map(([jugadorId, cantidad], index) => {
      const jugador = jugadoresData[jugadorId];
      return {
        posicion: index + 1,
        id:jugador.id,
        nombre: jugador.nombre,
        foto: jugador.foto,
        club: jugador.club,
        rol: jugador.rol,
        valor: jugador.valor,
        selecciones: jugador.selecciones + cantidad || cantidad,
      };
    });

    await db.collection("topplayers").doc("top5seleccionados").set({ jugadores: top5Seleccionados });

    // 5. Obtener todos los jugadores y ordenarlos por promedio
    const jugadoresSnap = await db.collection("jugadores").get();

    const top5Promedios = jugadoresSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (b.promediopuntos || 0) - (a.promediopuntos || 0))
      .slice(0, 5)
      .map((jugador, index) => ({
        posicion: index + 1,
        id: jugador.id,
        nombre: jugador.nombre,
        foto: jugador.foto,
        club: jugador.club,
        rol: jugador.rol,
        valor: jugador.valor,
        promediopuntos: jugador.promediopuntos || 0,
      }));

    await db.collection("topplayers").doc("top5promedios").set({ jugadores: top5Promedios });

    console.log("✔️ Top 5 generado y actualizado con éxito.");
  } catch (error) {
    console.error("❌ Error ejecutando el script:", error);
  } finally {
    rl.close();
  }
});
