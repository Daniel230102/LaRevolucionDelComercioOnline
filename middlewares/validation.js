/**
 * Middleware de validación con Joi
 * Funciones auxiliares para validar datos de entrada
 */

const Joi = require('joi');
const logger = require('../config/logger');

/**
 * Validar cuerpo de petición (req.body)
 * @param {Joi.Schema} schema - Esquema Joi para validar
 * @returns {Function} Middleware de Express
 */
function validateBody(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const messages = error.details.map(detail => detail.message);
      logger.warn(`Validación fallida en ${req.originalUrl}: ${messages.join(', ')}`);
      
      // Si es una petición JSON (AJAX), devolver error JSON
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(400).json({ 
          success: false, 
          error: messages 
        });
      }
      
      // Para formularios normales, redirigir con mensaje de error
      return res.status(400).render('error', {
        message: 'Datos inválidos: ' + messages.join(', '),
        rol: req.session?.rol || null
      });
    }
    
    next();
  };
}

/**
 * Validar parámetros de ruta (req.params)
 * @param {Joi.Schema} schema - Esquema Joi para validar
 * @returns {Function} Middleware de Express
 */
function validateParams(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.params, { abortEarly: false });
    
    if (error) {
      const messages = error.details.map(detail => detail.message);
      logger.warn(`Validación de parámetros fallida: ${messages.join(', ')}`);
      return res.status(400).json({ success: false, error: messages });
    }
    
    next();
  };
}

/**
 * Validar query string (req.query)
 * @param {Joi.Schema} schema - Esquema Joi para validar
 * @returns {Function} Middleware de Express
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.query, { abortEarly: false, allowUnknown: true });
    
    if (error) {
      const messages = error.details.map(detail => detail.message);
      logger.warn(`Validación de query fallida: ${messages.join(', ')}`);
      return res.status(400).json({ success: false, error: messages });
    }
    
    next();
  };
}

// Esquemas comunes reutilizables
const schemas = {
  // Esquema para login
  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'El email no es válido',
      'string.empty': 'El email es obligatorio'
    }),
    contraseña: Joi.string().min(1).required().messages({
      'string.min': 'La contraseña es obligatoria'
    })
  }),

  // Esquema para registro
  register: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'El email no es válido',
      'string.empty': 'El email es obligatorio'
    }),
    contraseña: Joi.string().min(6).required().messages({
      'string.min': 'La contraseña debe tener al menos 6 caracteres'
    }),
    rol: Joi.string().valid('cliente', 'gerente', 'propietario').required(),
    codigo: Joi.string().optional().allow('')
  }),

  // Esquema para ID de MongoDB
  mongoId: Joi.object({
    id: Joi.string().hex().length(24).required().messages({
      'string.hex': 'El ID no es válido',
      'string.length': 'El ID no tiene el formato correcto'
    })
  })
};

module.exports = {
  validateBody,
  validateParams,
  validateQuery,
  schemas
};
