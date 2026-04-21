const express = require('express');
const router = express.Router();
const Usuario = require('../models/usuario');
const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');
const config = require('../config');

// Rate limiting para login (prevenir fuerza bruta)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos
  message: 'Demasiados intentos de login, por favor inténtelo de nuevo más tarde',
  standardHeaders: true,
  legacyHeaders: false
});

// Página login
router.get('/', (req, res) => {
  res.render('autenticacion', { rol: null, error: null, mostrarModalRoles: false, roles: [] });
});

// Página registro
router.get('/registro', (req, res) => {
  res.render('registro', { error: null, valores: {} });
});

// POST iniciar sesión con soporte para múltiples roles
router.post('/iniciar-sesion', loginLimiter, async (req, res, next) => {
  try {
    const { email, contraseña } = req.body;
    const usuario = await Usuario.findOne({ email });

    // Verifica credenciales
    if (usuario && usuario.compararContraseña(contraseña)) {
      const roles = Array.isArray(usuario.rol) ? usuario.rol : ['cliente'];

      // Guarda sesión
      req.session.userId = usuario._id;
      req.session.roles = roles;

      // Si tiene múltiples roles, muestra modal de selección
      if (roles.length === 1) {
        req.session.rol = roles[0];
        return redirigirSegunRol(res, roles[0]);
      } else {
        return res.render('autenticacion', {
          rol: null,
          error: null,
          mostrarModalRoles: true, // Activa el modal
          roles: roles
        });
      }
    } else {
      return res.render('autenticacion', {
        error: 'Credenciales inválidas',
        rol: null,
        mostrarModalRoles: false,
        roles: []
      });
    }
  } catch (error) {
    next(error);
  }
});

// POST seleccionar rol tras login con múltiples roles
router.post('/seleccionar-rol', (req, res) => {
  const { rol } = req.body;

  // Verifica que el rol sea válido para el usuario
  if (!req.session.roles || !req.session.roles.includes(rol)) {
    return res.redirect('/');
  }

  req.session.rol = rol;
  return redirigirSegunRol(res, rol);
});

// Función auxiliar para redirigir según rol
function redirigirSegunRol(res, rol) {
  switch (rol) {
    case 'propietario':
      return res.redirect('/propietario');
    case 'gerente':
      return res.redirect('/gerente');
    default:
      return res.redirect('/cliente');
  }
}

// POST registro (solo permite clientes)
router.post('/registrar', async (req, res, next) => {
  try {
    const { email, contraseña } = req.body;

    // Validación de campos obligatorios
    if (!email || !contraseña) {
      return res.render('registro', {
        error: 'Todos los campos son obligatorios',
        valores: { email }
      });
    }

    // Verifica si el email ya existe
    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) {
      return res.render('registro', {
        error: 'El email ya está registrado',
        valores: { email }
      });
    }

    // Crea y guarda el nuevo usuario como cliente
    const nuevoUsuario = new Usuario({
      email,
      contraseña,
      rol: ['cliente']
    });

    await nuevoUsuario.save();
    logger.info(`Nuevo usuario registrado: ${email}`);
    res.redirect('/');
  } catch (error) {
    logger.error(`Error en registro: ${error.message}`);
    res.render('registro', {
      error: 'Error en el registro: ' + error.message,
      valores: req.body
    });
  }
});

// GET cerrar sesión
router.get('/cerrar-sesion', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;