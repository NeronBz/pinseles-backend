/**
 * Controlador de Fichajes.
 *
 * Endpoints:
 *  - POST /fichajes/entrada    registrar entrada (usuario autenticado)
 *  - POST /fichajes/salida     cerrar el fichaje abierto del usuario autenticado
 *  - GET  /fichajes            listar (ADMIN ve todos, BOMBERO solo los suyos)
 *  - GET  /fichajes/mi-fichaje-abierto  fichaje abierto actual del usuario
 *  - GET  /fichajes/:id        obtener uno
 */

const Fichaje = require('../models/Fichaje');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/responseHelper');

/**
 * POST /fichajes/entrada
 * Crea un fichaje ENTRADA_REGISTRADA. El índice único parcial del modelo
 * evita que un mismo usuario tenga dos fichajes abiertos.
 */
exports.registrarEntrada = asyncHandler(async (req, res) => {
  const { ubicacion, coordenadas, observaciones } = req.body;

  // Comprobar explícitamente para dar un mensaje claro (además del índice)
  const abierto = await Fichaje.findOne({
    usuario: req.user.id,
    estado: 'ENTRADA_REGISTRADA',
  });
  if (abierto) {
    throw new AppError(
      'Ya tienes un fichaje abierto. Cierra tu salida antes de registrar una nueva entrada.',
      409
    );
  }

  const fichaje = await Fichaje.create({
    usuario: req.user.id,
    horaEntrada: new Date(),
    ubicacionEntrada: ubicacion,
    coordenadasEntrada: coordenadas,
    observaciones,
    estado: 'ENTRADA_REGISTRADA',
  });

  return created(res, fichaje);
});

/**
 * POST /fichajes/salida
 * Cierra el fichaje abierto del usuario autenticado.
 */
exports.registrarSalida = asyncHandler(async (req, res) => {
  const { ubicacion, coordenadas, observaciones } = req.body;

  const fichaje = await Fichaje.findOne({
    usuario: req.user.id,
    estado: 'ENTRADA_REGISTRADA',
  });
  if (!fichaje) {
    throw new AppError('No tienes ningún fichaje abierto', 404);
  }

  fichaje.horaSalida = new Date();
  fichaje.ubicacionSalida = ubicacion;
  fichaje.coordenadasSalida = coordenadas;
  if (observaciones) {
    fichaje.observaciones = fichaje.observaciones
      ? `${fichaje.observaciones}\n---\n${observaciones}`
      : observaciones;
  }
  fichaje.estado = 'SALIDA_REGISTRADA';

  await fichaje.save();
  return ok(res, fichaje);
});

/**
 * GET /fichajes
 * Filtros: ?usuario=&estado=&desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 */
exports.listar = asyncHandler(async (req, res) => {
  const { usuario, estado, desde, hasta } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const filtro = {};
  if (estado) filtro.estado = estado;
  if (req.user.rol === 'BOMBERO' || req.user.rol === 'SOLICITANTE') {
    filtro.usuario = req.user.id;
  } else if (usuario && (req.user.rol === 'ADMIN' || req.user.rol === 'JEFE')) {
    filtro.usuario = usuario;
  }

  if (desde || hasta) {
    filtro.horaEntrada = {};
    if (desde) filtro.horaEntrada.$gte = new Date(desde);
    if (hasta) filtro.horaEntrada.$lte = new Date(hasta);
  }

  const [fichajes, total] = await Promise.all([
    Fichaje.find(filtro)
      .populate('usuario', 'nombre email documento')
      .populate('elementosUsados', 'codigo descripcion')
      .sort({ horaEntrada: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Fichaje.countDocuments(filtro),
  ]);

  return ok(res, fichajes, 200, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

/**
 * GET /fichajes/mi-fichaje-abierto
 */
exports.miFichajeAbierto = asyncHandler(async (req, res) => {
  const fichaje = await Fichaje.findOne({
    usuario: req.user.id,
    estado: 'ENTRADA_REGISTRADA',
  });
  return ok(res, fichaje);
});

/**
 * GET /fichajes/:id
 */
exports.obtener = asyncHandler(async (req, res) => {
  const fichaje = await Fichaje.findById(req.params.id)
    .populate('usuario', 'nombre email documento')
    .populate('elementosUsados', 'codigo descripcion');

  if (!fichaje) throw new AppError('Fichaje no encontrado', 404);

  if (
    (req.user.rol === 'BOMBERO' || req.user.rol === 'SOLICITANTE') &&
    fichaje.usuario._id.toString() !== req.user.id
  ) {
    throw new AppError('No tienes permisos para ver este recurso', 403);
  }

  return ok(res, fichaje);
});
