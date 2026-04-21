/**
 * Configuración de la aplicación según el entorno
 * Carga variables de entorno con validación
 */

require('dotenv').config();

const config = {
  // Entorno de ejecución (development, production, test)
  env: process.env.NODE_ENV || 'development',
  
  // Puerto del servidor
  port: process.env.PORT || 3000,
  
  // Base de datos
  mongodb: {
    URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/LaRevolucionDelComercioOnline'
  },
  
  // Sesión
  session: {
    secret: process.env.SESSION_SECRET || 'tu_secreto_super_seguro_aqui',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Solo en HTTPS en producción
      httpOnly: true, // Previene acceso desde JavaScript
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
  },
  
  // Stripe
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  },
  
  // Seguridad
  security: {
    bcryptRounds: process.env.NODE_ENV === 'production' ? 12 : 10
  },
  
  // URL base
  baseUrl: process.env.BASE_URL || 'http://localhost:3000'
};

// Validación en producción
if (config.env === 'production') {
  const requiredVars = ['MONGODB_URI', 'SESSION_SECRET', 'STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno requeridas: ${missing.join(', ')}`);
  }
}

module.exports = config;
