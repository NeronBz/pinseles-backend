const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/responseHelper');
const config = require('../config/config');

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

exports.me = asyncHandler(async (req, res) => {
  const usuario = await Usuario.findById(req.user.id).select('+photoBase64');
  if (!usuario) {
    throw new AppError('Usuario no encontrado', 404);
  }
  return ok(res, { usuario });
});

exports.saveFcmToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new AppError('Token FCM requerido', 400);
  await Usuario.findByIdAndUpdate(req.user.id, { fcmToken: token });
  return ok(res, { mensaje: 'Token FCM registrado' });
});

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
