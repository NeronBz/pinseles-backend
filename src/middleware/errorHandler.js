/**
 * Middleware central de manejo de errores.
 * Transforma cualquier error en una respuesta JSON homogénea.
 *
 * Crítico: no exponer stack traces en producción.
 */

const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const { fail } = require('../utils/responseHelper');

// 404 - ruta no encontrada
function notFoundHandler(req, res) {
  return fail(res, `Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404);
}

// Manejador de errores genérico
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';
  let details = err.details || null;

  // Errores de Mongoose
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Datos no válidos';
    details = Object.values(err.errors).map((e) => ({
      campo: e.path,
      mensaje: e.message,
    }));
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Formato inválido para el campo ${err.path}: ${err.value}`;
  } else if (err.code === 11000) {
    // Duplicado (unique index)
    statusCode = 409;
    const campo = Object.keys(err.keyValue || {})[0] || 'campo';
    message = `Ya existe un registro con el mismo ${campo}`;
    details = err.keyValue;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token no válido';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expirado';
  }

  // Log: errores de servidor con traza completa, errores de cliente con info resumida
  if (statusCode >= 500) {
    logger.error(`[${req.method} ${req.originalUrl}]`, err);
  } else {
    logger.warn(`[${req.method} ${req.originalUrl}] ${statusCode} - ${message}`);
  }

  // En producción, ocultar stack trace y mensajes genéricos de error 500
  const isProd = process.env.NODE_ENV === 'production';
  if (statusCode >= 500 && isProd && !(err instanceof AppError)) {
    message = 'Error interno del servidor';
    details = null;
  }

  return fail(res, message, statusCode, details);
}

module.exports = { errorHandler, notFoundHandler };
