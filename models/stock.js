const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const stockSchema = new Schema({
  tienda: { type: Schema.Types.ObjectId, ref: 'Tienda', required: [true, 'La tienda es obligatoria'] },
  producto: { type: Schema.Types.ObjectId, ref: 'Producto', required: [true, 'El producto es obligatorio'] },
  cantidad: { 
    type: Number, 
    default: 20,
    min: [0, 'El stock no puede ser negativo']
  }
});

// Índices para optimizar consultas (compuesto para búsquedas por tienda y producto)
stockSchema.index({ tienda: 1, producto: 1 }, { unique: true });
stockSchema.index({ cantidad: 1 });

module.exports = mongoose.model('Stock', stockSchema);