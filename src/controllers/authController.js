/**
 * Controlador de autenticación.
 *
 * Endpoints:
 *  - POST /auth/register  (solo ADMIN puede crear usuarios)
 *  - POST /auth/login     (cualquiera, genera JWT)
 *  - GET  /auth/me        (perfil del usuario autenticado)
 *  - POST /auth/change-password
 */

const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/responseHelper');
const config = require('../config/config');

/**
 * Genera un JWT firmado para un usuario.
 */
function firmarToken(usuario) {
  return jwt.sign(
    {
      sub: usuario._id.toString(),
      rol: usuario.rol,
      nombre: usuario.nombre,
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.expiresIn,
      algorithm: config.jwt.algorithm,
    }
  );
}

/**
 * POST /auth/register
 * Crea un nuevo usuario. Solo accesible por ADMIN.
 */
exports.register = asyncHandler(async (req, res) => {
  const { nombre, documento, email, password, telefono, rol, fechaIngreso } = req.body;

  const usuario = await Usuario.create({
    nombre,
    documento,
    email,
    password,
    telefono,
    rol: rol || config.roles.BOMBERO,
    fechaIngreso: fechaIngreso || new Date(),
  });

  return created(res, {
    usuario: usuario.toJSON(),
  });
});

/**
 * POST /auth/login
 * Recibe email/documento + password. Devuelve JWT.
 */
exports.login = asyncHandler(async (req, res) => {
  const { identificador, password } = req.body;

  // Busca por email o por documento (ambos únicos)
  const usuario = await Usuario.findOne({
    $or: [
      { email: (identificador || '').toLowerCase() },
      { documento: (identificador || '').toUpperCase() },
    ],
  }).select('+password +photoBase64');

  if (!usuario) {
    // Mensaje genérico para no revelar si el usuario existe
    throw new AppError('Credenciales no válidas', 401);
  }

  if (!usuario.activo) {
    throw new AppError('Usuario inactivo. Contacta con el administrador.', 403);
  }

  const passwordValida = await usuario.compararPassword(password);
  if (!passwordValida) {
    throw new AppError('Credenciales no válidas', 401);
  }

  const token = firmarToken(usuario);

  return ok(res, {
    token,
    tokenType: 'Bearer',
    expiresIn: config.jwt.expiresIn,
    usuario: usuario.toJSON(),
  });
});

/**
 * GET /auth/me
 * Devuelve el perfil del usuario autenticado.
 */
exports.me = asyncHandler(async (req, res) => {
  const usuario = await Usuario.findById(req.user.id).select('+photoBase64');
  if (!usuario) {
    throw new AppError('Usuario no encontrado', 404);
  }
  return ok(res, { usuario });
});

/**
 * POST /auth/fcm-token
 * Registra o actualiza el token FCM del usuario autenticado.
 */
exports.saveFcmToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new AppError('Token FCM requerido', 400);
  await Usuario.findByIdAndUpdate(req.user.id, { fcmToken: token });
  return ok(res, { mensaje: 'Token FCM registrado' });
});

/**
 * POST /auth/change-password
 * Cambia la contraseña del usuario autenticado.
 */
exports.changePassword = asyncHandler(async (req, res) => {
  const { passwordActual, passwordNueva } = req.body;

  const usuario = await Usuario.findById(req.user.id).select('+password');
  if (!usuario) {
    throw new AppError('Usuario no encontrado', 404);
  }

  const coincide = await usuario.compararPassword(passwordActual);
  if (!coincide) {
    throw new AppError('La contraseña actual no es correcta', 401);
  }

  usuario.password = passwordNueva;
  await usuario.save();

  return ok(res, { mensaje: 'Contraseña actualizada correctamente' });
});
