const mongoose = require('mongoose');

const ESTADOS = ['DISPONIBLE', 'EN_USO', 'MANTENIMIENTO', 'RETIRADO'];

const TIPOS_TRABAJO = [
  'SOLDADURA_ELECTRICA',
  'SOLDADURA_TIG',
  'CORTE_RADIAL',
  'LANZA_TERMICA',
  'CORTE_SOPLETE',
  'DISTENSIONADO',
  'OTROS',
];

const elementoInventarioSchema = new mongoose.Schema(
  {
    codigo: {
      type: String,
      required: [true, 'El código es obligatorio'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 50,
    },
    descripcion: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    categoria: {
      type: String,
      trim: true,
      maxlength: 100,
      index: true,
    },
    estado: {
      type: String,
      enum: ESTADOS,
      default: 'DISPONIBLE',
      index: true,
    },
    ubicacion: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    cantidad: {
      type: Number,
      default: 1,
      min: [0, 'La cantidad no puede ser negativa'],
    },
    ultimoUso: {
      type: Date,
      default: null,
    },
    activo: {
      type: Boolean,
      default: true,
    },
    observaciones: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    tipos_trabajo: [{
      type: String,
      enum: TIPOS_TRABAJO,
    }],
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

elementoInventarioSchema.statics.ESTADOS = ESTADOS;
elementoInventarioSchema.statics.TIPOS_TRABAJO = TIPOS_TRABAJO;

module.exports = mongoose.model('ElementoInventario', elementoInventarioSchema);
