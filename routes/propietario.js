const express = require('express');
const router = express.Router();
const Tienda = require('../models/tienda');
const Usuario = require('../models/usuario');
const multer = require('multer');
const path = require('path');
const logger = require('../config/logger');

// Middleware de autenticación para propietario
function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId && req.session.rol === 'propietario') {
    return next();
  }
  res.redirect('/');
}

// Configuración de Multer para subir imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Ruta principal del propietario
router.get('/', isAuthenticated, async (req, res, next) => {
  try {
    const tiendas = await Tienda.find();
    res.render('propietario', { 
      tiendas, 
      rol: 'propietario', 
      section: 'tiendas',
      error: null
    });
  } catch (error) {
    next(error);
  }
});

// Añadir tienda
router.post('/agregar-tienda', isAuthenticated, upload.single('imagen'), async (req, res, next) => {
  try {
    const { nombre } = req.body;
    // Guarda la ruta de la imagen subida
    const imagen = `/uploads/${req.file.filename}`;
    // Crea y guarda la nueva tienda
    const nuevaTienda = new Tienda({ nombre, imagen });
    await nuevaTienda.save();
    res.redirect('/propietario');
  } catch (error) {
    next(error);
  }
});

// Modificar tienda
router.post('/modificar-tienda', isAuthenticated, upload.single('imagen'), async (req, res, next) => {
  try {
    const { id, nombre } = req.body;
    const updateData = { nombre };
    
    // Actualiza la imagen solo si se subió un archivo
    if (req.file) {
      updateData.imagen = `/uploads/${req.file.filename}`;
    }
    
    // Actualiza la tienda en la base de datos
    await Tienda.findByIdAndUpdate(id, updateData);
    res.redirect('/propietario');
  } catch (error) {
    next(error);
  }
});

// Eliminar tienda
router.post('/eliminar-tienda/:id', isAuthenticated, async (req, res, next) => {
  try {
    await Tienda.findByIdAndDelete(req.params.id);
    // Opcional: eliminar productos y stock asociados a la tienda
    res.redirect('/propietario');
  } catch (error) {
    next(error);
  }
});

// Gestión de usuarios
router.get('/gestion-usuarios', isAuthenticated, async (req, res, next) => {
  try {
    // Obtiene email, rol y tiendaId de los usuarios, y.populate para ver detalles de tienda
    const usuarios = await Usuario.find({}, 'email rol tiendaId').populate('tiendaId', 'nombre');
    // Obtiene todas las tiendas para el selector
    const tiendas = await Tienda.find({}, 'nombre');
    res.render('propietario', {
      usuarios,
      tiendas,
      rol: 'propietario',
      section: 'usuarios',
      error: null
    });
  } catch (error) {
    next(error);
  }
});

// Eliminar usuario
router.post('/eliminar-usuario/:id', isAuthenticated, async (req, res, next) => {
  try {
    // No permitir que el propietario se elimine a sí mismo
    if (req.params.id === req.session.userId) {
      return res.redirect('/propietario/gestion-usuarios?error=No puedes eliminarte a ti mismo');
    }
    await Usuario.findByIdAndDelete(req.params.id);
    res.redirect('/propietario/gestion-usuarios');
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    // Redirige con mensaje de error
    res.redirect('/propietario/gestion-usuarios?error=No se pudo eliminar el usuario');
  }
});

// Actualizar roles
router.post('/actualizar-rol', isAuthenticated, async (req, res, next) => {
  try {
    const { userId, tiendaId } = req.body;
    // Obtiene roles del formulario (puede ser array o string)
    const roles = req.body.roles || [];

    // Filtra roles válidos
    const rolesPermitidos = ['cliente', 'gerente', 'propietario'];
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    const rolesFiltrados = rolesArray.filter(r => rolesPermitidos.includes(r));

    // Validación: al menos un rol válido
    if (rolesFiltrados.length === 0) {
      return res.redirect('/propietario/gestion-usuarios?error=Debe seleccionar al menos un rol válido');
    }

    // Prepara los datos a actualizar
    const updateData = { rol: rolesFiltrados };

    // Si es gerente, requiere tiendaId
    if (rolesFiltrados.includes('gerente')) {
      if (!tiendaId) {
        return res.redirect('/propietario/gestion-usuarios?error=Debes asignar una tienda al gerente');
      }
      updateData.tiendaId = tiendaId;
    } else {
      // Si no es gerente, elimina la asignación de tienda
      updateData.tiendaId = null;
    }

    // Actualiza en la base de datos
    await Usuario.findByIdAndUpdate(userId, updateData);

    res.redirect('/propietario/gestion-usuarios');
  } catch (error) {
    console.error('Error al actualizar roles:', error);
    res.redirect('/propietario/gestion-usuarios?error=Error al actualizar los roles');
  }
});

// Registrar nuevo usuario (propietario o gerente)
router.post('/registrar-usuario', isAuthenticated, async (req, res, next) => {
  try {
    const { email, contraseña, rol, tiendaId } = req.body;

    // Validación de campos obligatorios
    if (!email || !contraseña || !rol) {
      return res.redirect('/propietario/gestion-usuarios?error=Todos los campos son obligatorios');
    }

    // Solo permite registrar como gerente o propietario
    if (!['gerente', 'propietario'].includes(rol)) {
      return res.redirect('/propietario/gestion-usuarios?error=Solo se puede registrar como gerente o propietario');
    }

    // Verifica si el email ya existe
    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) {
      return res.redirect('/propietario/gestion-usuarios?error=El email ya está registrado');
    }

    // Si es gerente, requiere tienda asignada
    if (rol === 'gerente' && !tiendaId) {
      return res.redirect('/propietario/gestion-usuarios?error=Debes asignar una tienda al gerente');
    }

    // Crea y guarda el nuevo usuario
    const nuevoUsuario = new Usuario({
      email,
      contraseña,
      rol: [rol],
      tiendaId: rol === 'gerente' ? tiendaId : null
    });

    await nuevoUsuario.save();
    logger.info(`Nuevo usuario ${rol} registrado por propietario: ${email}`);
    res.redirect('/propietario/gestion-usuarios');
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.redirect('/propietario/gestion-usuarios?error=Error al registrar el usuario: ' + error.message);
  }
});

module.exports = router;