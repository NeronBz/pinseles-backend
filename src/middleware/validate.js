/**
 * Middleware que consolida los resultados de express-validator.
 * Si hay errores de validación, devuelve un 400 con los detalles.
 */

const { validationResult } = require('express-validator');
const { fail } = require('../utils/responseHelper');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map((e) => ({
      campo: e.path || e.param,
      mensaje: e.msg,
    }));
    return fail(res, 'Datos de entrada no válidos', 400, details);
  }
  next();
}

module.exports = handleValidation;
