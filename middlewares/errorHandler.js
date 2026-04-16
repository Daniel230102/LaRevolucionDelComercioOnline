/**
 * Middleware de manejo de errores centralizado
 * Captura y registra errores de forma consistente
 */

const logger = require('../config/logger');
const config = require('../config');

function errorHandler(err, req, res, next) {
  // Registrar error con detalles
  const errorDetails = {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.session?.userId || 'no-authenticated'
  };

  // Log del error
  logger.error(`Error ${err.status || 500}: ${err.message}`, errorDetails);

  // Establecer locals para la vista
  res.locals.message = err.message;
  res.locals.error = config.env === 'development' ? err : {};

  // Renderizar página de error
  res.status(err.status || 500);
  res.render('error', { 
    rol: req.session ? req.session.rol : null,
    error: config.env === 'development' ? err : null
  });
}

// Middleware para rutas no encontradas (404)
function notFoundHandler(req, res, next) {
  const error = new Error(`Ruta no encontrada: ${req.originalUrl}`);
  error.status = 404;
  logger.warn(`404 - Intento de acceso a: ${req.originalUrl} desde ${req.ip}`);
  next(error);
}

module.exports = {
  errorHandler,
  notFoundHandler
};
