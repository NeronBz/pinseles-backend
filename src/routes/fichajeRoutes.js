/**
 * Rutas de Fichajes.
 */

const express = require('express');
const { body, param } = require('express-validator');

const controller = require('../controllers/fichajeController');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(auth);

/**
 * POST /fichajes/entrada
 */
router.post(
  '/entrada',
  [
    body('ubicacion').optional().isString().isLength({ max: 200 }),
    body('coordenadas')
      .optional()
      .isArray({ min: 2, max: 2 })
      .withMessage('coordenadas debe ser [longitud, latitud]'),
    body('observaciones').optional().isString().isLength({ max: 1000 }),
  ],
  validate,
  controller.registrarEntrada
);

/**
 * POST /fichajes/salida
 */
router.post(
  '/salida',
  [
    body('ubicacion').optional().isString().isLength({ max: 200 }),
    body('coordenadas').optional().isArray({ min: 2, max: 2 }),
    body('observaciones').optional().isString().isLength({ max: 1000 }),
  ],
  validate,
  controller.registrarSalida
);

/**
 * GET /fichajes/mi-fichaje-abierto
 * IMPORTANTE: esta ruta debe ir ANTES de '/:id' para que Express no la
 * interprete como un id.
 */
router.get('/mi-fichaje-abierto', controller.miFichajeAbierto);

/**
 * GET /fichajes
 */
router.get('/', controller.listar);

/**
 * GET /fichajes/:id
 */
router.get('/:id', [param('id').isMongoId()], validate, controller.obtener);

module.exports = router;
