const express = require('express');
const { body, param } = require('express-validator');

const controller = require('../controllers/permisoOperativoController');
const { auth, requireRoles } = require('../middleware/auth');
const validate = require('../middleware/validate');
const config = require('../config/config');

const router = express.Router();
router.use(auth);

const { BOMBERO, JEFE, ADMIN } = config.roles;

const bomberoOAdmin = requireRoles(BOMBERO, ADMIN);
const jefeOAdmin    = requireRoles(JEFE, ADMIN);
const mongoId       = [param('id').isMongoId()];
const motivoOpcional = body('motivo').optional().isString().isLength({ max: 500 });

router.get('/',    controller.listar);
router.get('/:id', mongoId, validate, controller.obtener);

// Crear (validación de rol en el controlador)
router.post(
  '/',
  [
    body('edificio').isString().trim().isLength({ min: 1, max: 100 }),
    body('cota').optional().isString().isLength({ max: 50 }),
    body('zona_fuego').optional().isString().isLength({ max: 50 }),
    body('periodo_validez').optional().isIn(['DIARIO', 'SEMANAL']),
    body('tipos_trabajo').optional().isArray(),
    body('desplazamiento_multiple').optional().isBoolean(),
    body('descripcion_trabajo').optional().isString().isLength({ max: 1000 }),
    body('responsable_solicitante').optional().isString().isLength({ max: 150 }),
    body('zona_controlada').optional().isBoolean(),
  ],
  validate,
  controller.crear
);

// Evaluar — BOMBERO o ADMIN
router.post(
  '/:id/evaluar',
  bomberoOAdmin,
  [...mongoId, body('medidas_pci').optional().isArray(), body('medios_pci_zona').optional().isString(), body('precauciones_especiales').optional().isString()],
  validate,
  controller.evaluar
);

// Autorizar / Rechazar — JEFE o ADMIN
router.post('/:id/autorizar', jefeOAdmin, [...mongoId, motivoOpcional], validate, controller.autorizar);
router.post('/:id/rechazar',  jefeOAdmin, [...mongoId, body('motivo').isString().isLength({ max: 500 })], validate, controller.rechazar);

// Implantar / Cerrar — BOMBERO o ADMIN
router.post(
  '/:id/implantar',
  bomberoOAdmin,
  [...mongoId, body('extintor').optional().isString(), body('inspeccion_inicial').optional().isBoolean(), body('aviso_sala_control_inicio').optional().isBoolean()],
  validate,
  controller.implantar
);
router.post(
  '/:id/cerrar',
  bomberoOAdmin,
  [...mongoId, body('inspeccion_final').optional().isBoolean(), body('aviso_sala_control_cierre').optional().isBoolean(), body('no_se_realiza').optional().isBoolean(), body('observaciones_cierre').optional().isString().isLength({ max: 1000 })],
  validate,
  controller.cerrar
);

// Anular — cualquier autenticado (validación de rol en el controlador)
router.post('/:id/anular', [...mongoId, motivoOpcional], validate, controller.anular);

// Eliminar — SOLICITANTE propietario o ADMIN (solo estados terminales)
router.delete('/:id', mongoId, validate, controller.eliminar);

module.exports = router;
