/**
 * Controlador de Inventario (ElementoInventario).
 *
 * Endpoints:
 *  - GET    /inventario          listar (cualquier autenticado)
 *  - GET    /inventario/:id      obtener
 *  - POST   /inventario          crear (ADMIN)
 *  - PATCH  /inventario/:id      actualizar (ADMIN)
 *  - DELETE /inventario/:id      retirar (ADMIN) - soft delete
 *  - PATCH  /inventario/:id/estado   cambiar estado (ADMIN)
 */

const ElementoInventario = require('../models/ElementoInventario');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, noContent } = require('../utils/responseHelper');

/**
 * GET /inventario
 * Filtros: ?estado=&categoria=&q=&activo=&page=&limit=
 */
exports.listar = asyncHandler(async (req, res) => {
  const { estado, categoria, q, activo, tipos_trabajo } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const filtro = {};
  if (estado) filtro.estado = estado;
  if (categoria) filtro.categoria = categoria;
  if (activo !== undefined) filtro.activo = activo === 'true';
  if (tipos_trabajo) {
    const tipos = tipos_trabajo.split(',').map(t => t.trim()).filter(Boolean);
    if (tipos.length > 0) filtro.tipos_trabajo = { $in: tipos };
  }
  if (q) {
    filtro.$or = [
      { codigo: { $regex: q, $options: 'i' } },
      { descripcion: { $regex: q, $options: 'i' } },
      { ubicacion: { $regex: q, $options: 'i' } },
    ];
  }

  const [elementos, total] = await Promise.all([
    ElementoInventario.find(filtro)
      .sort({ codigo: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    ElementoInventario.countDocuments(filtro),
  ]);

  return ok(res, elementos, 200, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

/**
 * GET /inventario/:id
 */
exports.obtener = asyncHandler(async (req, res) => {
  const elemento = await ElementoInventario.findById(req.params.id);
  if (!elemento) throw new AppError('Elemento de inventario no encontrado', 404);
  return ok(res, elemento);
});

/**
 * POST /inventario
 */
exports.crear = asyncHandler(async (req, res) => {
  const elemento = await ElementoInventario.create(req.body);
  return created(res, elemento);
});

/**
 * PATCH /inventario/:id
 */
exports.actualizar = asyncHandler(async (req, res) => {
  const camposPermitidos = [
    'descripcion',
    'categoria',
    'ubicacion',
    'cantidad',
    'estado',
    'activo',
    'observaciones',
    'tipos_trabajo',
  ];
  const update = {};
  for (const k of camposPermitidos) {
    if (req.body[k] !== undefined) update[k] = req.body[k];
  }

  const elemento = await ElementoInventario.findByIdAndUpdate(
    req.params.id,
    update,
    { new: true, runValidators: true }
  );
  if (!elemento) throw new AppError('Elemento de inventario no encontrado', 404);

  return ok(res, elemento);
});

/**
 * PATCH /inventario/:id/estado
 * Cambia únicamente el estado y actualiza ultimoUso si pasa a EN_USO.
 */
exports.cambiarEstado = asyncHandler(async (req, res) => {
  const { estado } = req.body;
  if (!ElementoInventario.ESTADOS.includes(estado)) {
    throw new AppError(`Estado no válido. Permitidos: ${ElementoInventario.ESTADOS.join(', ')}`, 400);
  }

  const update = { estado };
  if (estado === 'EN_USO') update.ultimoUso = new Date();

  const elemento = await ElementoInventario.findByIdAndUpdate(
    req.params.id,
    update,
    { new: true }
  );
  if (!elemento) throw new AppError('Elemento de inventario no encontrado', 404);

  return ok(res, elemento);
});

/**
 * DELETE /inventario/:id
 * Soft delete: lo marca como RETIRADO e inactivo.
 */
exports.retirar = asyncHandler(async (req, res) => {
  const elemento = await ElementoInventario.findByIdAndUpdate(
    req.params.id,
    { estado: 'RETIRADO', activo: false },
    { new: true }
  );
  if (!elemento) throw new AppError('Elemento de inventario no encontrado', 404);

  return noContent(res);
});
