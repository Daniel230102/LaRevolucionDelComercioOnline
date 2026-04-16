const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const horarioSchema = new Schema({
  empleado: { type: Schema.Types.ObjectId, ref: 'Usuario' },
  fecha: { 
    type: Date, 
    required: [true, 'La fecha es obligatoria'] 
  },
  horaInicio: { 
    type: String, 
    required: [true, 'La hora de inicio es obligatoria'] 
  },
  horaFin: { 
    type: String, 
    required: [true, 'La hora de fin es obligatoria'] 
  }
});

// Índices para optimizar consultas
horarioSchema.index({ empleado: 1, fecha: 1 });

module.exports = mongoose.model('Horario', horarioSchema);