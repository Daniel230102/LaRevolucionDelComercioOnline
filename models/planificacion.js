const mongoose = require('mongoose');

const PlanificacionSchema = new mongoose.Schema({
  trabajador: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trabajador',
    required: [true, 'El trabajador es obligatorio']
  },
  tienda: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tienda',
    required: [true, 'La tienda es obligatoria']
  },
  fecha: {
    type: Date,
    required: [true, 'La fecha es obligatoria']
  },
  dia: {
    type: String, 
    required: [true, 'El día es obligatorio']
  },
  horaEntrada: {
    type: String,
    required: [true, 'La hora de entrada es obligatoria']
  },
  horaSalida: {
    type: String,
    required: [true, 'La hora de salida es obligatoria']
  },
  semana: {
    type: Number,
    min: [1, 'La semana debe estar entre 1 y 5'],
    max: [5, 'La semana debe estar entre 1 y 5']
  }
}, { timestamps: true });

// Índices para optimizar consultas
PlanificacionSchema.index({ tienda: 1, semana: 1 });
PlanificacionSchema.index({ trabajador: 1 });
PlanificacionSchema.index({ fecha: 1 });

module.exports = mongoose.model('Planificacion', PlanificacionSchema);