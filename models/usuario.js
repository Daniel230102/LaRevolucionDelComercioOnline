const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('../config');

const usuarioSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'El email es obligatorio'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'El email no es válido']
  },
  contraseña: {
    type: String,
    required: [true, 'La contraseña es obligatoria'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres']
  },
  rol: {
    type: [String],
    enum: ['cliente', 'gerente', 'propietario'],
    default: ['cliente']
  },
  tiendaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tienda',
    required: function() {
      return this.rol && this.rol.includes('gerente');
    }
  }
});

// Índices para optimizar consultas
usuarioSchema.index({ rol: 1 });
usuarioSchema.index({ tiendaId: 1 });

// Middleware para encriptar la contraseña antes de guardar
usuarioSchema.pre('save', async function(next) {
  if (!this.isModified('contraseña')) return next();
  try {
    const salt = await bcrypt.genSalt(config.security.bcryptRounds);
    this.contraseña = await bcrypt.hash(this.contraseña, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar contraseñas
usuarioSchema.methods.compararContraseña = function(contraseña) {
  return bcrypt.compareSync(contraseña, this.contraseña);
};

module.exports = mongoose.model('Usuario', usuarioSchema);