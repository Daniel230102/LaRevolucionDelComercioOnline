const express = require('express');
const router = express.Router();
const Tienda = require('../models/tienda');
const Producto = require('../models/producto');
const Trabajador = require('../models/trabajador');
const Planificacion = require('../models/planificacion');
const Stock = require('../models/stock');
const Usuario = require('../models/usuario');
const multer = require('multer');
const path = require('path');
const csv = require('csv-parser');
const fs = require('fs');
const logger = require('../config/logger');

// Multer para CSV
const storageCSV = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.resolve(__dirname, '../files/trabajadores');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const uploadCSV = multer({ storage: storageCSV });

// Multer para imagenes de los productos
const storageProductos = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const uploadProductos = multer({ storage: storageProductos });

function isAuthenticated(req, res, next) {
  if (req.session?.userId && req.session?.rol === 'gerente') return next();
  res.redirect('/');
}

// Rutas principales
router.get('/', isAuthenticated, async (req, res, next) => {
  try {
    // Obtiene la tienda asignada al gerente desde la sesión
    const usuario = await Usuario.findById(req.session.userId).populate('tiendaId');
    
    if (!usuario || !usuario.tiendaId) {
      // Si el gerente no tiene tienda asignada, muestra error
      logger.warn(`Gerente ${req.session.userId} intentó acceder sin tienda asignada`);
      return res.render('gerente', { 
        tienda: null,
        productos: [],
        rol: 'gerente', 
        section: 'tienda', 
        sinHeader: false, 
        stocksBajos: [],
        error: 'No tienes una tienda asignada. Contacta con el administrador.'
      });
    }

    // Muestra la tienda asignada con sus productos directamente
    const tiendaAsignada = usuario.tiendaId;
    const productos = await Producto.find({ tiendaId: tiendaAsignada._id });
    
    // Stock bajo solo para la tienda del gerente
    const stocksBajos = await Stock.find({ 
      cantidad: { $lt: 5 },
      tienda: tiendaAsignada._id
    }).populate('producto tienda');
    
    logger.info(`Gerente ${req.session.userId} accedió a su tienda: ${tiendaAsignada.nombre}`);
    
    res.render('gerente', { 
      tienda: tiendaAsignada,
      productos,
      rol: 'gerente', 
      section: 'tienda', 
      sinHeader: false, 
      stocksBajos 
    });
  } catch (error) {
    next(error);
  }
});


router.get('/tienda/:id', isAuthenticated, async (req, res, next) => {
  try {
    // Obtiene la tienda asignada al gerente
    const usuario = await Usuario.findById(req.session.userId).populate('tiendaId');
    
    if (!usuario || !usuario.tiendaId) {
      return res.redirect('/gerente');
    }

    // Verifica que la tienda solicitada sea la asignada al gerente
    if (req.params.id !== usuario.tiendaId._id.toString()) {
      logger.warn(`Gerente ${req.session.userId} intentó acceder a tienda no asignada: ${req.params.id}`);
      return res.redirect(`/gerente/tienda/${usuario.tiendaId._id}`);
    }

    // Busca la tienda por ID
    const tienda = usuario.tiendaId;
    // Busca los productos de esa tienda
    const productos = await Producto.find({ tiendaId: req.params.id });
    res.render('gerente', { tienda, productos, rol: 'gerente', section: 'tienda', sinHeader: true });
  } catch (error) {
    next(error);
  }
});

//Gestión de productos
router.get('/gestion-productos', isAuthenticated, async (req, res, next) => {
  try {
    // Obtiene la tienda asignada al gerente
    const usuario = await Usuario.findById(req.session.userId).populate('tiendaId');
    
    if (!usuario || !usuario.tiendaId) {
      return res.redirect('/gerente');
    }

    // Solo muestra productos de la tienda asignada
    const tiendaAsignada = usuario.tiendaId;
    const productos = await Producto.find({ tiendaId: tiendaAsignada._id }).populate('tiendaId');
    
    res.render('gerente', { 
      tiendas: [tiendaAsignada],
      productos, 
      rol: 'gerente', 
      section: 'gestion-productos', 
      sinHeader: false 
    });
  } catch (error) {
    next(error);
  }
});

// Crear producto y stock inicial
router.post('/agregar-producto', isAuthenticated, uploadProductos.single('imagen'), async (req, res, next) => {
  try {
    // Obtiene la tienda asignada al gerente
    const usuario = await Usuario.findById(req.session.userId).populate('tiendaId');
    
    if (!usuario || !usuario.tiendaId) {
      return res.redirect('/gerente/gestion-productos?error=No tienes tienda asignada');
    }

    // Recoge los datos del formulario
    const { nombre, precio, descripcion } = req.body;
    const tiendaId = usuario.tiendaId._id;
    
    // Ruta de la imagen subida
    const imagen = `/uploads/${req.file.filename}`;
    // Crea el producto
    const ProductoModel = require('../models/producto');
    const nuevoProducto = new ProductoModel({ nombre, precio, imagen, tiendaId, descripcion });
    await nuevoProducto.save();

    // Crea el stock inicial de 20 unidades si no existe ya
    const existingStock = await Stock.findOne({ tienda: tiendaId, producto: nuevoProducto._id });
    if (!existingStock) {
      await Stock.create({ tienda: tiendaId, producto: nuevoProducto._id, cantidad: 20 });
    }

    logger.info(`Producto "${nombre}" añadido a tienda ${usuario.tiendaId.nombre} por gerente ${req.session.userId}`);
    res.redirect('/gerente/gestion-productos');
  } catch (error) {
    next(error);
  }
});

//Eliminar productos
router.get('/eliminar-producto/:id', isAuthenticated, async (req, res, next) => {
  try {
    const ProductoModel = require('../models/producto');
    await ProductoModel.findByIdAndDelete(req.params.id);
    res.redirect('/gerente/gestion-productos');
  } catch (error) {
    next(error);
  }
});

//Modificar productos
router.post('/modificar-producto', isAuthenticated, uploadProductos.single('imagen'), async (req, res, next) => {
  try {
    const { id, modificarNombre, modificarPrecio, modificarDescripcion } = req.body;
    const updateData = {};

    // Solo actualiza los campos que se han marcado
    if (modificarNombre) updateData.nombre = req.body.nombre;
    if (modificarPrecio) updateData.precio = req.body.precio;
    if (modificarDescripcion) updateData.descripcion = req.body.descripcion;
    if (req.file) updateData.imagen = `/uploads/${req.file.filename}`;

    // Si no hay cambios, redirige sin actualizar
    if (Object.keys(updateData).length === 0) {
      return res.redirect('/gerente/gestion-productos');
    }

    const ProductoModel = require('../models/producto');
    await ProductoModel.findByIdAndUpdate(id, updateData);

    res.redirect('/gerente/gestion-productos');
  } catch (error) {
    next(error);
  }
});

//Subir csv de los trabajadores
router.post('/subir-trabajadores', isAuthenticated, uploadCSV.single('archivoCSV'), async (req, res) => {
  try {
    // Si no hay archivo, muestra error
    if (!req.file) return res.status(400).render('gerente', { 
      errorCSV: 'No se subió ningún archivo',
      section: 'gestion-horarios',
      rol: 'gerente',
      sinHeader: false,
      trabajadores: [],
      tiendas: [],
      tiendaSeleccionada: null
    });

    const filePath = req.file.path;
    const trabajadores = [];

    // Lee el archivo CSV y guarda los trabajadores en un array
    fs.createReadStream(filePath)
      .pipe(csv({ separator: ',' }))
      .on('data', (row) => {
        if (row.nombre && row.apellidos) {
          trabajadores.push({
            nombre: row.nombre,
            apellidos: row.apellidos
          });
        }
      })
      .on('end', async () => {
        // Elimina todos los trabajadores existentes y añade los nuevos
        if (trabajadores.length) {
          try {
            await Trabajador.deleteMany({});
            await Trabajador.insertMany(trabajadores);
          } catch (err) {}
        }
        res.redirect('/gerente/gestion-horarios');
      })
      .on('error', (error) => {
        // Error al procesar el CSV
        res.status(500).render('gerente', { 
          errorCSV: 'Error procesando el archivo CSV',
          section: 'gestion-horarios',
          rol: 'gerente',
          sinHeader: false,
          trabajadores: [],
          tiendas: [],
          tiendaSeleccionada: null
        });
      });

  } catch (error) {
    // Error interno
    res.status(500).render('gerente', { 
      errorCSV: 'Error interno del servidor',
      section: 'gestion-horarios',
      rol: 'gerente',
      sinHeader: false,
      trabajadores: [],
      tiendas: [],
      tiendaSeleccionada: null
    });
  }
});

//Gestión de horarios
router.get('/gestion-horarios', isAuthenticated, async (req, res, next) => {
  try {
    // Obtiene la tienda asignada al gerente
    const usuario = await Usuario.findById(req.session.userId).populate('tiendaId');
    
    if (!usuario || !usuario.tiendaId) {
      return res.redirect('/gerente');
    }

    const tiendaAsignada = usuario.tiendaId;
    const trabajadores = await Trabajador.find();
    let planificaciones = [];
    let horario = null;
    let diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

    // Si hay búsqueda por semana, calcula la tabla de horarios
    if (req.query.semana) {
      const semanaSeleccionada = parseInt(req.query.semana, 10);

      // Busca las planificaciones para la tienda del gerente y esa semana
      planificaciones = await Planificacion.find({
        tienda: tiendaAsignada._id,
        semana: semanaSeleccionada
      }).populate('trabajador tienda');

      // Inicializa la estructura de horario (horas/días)
      horario = {};
      for (let h = 8; h < 17; h++) {
        horario[h] = {};
        diasSemana.forEach(dia => { horario[h][dia] = ''; });
      }

      // Rellena la tabla con los nombres de los trabajadores asignados
      planificaciones.forEach(p => {
        if (p.trabajador && p.tienda && p.dia && p.trabajador.nombre && p.trabajador.apellidos) {
          const dia = p.dia;
          const trabajadorNombre = p.trabajador.nombre + ' ' + p.trabajador.apellidos;
          const horaInicio = parseInt(p.horaEntrada.split(':')[0], 10);
          const horaFin = parseInt(p.horaSalida.split(':')[0], 10);
          for (let h = horaInicio; h < horaFin; h++) {
            if (horario[h] && horario[h][dia] !== undefined) {
              if (horario[h][dia] === '') {
                horario[h][dia] = trabajadorNombre;
              } else {
                horario[h][dia] += ', ' + trabajadorNombre;
              }
            }
          }
        }
      });
    }

    // Renderiza la vista con todos los datos necesarios
    res.render('gerente', {
      rol: 'gerente',
      section: 'gestion-horarios',
      sinHeader: false,
      tiendas: [tiendaAsignada],
      trabajadores,
      planificaciones,
      horario,
      diasSemana,
      tiendaObj: tiendaAsignada,
      tiendaSeleccionada: tiendaAsignada._id.toString(),
      semanaSeleccionada: req.query.semana || null,
      mesSeleccionado: req.query.mes || null,
      errorCSV: null,
      errorHorario: null
    });
  } catch (error) {
    next(error);
  }
});

//Agregar horario
router.post('/agregar-horario', isAuthenticated, async (req, res, next) => {
  try {
    // Obtiene la tienda asignada al gerente
    const usuario = await Usuario.findById(req.session.userId).populate('tiendaId');
    
    if (!usuario || !usuario.tiendaId) {
      const trabajadores = await Trabajador.find();
      return res.status(400).render('gerente', {
        rol: 'gerente',
        section: 'gestion-horarios',
        sinHeader: false,
        tiendas: [],
        trabajadores,
        planificaciones: [],
        horario: null,
        diasSemana: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
        tiendaObj: null,
        tiendaSeleccionada: null,
        semanaSeleccionada: null,
        mesSeleccionado: null,
        errorCSV: null,
        errorHorario: 'No tienes tienda asignada'
      });
    }

    const tiendaId = usuario.tiendaId._id;
    const { trabajador, dia, hora_inicio, hora_fin, semana, mes } = req.body;

    // Validación de campos obligatorios
    if (!trabajador || !dia || !hora_inicio || !hora_fin || !semana || !mes) {
      const trabajadores = await Trabajador.find();
      return res.status(400).render('gerente', {
        rol: 'gerente',
        section: 'gestion-horarios',
        sinHeader: false,
        tiendas: [usuario.tiendaId],
        trabajadores,
        planificaciones: [],
        horario: null,
        diasSemana: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
        tiendaObj: usuario.tiendaId,
        tiendaSeleccionada: tiendaId.toString(),
        semanaSeleccionada: null,
        mesSeleccionado: null,
        errorCSV: null,
        errorHorario: 'Todos los campos son requeridos'
      });
    }

    // Validación de horas
    const horaInicioNum = parseInt(hora_inicio.split(':')[0], 10);
    const horaFinNum = parseInt(hora_fin.split(':')[0], 10);

    if (horaInicioNum < 8 || horaFinNum > 17 || horaInicioNum >= horaFinNum) {
      const trabajadores = await Trabajador.find();
      return res.status(400).render('gerente', {
        rol: 'gerente',
        section: 'gestion-horarios',
        sinHeader: false,
        tiendas: [usuario.tiendaId],
        trabajadores,
        planificaciones: [],
        horario: null,
        diasSemana: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
        tiendaObj: usuario.tiendaId,
        tiendaSeleccionada: tiendaId.toString(),
        semanaSeleccionada: null,
        mesSeleccionado: null,
        errorCSV: null,
        errorHorario: 'La hora de inicio y fin debe estar entre 08:00 y 17:00 y la de inicio debe ser menor que la de fin.'
      });
    }

    // Crea la fecha de la planificación
    const year = new Date().getFullYear();
    const fecha = new Date(year, parseInt(mes, 10) - 1, 1);

    // Crea la planificación en la base de datos para la tienda del gerente
    await Planificacion.create({
      trabajador,
      tienda: tiendaId,
      fecha,
      horaEntrada: hora_inicio,
      horaSalida: hora_fin,
      semana: parseInt(semana, 10),
      dia
    });

    logger.info(`Horario añadido: trabajador ${trabajador}, tienda ${usuario.tiendaId.nombre}`);
    res.redirect('/gerente/gestion-horarios');
  } catch (error) {
    next(error);
  }
});

//Gestión de stock
router.get('/gestion-stock', isAuthenticated, async (req, res, next) => {
  try {
    // Obtiene la tienda asignada al gerente
    const usuario = await Usuario.findById(req.session.userId).populate('tiendaId');
    
    if (!usuario || !usuario.tiendaId) {
      return res.redirect('/gerente');
    }

    const tiendaAsignada = usuario.tiendaId;
    // Stock bajo solo para la tienda del gerente
    const stocksBajos = await Stock.find({ 
      cantidad: { $lt: 5 },
      tienda: tiendaAsignada._id
    }).populate('producto tienda');
    
    res.render('gerente', {
      tiendas: [tiendaAsignada],
      productos: [],
      stocksBajos,
      rol: 'gerente',
      section: 'gestion-stock',
      mensajeStock: req.query.mensajeStock || null,
      sinHeader: false
    });
  } catch (err) {
    next(err);
  }
});

//Sumar stock
router.post('/gestion-stock', isAuthenticated, async (req, res, next) => {
  try {
    // Obtiene la tienda asignada al gerente
    const usuario = await Usuario.findById(req.session.userId).populate('tiendaId');
    
    if (!usuario || !usuario.tiendaId) {
      return res.redirect('/gerente/gestion-stock?mensajeStock=No tienes tienda asignada');
    }

    const tiendaId = usuario.tiendaId._id;
    const { producto, cantidad } = req.body;
    
    if (!producto || !cantidad) {
      return res.redirect('/gerente/gestion-stock?mensajeStock=Faltan datos');
    }
    
    const cantidadNum = parseInt(cantidad, 10);

    // Busca el stock del producto en la tienda del gerente
    let stock = await Stock.findOne({ tienda: tiendaId, producto });
    if (!stock) {
      // Si no existe, crea con 20 de inicio y suma la cantidad indicada
      stock = new Stock({ tienda: tiendaId, producto, cantidad: 20 + cantidadNum });
      await stock.save();
    } else {
      // Si existe, suma la cantidad
      stock.cantidad += cantidadNum;
      await stock.save();
    }
    
    logger.info(`Stock actualizado: producto ${producto}, cantidad +${cantidadNum}, tienda ${usuario.tiendaId.nombre}`);
    res.redirect('/gerente/gestion-stock?mensajeStock=Stock actualizado');
  } catch (err) {
    next(err);
  }
});

module.exports = router;