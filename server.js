/**
 * PIN-SELES (CNA) - Backend
 * Punto de entrada principal del servidor.
 *
 * Carga variables de entorno, inicializa Express, conecta a MongoDB
 * y arranca el servidor HTTP.
 */

require('dotenv').config();

// Fuerza Google DNS para resolver registros SRV de MongoDB Atlas
require('dns').setServers(['8.8.8.8', '8.8.4.4']);

const app = require('./src/app');
const connectDB = require('./src/config/db');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 3000;

// Arranque asíncrono: primero BD, luego servidor
(async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      logger.info(`Servidor PIN-SELES escuchando en puerto ${PORT}`);
      logger.info(`Entorno: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`API disponible en http://localhost:${PORT}${process.env.API_PREFIX || '/api/v1'}`);
    });

    // Cierre ordenado: permite terminar peticiones en curso antes de cerrar.
    const shutdown = (signal) => {
      logger.warn(`Señal ${signal} recibida. Cerrando servidor...`);
      server.close(() => {
        logger.info('Servidor HTTP cerrado.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error('Error crítico al arrancar el servidor:', err);
    process.exit(1);
  }
})();

// Captura de errores no controlados (importante en entorno crítico)
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});
