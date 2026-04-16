const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productoSchema = new Schema({
  nombre: { 
    type: String, 
    required: [true, 'El nombre del producto es obligatorio'] 
  },
  precio: { 
    type: Number, 
    required: [true, 'El precio es obligatorio'],
    min: [0, 'El precio no puede ser negativo']
  },
  imagen: { type: String, required: [true, 'La imagen es obligatoria'] },
  descripcion: { type: String, default: '' },
  tiendaId: { type: Schema.Types.ObjectId, ref: "Tienda", required: [true, 'La tienda es obligatoria'] }
});

// Índices para optimizar consultas
productoSchema.index({ tiendaId: 1 });
productoSchema.index({ nombre: 'text' });
productoSchema.index({ precio: 1 });

module.exports = mongoose.model('Producto', productoSchema);