/**
 * Rutas de usuarios — accesibles por JEFE y ADMIN.
 */

const express = require('express');
const { body, param } = require('express-validator');

const usuarioController = require('../controllers/usuarioController');
const { auth, requireRoles } = require('../middleware/auth');
const validate = require('../middleware/validate');
const config = require('../config/config');

const router = express.Router();

const { SOLICITANTE, BOMBERO, JEFE, ADMIN } = config.roles;

router.use(auth, requireRoles(JEFE, ADMIN));

router.get('/', usuarioController.listar);

router.post(
  '/',
  [
    body('nombre').isString().trim().isLength({ min: 2, max: 100 }),
    body('documento').isString().trim().isLength({ min: 5, max: 20 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isString().isLength({ min: 8 }).withMessage('Mínimo 8 caracteres'),
    body('telefono').optional().isString().isLength({ max: 20 }),
    body('rol').optional().isIn([SOLICITANTE, BOMBERO, JEFE, ADMIN]),
    body('cargo').optional().isString().trim().isLength({ max: 100 }),
  ],
  validate,
  usuarioController.crear
);

router.get('/:id', [param('id').isMongoId()], validate, usuarioController.obtener);

router.patch(
  '/:id',
  [
    param('id').isMongoId(),
    body('nombre').optional().isString().trim().isLength({ min: 2, max: 100 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('telefono').optional().isString().isLength({ max: 20 }),
    body('cargo').optional().isString().trim().isLength({ max: 100 }),
    body('rol').optional().isIn([SOLICITANTE, BOMBERO, JEFE, ADMIN]),
    body('activo').optional().isBoolean(),
    body('photoBase64').optional().isString(),
  ],
  validate,
  usuarioController.actualizar
);

router.delete('/:id', [param('id').isMongoId()], validate, usuarioController.desactivar);

module.exports = router;
