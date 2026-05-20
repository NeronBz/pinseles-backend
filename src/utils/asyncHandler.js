/**
 * Wrapper para controladores async.
 * Evita escribir try/catch en cada endpoint: si la promesa rechaza,
 * el error se pasa automáticamente al middleware de errores.
 */

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
