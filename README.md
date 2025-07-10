Dependencias:
express
cors
axios
dotenv
nodemon
firebase-admin
chalk@4

FLUJO DE EJECUCION DE SCRIPTS
1- Ejecutar npm run fetch-series que busca los gameId de una seir y crea un json en data/series como "NOMBREQUIPOvsNOMBREEQUIPO"
2- Ejecutar npm run processGameData pasandole el nombre del json deseado de data/seriesque crea 2 archivos json en data/gamedata/           NOMBREQUIPOvsNOMBREEQUIPO:
    Objectives: guarda estadísticas por equipo
    Playerstats: guarda estadísticas por jugador
3- Ejecutar npm run calcularPuntajes pasandole los datos que solicita de cada gameId. Calcula los puntajes de cada jugador en una ronda y los guarda en FS, colección jugadores, campo puntajeronda[numeroronda]
4- Ejecutar npm run puntajeRosters # que calcula los puntajes de cada roster en la ronda ingresada y lo guarda en la FS
5- Ejecutar npm run promedios
6- Ejecutar npm run seleccionados
7- Ejecutar npm run rosterideal
8- Actualizar archivo utils/jugadorespermitidos con los jugadores correspondientes
9- Ejecutar npm run cargar que actualiza los jugadores permitidos para la proxima ronda
10- Cambiar manualmente la partida de la proxima ronda en FS, coleccion partidas del dia. La info la sacas de la coleccion clubes.