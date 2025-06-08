function calcularPuntajeJugador(stats) {
  const {
    kills = 0,
    deaths = 0,
    assists = 0,
    creepScore = 0,
    killParticipation = 0, // % como número entero: 75 → 75%
    damagePercentage = 0, // % como número entero: 30 → 30%
    win = false, // boolean
    goldDiff = 0, // diferencia de oro entre equipos
    participantId = "", // top, jungle, mid, bottom, support
    rivalGold = 0, // oro del rival directo
    ownGold = 0, // oro del jugador
    ownCreepScore = 0,
    rivalCreepScore = 0,
    dragonsKilled = 0,
    baronsKilled = 0
  } = stats;

  let puntos = 0;

  // 🔹 PUNTOS BÁSICOS
  puntos += kills * 1.5;
  puntos += assists * 1;
  puntos -= deaths * 1;
  puntos += creepScore * 0.01;

  // 🔸 PUNTOS POR DESEMPEÑO
  if (killParticipation >= 0.7) puntos += 2;
  if (kills >= 10) puntos += 3;
  if (damagePercentage >= 30) puntos += 3;
  if (win) puntos += 1;
  if (goldDiff >= 10000) puntos += 2;
  if (deaths === 0 && (kills + assists) >= 5) puntos += 3; // score perfecto

  // 🛡️ BONUS POR ROL
  switch (participantId) {
    case "6":
      if (damagePercentage >= 25) puntos += 2;
      if ((ownGold - rivalGold) >= 2500) puntos += 2;
      break;
    case "7":
      if (dragonsKilled > 4) puntos += 1.5;
      puntos += baronsKilled * 2;
      if (killParticipation >= 0.75) puntos += 2;
      break;
    case "8":
      if (damagePercentage >= 0.3) puntos += 2;
      break;
    case "9":
      if ((ownCreepScore - rivalCreepScore) >= 75) puntos += 2;
      break;
    case "10":
      if (assists > 10) puntos += 2;
      if (killParticipation >= 0.75) puntos += 2;
      break;
    default:
      console.warn("Rol no reconocido:", participantId);
  }

  // 🎯 Resultado final
  console.log(`
📊 Puntaje calculado para ${participantId}:
- Básicos: ${kills * 1.5} (kills) + ${assists} (assists) - ${deaths} (deaths) + ${(creepScore * 0.01).toFixed(2)} (CS)
- Desempeño: ${killParticipation >= 70 ? "✓ KP" : ""} ${kills >= 10 ? "+3 Kills" : ""} ${damagePercentage >= 30 ? "+3 Daño%" : ""} ${win ? "+1 Win" : ""} ${goldDiff >= 10000 ? "+2 Oro equipo" : ""} ${(deaths === 0 && (kills + assists) >= 5) ? "+3 Score perfecto" : ""}
- Bonus Rol: ${participantId}
🎮 Total ➜ ${puntos.toFixed(2)} pts
  `);

  return Number(puntos.toFixed(2));
}

module.exports = calcularPuntajeJugador;
