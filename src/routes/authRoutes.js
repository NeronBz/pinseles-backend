const express = require('express');
const { body } = require('express-validator');

const authController = require('../controllers/authController');
const { auth, requireRoles } = require('../middleware/auth');
const validate = require('../middleware/validate');
const config = require('../config/config');

const router = express.Router();

router.post(
  '/register',
  auth,
  requireRoles(config.roles.ADMIN),
  [
    body('nombre').isString().trim().isLength({ min: 2, max: 100 }),
    body('documento').isString().trim().isLength({ min: 5, max: 20 }),
    body('email').isEmail().normalizeEmail(),
    body('password')
      .isString()
      .isLength({ min: 8 })
      .withMessage('La contraseña debe tener al menos 8 caracteres'),
    body('telefono').optional().isString().isLength({ max: 20 }),
    body('rol').optional().isIn([config.roles.SOLICITANTE, config.roles.BOMBERO, config.roles.JEFE, config.roles.ADMIN]),
    body('cargo').optional().isString().trim().isLength({ max: 100 }),
    body('fechaIngreso').optional().isISO8601().toDate(),
  ],
  validate,
  authController.register
);

router.post(
  '/login',
  [
    body('identificador')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Indica email o documento'),
    body('password').isString().notEmpty().withMessage('La contraseña es obligatoria'),
  ],
  validate,
  authController.login
);

router.get('/me', auth, authController.me);

router.post(
  '/fcm-token',
  auth,
  [body('token').isString().notEmpty().withMessage('El token FCM es obligatorio')],
  validate,
  authController.saveFcmToken
);

router.post(
  '/change-password',
  auth,
  [
    body('passwordActual').isString().notEmpty(),
    body('passwordNueva').isString().isLength({ min: 8 }),
  ],
  validate,
  authController.changePassword
);

module.exports = router;
