const mongoose = require('mongoose');

const trabajadorSchema = new mongoose.Schema({
  nombre: { 
    type: String, 
    required: [true, 'El nombre es obligatorio'] 
  },
  apellidos: { 
    type: String, 
    required: [true, 'Los apellidos son obligatorios'] 
  },
  tiendaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tienda' }
});

// Índices para optimizar consultas
trabajadorSchema.index({ tiendaId: 1 });
trabajadorSchema.index({ nombre: 'text', apellidos: 'text' });

module.exports = mongoose.model('Trabajador', trabajadorSchema);