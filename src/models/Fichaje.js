/**
 * Modelo Fichaje.
 *
 * Registra la entrada y salida de un bombero en un turno.
 * Se asocia opcionalmente con elementos de inventario utilizados.
 *
 * Estados: ENTRADA_REGISTRADA, SALIDA_REGISTRADA, INCOMPLETO
 *
 * Consideraciones:
 *  - Un usuario solo debería tener un fichaje abierto simultáneamente
 *    (índice parcial para garantizarlo).
 *  - En modo offline el cliente Android puede registrar entrada local
 *    y sincronizar después; aquí solo modelamos el servidor.
 */

const mongoose = require('mongoose');

const ESTADOS = ['ENTRADA_REGISTRADA', 'SALIDA_REGISTRADA', 'INCOMPLETO'];

const fichajeSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      index: true,
    },
    horaEntrada: {
      type: Date,
      required: true,
      default: Date.now,
    },
    horaSalida: {
      type: Date,
      default: null,
    },
    ubicacionEntrada: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    ubicacionSalida: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    coordenadasEntrada: {
      // GeoJSON-like simplificado [longitud, latitud]
      type: [Number],
      default: undefined,
      validate: {
        validator: (v) => !v || v.length === 2,
        message: 'Las coordenadas deben ser [longitud, latitud]',
      },
    },
    coordenadasSalida: {
      type: [Number],
      default: undefined,
      validate: {
        validator: (v) => !v || v.length === 2,
        message: 'Las coordenadas deben ser [longitud, latitud]',
      },
    },
    estado: {
      type: String,
      enum: ESTADOS,
      default: 'ENTRADA_REGISTRADA',
      required: true,
      index: true,
    },
    elementosUsados: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ElementoInventario',
      },
    ],
    observaciones: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Virtual para calcular duración del turno en minutos
fichajeSchema.virtual('duracionMinutos').get(function () {
  if (!this.horaEntrada || !this.horaSalida) return null;
  return Math.round((this.horaSalida - this.horaEntrada) / 60000);
});

// Índice parcial: garantiza que un usuario solo tiene un fichaje abierto
fichajeSchema.index(
  { usuario: 1, estado: 1 },
  { unique: true, partialFilterExpression: { estado: 'ENTRADA_REGISTRADA' } }
);

fichajeSchema.statics.ESTADOS = ESTADOS;

module.exports = mongoose.model('Fichaje', fichajeSchema);
