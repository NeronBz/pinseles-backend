const express = require('express');
const { body, param } = require('express-validator');

const controller = require('../controllers/fichajeController');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(auth);

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

router.get('/mi-fichaje-abierto', controller.miFichajeAbierto);

router.get('/', controller.listar);

router.get('/:id', [param('id').isMongoId()], validate, controller.obtener);

module.exports = router;
