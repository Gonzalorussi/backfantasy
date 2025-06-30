const admin = require("firebase-admin");
const readline = require("readline");

const serviceAccount = require("../keys/msifantasy-firebase-adminsdk-fbsvc-a482e744c9.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  rl.question("Número de ronda (1 a 12): ", async (input) => {
    const rondaNum = parseInt(input);
    if (isNaN(rondaNum) || rondaNum < 1 || rondaNum > 12) {
      console.log("Ronda inválida, debe ser un número entre 1 y 12.");
      rl.close();
      return;
    }

    try {
      const rondaField = `ronda${rondaNum}`;
      const roles = ["top","jungle","mid","bottom", "support"];
      const snapshot = await db.collection("jugadores").get();

      if (snapshot.empty) {
      console.error("No hay jugadores en la colección.");
      return rl.close();
      }      

      // Guardamos mejor jugador con desempate por menor valor
      const mejoresPorRol = {};
      roles.forEach((rol) => {
        mejoresPorRol[rol] = { puntaje: -Infinity, valor: Infinity, jugador: null };
      });

      snapshot.forEach((doc) => {
        const jugador = doc.data();
        const rol = jugador.rol?.toLowerCase();
        const puntaje = jugador.puntajeronda?.[rondaField] ?? 0;
        const valor = jugador.valor ?? Infinity;

        if (!roles.includes(rol)) return;

        const mejor = mejoresPorRol[rol];
        if (puntaje > mejor.puntaje || (puntaje === mejor.puntaje && valor < mejor.valor)) {
          mejoresPorRol[rol] = {
            puntaje,
            valor,
            jugador: {
              nombre: jugador.nombre ?? doc.id,
              club: jugador.club ?? "",
              rol,
              puntajeronda: puntaje,
              foto: jugador.foto ?? "",
            },
          };
        }
      });

      const docData = {};
      roles.forEach((rol) => {
        docData[rol] = mejoresPorRol[rol].jugador ?? null;
      });

      const docId = `ronda${rondaNum}`;
      await db.collection("rosterideal").doc(docId).set(docData);

      console.log(`Documento ${docId} guardado en la colección rosterideal.`);
    } catch (error) {
      console.error("Error al procesar:", error);
    } finally {
      rl.close();
    }
  });
}

main();
