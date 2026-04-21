const express = require('express');
const router = express.Router();
const Tienda = require('../models/tienda');
const Producto = require('../models/producto');
const Stock = require('../models/stock');
const config = require('../config');
const logger = require('../config/logger');
const stripe = require('stripe')(config.stripe.secretKey);

// Middleware de autenticación para cliente
function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId && req.session.rol === 'cliente') {
    return next();
  }
  res.redirect('/');
}

// Mostrar lista de tiendas
router.get('/', isAuthenticated, async (req, res, next) => {
  try {
    const tiendas = await Tienda.find();
    res.render('cliente', { tiendas, rol: 'cliente', gracias: req.query.gracias });
  } catch (error) {
    next(error);
  }
});

// Mostrar productos de una tienda específica
router.get('/tienda/:id', isAuthenticated, async (req, res, next) => {
  try {
    // Busca en la BD la tienda cuyo ID es el que viene en la URL y busca sus productos correspondientes y recupera el carrito del usuario de la sesión o lo inicializa como un array vacío si no existe
    const tienda = await Tienda.findById(req.params.id);
    const productos = await Producto.find({ tiendaId: req.params.id });
    const carrito = req.session.carrito || [];
    // Renderiza para pasarle estos atributos
    res.render('tienda', {
      tienda,
      productos,
      rol: 'cliente',
      carrito,
      sinHeader: true,
      errorStock: req.query.errorStock || null
    });
  } catch (error) {
    next(error);
  }
});

// Añadir producto al carrito con control de stock
router.post('/carrito/agregar', isAuthenticated, async (req, res) => {
  const { productoId, cantidad, tiendaId, reemplazar } = req.body;
  if (!req.session.carrito) req.session.carrito = [];
  // Pasa la cantidad a número y si pone un valor fuera de rango lo pone a 1
  const cantidadNum = Math.max(parseInt(cantidad, 10) || 1, 1);

  // Comprobación de stock
  const stock = await Stock.findOne({ tienda: tiendaId, producto: productoId });
  if (!stock || stock.cantidad < cantidadNum) {
    return res.json({
      success: false,
      error: `Stock insuficiente. Solo quedan ${stock ? stock.cantidad : 0} unidades.`
    });
  }
  // Busca si el producto ya estaba en el carrito y si es así lo actualiza
  const index = req.session.carrito.findIndex(item => item.productoId === productoId);
  if (index >= 0) {
    if (reemplazar) {
      req.session.carrito[index].cantidad = cantidadNum;
    } else {
      req.session.carrito[index].cantidad += cantidadNum;
    }
  } else {
    req.session.carrito.push({ productoId, cantidad: cantidadNum, tiendaId });
  }
  //Contestación al cliente con el carrito actualizado
  res.json({ success: true, carrito: req.session.carrito });
});

// Mostrar vista carrito
router.get('/carrito', isAuthenticated, async (req, res, next) => {
  try {
    const carrito = req.session.carrito || [];
    // Crea un arraid con los IDs de todos los productos que hay en el carrito
    const productosIds = carrito.map(item => item.productoId);
    // Busca en la colección de productos aquellos cuyo _id está en el carrito.
    const productos = await Producto.find({ _id: { $in: productosIds } });
    // Para cada producto encontrado busca la cantidad en el carrito y devuelve un objeto con su información y la cantidad que tiene y si no se encuentra la cantidad la pone a 1
    const productosConCantidad = productos.map(prod => {
      const itemCarrito = carrito.find(i => i.productoId === prod._id.toString());
      return {
        _id: prod._id,
        nombre: prod.nombre,
        precio: prod.precio,
        imagen: prod.imagen,
        cantidad: itemCarrito ? itemCarrito.cantidad : 1,
        tiendaId: prod.tiendaId
      };
    });
    // Renderiza la vista carrito.ejs pasandole el array de productos con su cantidad en el carrito y el rol que en este caso es cliente
    res.render('carrito', { productos: productosConCantidad, rol: 'cliente' });
  } catch (error) {
    next(error);
  }
});

// Eliminar producto del carrito
router.post('/carrito/eliminar', isAuthenticated, (req, res) => {
  // Extrae el productoId del cuerpo de la petición y inicializa como un array vacío si el carrito no existe en la sesión del usuario
  const { productoId } = req.body;
  if (!req.session.carrito) req.session.carrito = [];
  //Filtra el array del carrito y elimina cualquier elemento cuyo productoId coincida con el que se quiere eliminar.
  req.session.carrito = req.session.carrito.filter(item => item.productoId !== productoId);
  // Responde al cliente con un objeto JSON que indica que la operación fue exitosa
  res.json({ success: true, carrito: req.session.carrito });
});

// Stripe Checkout con control de stock antes de pagar
router.post('/pago', isAuthenticated, async (req, res, next) => {
  try {
    // Recupera el carrito del usuario desde la sesión y la dirección de envío del formulario de pago
    const carrito = req.session.carrito || [];
    const direccion = req.body.direccion || '';
    // Si el carrito está vacío, redirige al usuario a la página del carrito
    if (carrito.length === 0) {
      return res.redirect('/cliente/carrito');
    }

    logger.info(`Inicio de pago para usuario ${req.session.userId}, ${carrito.length} productos en carrito`);

    // Comprobar stock antes de crear sesión de pago
    for (const item of carrito) {
      const stock = await Stock.findOne({ tienda: item.tiendaId, producto: item.productoId });
      if (!stock || stock.cantidad < item.cantidad) {
        return res.redirect(`/cliente/tienda/${item.tiendaId}?errorStock=Stock insuficiente. Solo quedan ${stock ? stock.cantidad : 0} unidades.`);
      }
    }

    // Carga los productos para obtener nombre y precio
    const productosIds = carrito.map(item => item.productoId);
    const productos = await Producto.find({ _id: { $in: productosIds } });
    // Crea un objeto con la información que Stripe necesita
    const line_items = productos.map(prod => {
      const itemCarrito = carrito.find(i => i.productoId === prod._id.toString());
      return {
        price_data: {
          currency: 'eur',
          product_data: { name: prod.nombre },
          unit_amount: Math.round(prod.precio * 100),
        },
        quantity: itemCarrito ? itemCarrito.cantidad : 1,
      };
    });
    // Crea la sesión de pago
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${config.baseUrl}/cliente/pago-exitoso`,
      cancel_url: `${config.baseUrl}/cliente/carrito`,
      metadata: { 
        direccion,
        userId: req.session.userId
      }
    });
    //Redirige al usuario a la URL de Stripe para que complete el pago
    res.redirect(303, session.url);
  } catch (error) {
    logger.error('Error al crear sesión de Stripe:', { error: error.message, userId: req.session.userId });
    next(error);
  }
});

// Limpiar carrito y descontar stock tras el pago
router.get('/pago-exitoso', isAuthenticated, async (req, res) => {
  // Recupera el carrito del usuario desde la sesión
  const carrito = req.session.carrito || [];
  
  // Si el carrito está vacío, probablemente sea un acceso directo o recarga de página
  if (carrito.length === 0) {
    return res.redirect('/cliente');
  }
  
  logger.info(`Pago exitoso para usuario ${req.session.userId}, procesando ${carrito.length} productos`);
  
  //Para cada producto en el carrito busca el registro de stock correspondiente (por tienda y producto), si existe, resta la cantidad comprada al stock, usa Math.max(0, ...) para evitar que el stock baje de cero y guarda el nuevo valor de stock en la base de datos
  for (const item of carrito) {
    const stock = await Stock.findOne({ tienda: item.tiendaId, producto: item.productoId });
    if (stock) {
      stock.cantidad = Math.max(0, stock.cantidad - item.cantidad);
      await stock.save();
    }
  }
  // Una vez actualizado el stock, vacía el carrito de la sesión del usuario
  req.session.carrito = [];
  // Redirige al usuario a la pantalla principal de cliente y añade ?gracias=1 en la URL
  res.redirect('/cliente?gracias=1');
});

module.exports = router;