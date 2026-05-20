/**
 * Conexión a MongoDB mediante Mongoose.
 * Incluye gestión de eventos de conexión y reconexión.
 */

const mongoose = require('mongoose');
const config = require('./config');
const logger = require('../utils/logger');

const connectDB = async () => {
  // Configuración estricta recomendada
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(config.mongo.uri, {
      // Opciones recomendadas para producción
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    logger.info(`MongoDB conectado: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (err) {
    logger.error('Error al conectar con MongoDB:', err.message);
    throw err;
  }

  // Eventos de conexión
  mongoose.connection.on('error', (err) => {
    logger.error('Error de conexión MongoDB:', err);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB desconectado.');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconectado.');
  });
};

module.exports = connectDB;
