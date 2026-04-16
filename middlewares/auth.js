/**
 * Middleware de autenticación mejorado
 * Verifica sesión de usuario y redirige según rol
 */

const logger = require('../config/logger');

function authMiddleware(req, res, next) {
  // Rutas públicas que no requieren autenticación
  const publicRoutes = ['/', '/iniciar-sesion', '/registrar', '/registro', '/cerrar-sesion'];

  // Si no hay sesión y la ruta es pública, continuar
  if (!req.session.userId && publicRoutes.includes(req.path)) {
    return next();
  }

  // Si no hay sesión y la ruta no es pública, redirir al login
  if (!req.session.userId && !publicRoutes.includes(req.path)) {
    logger.info(`Intento de acceso sin autenticación: ${req.path} desde ${req.ip}`);
    return res.redirect('/');
  }

  // Si hay sesión, verificar rol
  if (req.session.userId && !publicRoutes.includes(req.path)) {
    const userRole = req.session.rol;
    const currentPath = req.path;

    // Verificar que el rol coincida con la ruta
    const roleRoutes = {
      'propietario': '/propietario',
      'gerente': '/gerente',
      'cliente': '/cliente'
    };

    if (userRole && roleRoutes[userRole] && !currentPath.startsWith(roleRoutes[userRole])) {
      logger.warn(`Usuario con rol ${userRole} intentó acceder a ${currentPath}`);
      return res.redirect(roleRoutes[userRole]);
    }
  }

  next();
}

module.exports = authMiddleware;
