require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { obtenerTodosLosGameIds } = require('../utils/seriesFetcher');

const hl = process.argv[2] || 'en-US';

const crearNombreArchivo = (teams) => {
  if (!Array.isArray(teams) || teams.length !== 2) return 'serie_desconocida.json';
  const clean = (str) => str
    .normalize("NFD") // elimina acentos
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, '') // quita espacios
    .replace(/[^a-zA-Z0-9]/g, ''); // quita caracteres no alfanuméricos

  return `${clean(teams[0])}vs${clean(teams[1])}.json`;
};

const guardarSerieComoJson = (serieData, outputDir) => {
  const fileName = crearNombreArchivo(serieData.teams);
  const filePath = path.join(outputDir, fileName);

  fs.writeFileSync(filePath, JSON.stringify(serieData, null, 2), 'utf-8');
  console.log(`📁 Archivo guardado: ${filePath}`);
};

(async () => {
  try {
    console.log('⏳ Ejecutando obtención de gameIds...');
    const outputDir = path.join(__dirname, '../data/series');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`📂 Carpeta creada: ${outputDir}`);
    }
    const series = await obtenerTodosLosGameIds(hl);
     for (const serie of series) {
      guardarSerieComoJson(serie, outputDir);
    }

    console.log('✅ Todos los archivos han sido guardados con éxito.');
  } catch (error) {
    console.error('Error ejecutando el script:', error.message);
  }
})();
