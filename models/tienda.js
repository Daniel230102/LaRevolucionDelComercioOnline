const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const tiendaSchema = new Schema({
  nombre: { 
    type: String, 
    required: [true, 'El nombre de la tienda es obligatorio'] 
  },
  imagen: { type: String },
  propietario: { type: Schema.Types.ObjectId, ref: 'Usuario' }
});

// Índices para optimizar consultas
tiendaSchema.index({ propietario: 1 });
tiendaSchema.index({ nombre: 'text' });

module.exports = mongoose.model('Tienda', tiendaSchema);