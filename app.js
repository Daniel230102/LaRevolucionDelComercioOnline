var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
var session = require('express-session');
var helmet = require('helmet');
var rateLimit = require('express-rate-limit');
var cors = require('cors');
const { MongoStore } = require('connect-mongo');

// Configuración centralizada
const config = require('./config');
const winstonLogger = require('./config/logger');

var app = express();

// ==========================================
// SEGURIDAD Y MIDDLEWARES
// ==========================================

// Helmet: Headers de seguridad (protección contra XSS, clickjacking, etc.)
app.use(helmet({
  contentSecurityPolicy: false, // Desactivado para compatibilidad con EJS
  crossOriginEmbedderPolicy: false
}));

// CORS: Control de acceso entre dominios
app.use(cors({
  origin: config.baseUrl,
  credentials: true
}));

// Rate Limiting: Prevenir fuerza bruta y abusos
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 peticiones por ventana
  message: 'Demasiadas peticiones, por favor inténtelo de nuevo más tarde',
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Rate limiting específico para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos de login
  message: 'Demasiados intentos de login, por favor inténtelo de nuevo más tarde'
});

// ==========================================
// CONFIGURACIÓN DE BASE DE DATOS
// ==========================================

// Conexión a la base de datos con configuración centralizada
mongoose.connect(config.mongodb.URI)
  .then(() => winstonLogger.info('Conexión a MongoDB establecida'))
  .catch(err => winstonLogger.error('Error de conexión a MongoDB:', { error: err.message }));

// ==========================================
// VIEW ENGINE Y MIDDLEWARES BÁSICOS
// ==========================================

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json({ limit: '10mb' })); // Limitar tamaño de JSON
app.use(express.urlencoded({ extended: false, limit: '10mb' })); // Limitar tamaño de URL encoded
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// CONFIGURACIÓN DE SESIONES
// ==========================================

// Sesiones almacenadas en MongoDB (escalable y persistente)
app.use(session({
  secret: config.session.secret,
  resave: config.session.resave,
  saveUninitialized: config.session.saveUninitialized,
  cookie: {
    secure: config.session.cookie.secure,
    httpOnly: config.session.cookie.httpOnly,
    maxAge: config.session.cookie.maxAge,
    sameSite: 'lax' // Prevenir CSRF
  },
  store: new MongoStore({
    mongoUrl: config.mongodb.URI,
    collectionName: 'sessions',
    ttl: config.session.cookie.maxAge / 1000 // TTL en segundos
  }),
  name: 'sessionId', // No exponer que es una sesión de Express
  rolling: true // Renovar cookie con cada petición
}));

// ==========================================
// MIDDLEWARE DE AUTENTICACIÓN
// ==========================================

// Middleware de autenticación y redirección
const authMiddleware = require('./middlewares/auth');
app.use(authMiddleware);

// ==========================================
// RUTAS
// ==========================================

var controlUsuarioRouter = require('./routes/controlUsuario');
var propietarioRouter = require('./routes/propietario');
var gerenteRouter = require('./routes/gerente');
var clienteRouter = require('./routes/cliente');

// Aplicar rate limiting a login
app.use('/', controlUsuarioRouter);
app.use('/propietario', propietarioRouter);
app.use('/gerente', gerenteRouter);
app.use('/cliente', clienteRouter);

// ==========================================
// MANEJO DE ERRORES
// ==========================================

// catch 404 and forward to error handler
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');
app.use(notFoundHandler);

// error handler
app.use(errorHandler);

module.exports = app;