const mongoose = require('mongoose');

const ESTADOS = ['PENDIENTE', 'EVALUADO', 'AUTORIZADO', 'RECHAZADO', 'EN_EJECUCION', 'COMPLETADO', 'ANULADO'];

// Tipos de trabajo del solicitante (checkboxes físicos del PTRI)
const TIPOS_TRABAJO = [
  'SOLDADURA_ELECTRICA',
  'SOLDADURA_TIG',
  'CORTE_RADIAL',
  'LANZA_TERMICA',
  'CORTE_SOPLETE',
  'DISTENSIONADO',
  'OTROS',
];

// Medidas PCI que evalúa el bombero
const MEDIDAS_PCI = [
  'RETIRAR_COMBUSTIBLE',
  'APANTALLAR_IGNIFUGO',
  'PROTEGER_ABERTURAS',
  'ACOPIO_COMBUSTIBLE',
  'DESPLAZAMIENTO_MULTIPLE',
  'MANTENER_LIMPIO',
  'AVISAR_PCI_FINALIZAR',
  'PROTEGER_EQUIPOS',
  'ZONA_ATEX',
  'VIGILANCIA_CONTINUA',
];

const cambioEstadoSchema = new mongoose.Schema(
  {
    estadoAnterior: { type: String, enum: [...ESTADOS, null], default: null },
    estadoNuevo: { type: String, enum: ESTADOS, required: true },
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    motivo: { type: String, trim: true, maxlength: 500 },
    fecha: { type: Date, default: Date.now, required: true },
  },
  { _id: false }
);

const permisoOperativoSchema = new mongoose.Schema(
  {
    // Parte A: Solicitud del Trabajo (SOLICITANTE)
    edificio: { type: String, trim: true, maxlength: 100, required: true },
    cota: { type: String, trim: true, maxlength: 50 },
    zona_fuego: { type: String, trim: true, maxlength: 50 },
    periodo_validez: { type: String, enum: ['DIARIO', 'SEMANAL'], default: 'DIARIO' },
    tipos_trabajo: [{ type: String, enum: TIPOS_TRABAJO }],
    desplazamiento_multiple: { type: Boolean, default: false },
    descripcion_trabajo: { type: String, trim: true, maxlength: 1000 },
    responsable_solicitante: { type: String, trim: true, maxlength: 150 },
    zona_controlada: { type: Boolean, default: false },

    solicitante: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      index: true,
    },

    estado: {
      type: String,
      enum: ESTADOS,
      default: 'PENDIENTE',
      required: true,
      index: true,
    },

    // Evaluación PCI (BOMBERO)
    medidas_pci: [{ type: String, enum: MEDIDAS_PCI }],
    medios_pci_zona: { type: String, trim: true, maxlength: 500 },
    precauciones_especiales: { type: String, trim: true, maxlength: 500 },
    evaluado_por: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
    fecha_evaluacion: { type: Date, default: null },

    // Autorización (JEFE / ADMIN)
    autorizado_por: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
    fecha_autorizacion: { type: Date, default: null },
    motivo_rechazo: { type: String, trim: true, maxlength: 500 },

    // Implantación (BOMBERO)
    extintor: { type: String, trim: true, maxlength: 100 },
    inspeccion_inicial: { type: Boolean, default: false },
    aviso_sala_control_inicio: { type: Boolean, default: false },
    implantado_por: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
    fecha_implantacion: { type: Date, default: null },

    // Cierre (BOMBERO)
    inspeccion_final: { type: Boolean, default: false },
    aviso_sala_control_cierre: { type: Boolean, default: false },
    no_se_realiza: { type: Boolean, default: false },
    observaciones_cierre: { type: String, trim: true, maxlength: 1000 },
    cerrado_por: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
    fecha_cierre: { type: Date, default: null },

    herramientas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ElementoInventario' }],

    historico: [cambioEstadoSchema],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => { delete ret.__v; return ret; },
    },
  }
);

permisoOperativoSchema.index({ estado: 1, createdAt: -1 });
permisoOperativoSchema.index({ solicitante: 1, createdAt: -1 });

permisoOperativoSchema.statics.ESTADOS = ESTADOS;
permisoOperativoSchema.statics.TIPOS_TRABAJO = TIPOS_TRABAJO;
permisoOperativoSchema.statics.MEDIDAS_PCI = MEDIDAS_PCI;

module.exports = mongoose.model('PermisoOperativo', permisoOperativoSchema);
