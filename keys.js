/**
 * Configuración de claves (obsoleto - usar config/index.js)
 * Mantenido para compatibilidad con database.js existente
 */
const config = require('./config');

module.exports = {
  mongodb: {
    URI: config.mongodb.URI
  }
};