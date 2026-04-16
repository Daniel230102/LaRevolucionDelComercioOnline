/**
 * Configuración de Winston para logging estructurado
 * Crea logs separados para info y errores
 */

const winston = require('winston');
const path = require('path');
const config = require('../config');

// Formato personalizado para consola
const formatConsole = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message}${Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''}`;
  })
);

// Formato para archivos (JSON)
const formatFile = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Crear logger
const logger = winston.createLogger({
  level: config.env === 'production' ? 'info' : 'debug',
  format: formatFile,
  defaultMeta: { service: 'la-revolucion-comercio' },
  transports: [
    // Archivo para errores
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Archivo para todos los logs
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// En desarrollo, también mostrar en consola
if (config.env !== 'production') {
  logger.add(new winston.transports.Console({
    format: formatConsole
  }));
}

module.exports = logger;
