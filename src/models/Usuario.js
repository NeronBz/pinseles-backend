/**
 * Modelo Usuario.
 *
 * Representa tanto bomberos como administradores.
 * La contraseña se almacena con bcrypt y nunca se devuelve en las queries.
 *
 * Relaciones:
 *  - rol: BOMBERO | ADMIN (campo simple para simplificar; en el diseño original
 *    había una colección Rol con permisos embebidos. Para un TFG con 2 roles
 *    bien definidos, un enum es suficiente y más eficiente).
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config/config');

const usuarioSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    documento: {
      type: String,
      required: [true, 'El documento (DNI) es obligatorio'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 20,
    },
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 200,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email con formato no válido'],
    },
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: 8,
      select: false, // nunca se devuelve por defecto
    },
    telefono: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    fechaIngreso: {
      type: Date,
      required: true,
      default: Date.now,
    },
    rol: {
      type: String,
      enum: [config.roles.SOLICITANTE, config.roles.BOMBERO, config.roles.JEFE, config.roles.ADMIN],
      default: config.roles.SOLICITANTE,
      required: true,
      index: true,
    },
    photoBase64: {
      type: String,
      select: false, // no se devuelve por defecto en listados, solo en /me y al editar
    },
    activo: {
      type: Boolean,
      default: true,
      index: true,
    },
    cargo: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    fcmToken: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true, // createdAt y updatedAt automáticos
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        // Nunca exponer password ni __v
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// -------------------------------------------------------------------
// Hooks
// -------------------------------------------------------------------

/**
 * Antes de guardar, si la contraseña ha cambiado, la hasheamos con bcrypt.
 */
usuarioSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(config.security.bcryptRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------------
// Métodos de instancia
// -------------------------------------------------------------------

/**
 * Compara una contraseña en claro con el hash almacenado.
 */
usuarioSchema.methods.compararPassword = function (passwordEnClaro) {
  return bcrypt.compare(passwordEnClaro, this.password);
};

module.exports = mongoose.model('Usuario', usuarioSchema);
