const jwt = require('jsonwebtoken');
const config = require('../config/config');
const AppError = require('../utils/AppError');
const Usuario = require('../models/Usuario');

async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      throw new AppError('Token de acceso no proporcionado', 401);
    }

    const token = header.slice('Bearer '.length).trim();
    let payload;
    try {
      payload = jwt.verify(token, config.jwt.secret, {
        algorithms: [config.jwt.algorithm],
      });
    } catch (err) {
      // Deja que el errorHandler traduzca JsonWebTokenError / TokenExpiredError
      throw err;
    }

    // Comprobar que el usuario sigue existiendo y está activo.
    // Esto es crítico en entorno nuclear: un usuario dado de baja
    // no debe poder seguir operando aunque tenga un token válido.
    const usuario = await Usuario.findById(payload.sub).select('nombre rol activo');
    if (!usuario || !usuario.activo) {
      throw new AppError('Usuario inactivo o inexistente', 401);
    }

    req.user = {
      id: usuario._id.toString(),
      rol: usuario.rol,
      nombre: usuario.nombre,
    };

    next();
  } catch (err) {
    next(err);
  }
}

function requireRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('No autenticado', 401));
    }
    if (!rolesPermitidos.includes(req.user.rol)) {
      return next(new AppError('No tienes permisos para realizar esta acción', 403));
    }
    next();
  };
}

module.exports = { auth, requireRoles };
