/**
 * Rutas de Inventario.
 */

const express = require('express');
const { body, param } = require('express-validator');

const controller = require('../controllers/inventarioController');
const ElementoInventario = require('../models/ElementoInventario');
const { auth, requireRoles } = require('../middleware/auth');
const validate = require('../middleware/validate');
const config = require('../config/config');

const router = express.Router();

router.use(auth);

// Consulta: cualquier autenticado
router.get('/', controller.listar);
router.get('/:id', [param('id').isMongoId()], validate, controller.obtener);

// Escritura: solo ADMIN
const soloAdmin = requireRoles(config.roles.ADMIN);

router.post(
  '/',
  soloAdmin,
  [
    body('codigo').isString().trim().isLength({ min: 1, max: 50 }),
    body('descripcion').isString().trim().isLength({ min: 1, max: 200 }),
    body('categoria').optional().isString().isLength({ max: 100 }),
    body('ubicacion').optional().isString().isLength({ max: 100 }),
    body('cantidad').optional().isInt({ min: 0 }),
    body('estado').optional().isIn(ElementoInventario.ESTADOS),
  ],
  validate,
  controller.crear
);

router.patch(
  '/:id',
  soloAdmin,
  [
    param('id').isMongoId(),
    body('descripcion').optional().isString().isLength({ max: 200 }),
    body('categoria').optional().isString().isLength({ max: 100 }),
    body('ubicacion').optional().isString().isLength({ max: 100 }),
    body('cantidad').optional().isInt({ min: 0 }),
    body('estado').optional().isIn(ElementoInventario.ESTADOS),
    body('activo').optional().isBoolean(),
    body('observaciones').optional().isString().isLength({ max: 1000 }),
  ],
  validate,
  controller.actualizar
);

router.patch(
  '/:id/estado',
  soloAdmin,
  [
    param('id').isMongoId(),
    body('estado').isIn(ElementoInventario.ESTADOS),
  ],
  validate,
  controller.cambiarEstado
);

router.delete(
  '/:id',
  soloAdmin,
  [param('id').isMongoId()],
  validate,
  controller.retirar
);

module.exports = router;
