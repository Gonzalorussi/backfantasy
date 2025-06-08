const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config(); // Para leer variables de entorno desde .env

const scheduleRoutes = require('./routes/scheduleRoute');
const eventDetailsRouter = require('./routes/eventDetailsRoute');
const detailsRoute = require('./routes/detailsRoutes');
const objectivesRoute = require('./routes/objectivesRoutes')

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
app.use('/schedule', scheduleRoutes);
app.use('/api/event-details', eventDetailsRouter);
app.use('/details', detailsRoute);
app.use('/objectives', objectivesRoute)

// Ruta base
app.get('/', (req, res) => {
  res.send('🧠 Backend Fantasy LoL está corriendo');
});
module.exports = app;