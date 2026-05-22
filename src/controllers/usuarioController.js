const Usuario = require('../models/Usuario');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, noContent } = require('../utils/responseHelper');
const config = require('../config/config');

exports.crear = asyncHandler(async (req, res) => {
  const { nombre, documento, email, password, telefono, rol, cargo } = req.body;
  const usuario = await Usuario.create({
    nombre,
    documento,
    email,
    password,
    telefono,
    rol: rol || config.roles.BOMBERO,
    cargo,
  });
  return created(res, usuario);
});

exports.listar = asyncHandler(async (req, res) => {
  const { rol, activo, q } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const filtro = {};
  if (rol) filtro.rol = rol;
  if (activo !== undefined) filtro.activo = activo === 'true';
  if (q) {
    filtro.$or = [
      { nombre: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
      { documento: { $regex: q, $options: 'i' } },
    ];
  }

  const [usuarios, total] = await Promise.all([
    Usuario.find(filtro)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Usuario.countDocuments(filtro),
  ]);

  return ok(res, usuarios, 200, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

exports.obtener = asyncHandler(async (req, res) => {
  const usuario = await Usuario.findById(req.params.id);
  if (!usuario) throw new AppError('Usuario no encontrado', 404);
  return ok(res, usuario);
});

exports.actualizar = asyncHandler(async (req, res) => {
  const camposPermitidos = ['nombre', 'email', 'telefono', 'rol', 'activo', 'cargo', 'photoBase64'];
  const update = {};
  for (const k of camposPermitidos) {
    if (req.body[k] !== undefined) update[k] = req.body[k];
  }

  const usuario = await Usuario.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  });
  if (!usuario) throw new AppError('Usuario no encontrado', 404);

  return ok(res, usuario);
});

exports.desactivar = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) {
    throw new AppError('No puedes desactivarte a ti mismo', 400);
  }

  const usuario = await Usuario.findByIdAndUpdate(
    req.params.id,
    { activo: false },
    { new: true }
  );
  if (!usuario) throw new AppError('Usuario no encontrado', 404);

  return noContent(res);
});
